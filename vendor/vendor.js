// --- GLOBAL VARIABLES ---
let currentUser = null;
let currentVendor = null;
let products = [];
let orders = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const token = localStorage.getItem('vendorToken');
    if (token) {
        validateToken(token);
    } else {
        showLogin();
    }
    
    // Event Listeners
    document.getElementById('productFormContent').addEventListener('submit', saveProduct);
    document.getElementById('vendorProfileForm').addEventListener('submit', updateVendorProfile);
    document.getElementById('registerForm').addEventListener('submit', registerVendor);
});

// --- AUTHENTICATION FUNCTIONS ---

async function validateToken(token) {
    try {
        const res = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            currentVendor = data.vendor;
            
            if (currentUser.role !== 'vendor') {
                throw new Error('Invalid role');
            }
            
            localStorage.setItem('vendorToken', token);
            showDashboard();
        } else {
            throw new Error('Token validation failed');
        }
    } catch (err) {
        localStorage.removeItem('vendorToken');
        showLogin();
    }
}

async function vendorLogin() {
    const email = document.getElementById('vendorUser').value;
    const password = document.getElementById('vendorPass').value;
    const messageEl = document.getElementById('authMessage');
    
    if (!email || !password) {
        messageEl.innerHTML = '<span class="text-red-500">সবগুলো ফিল্ড পূরণ করুন</span>';
        return;
    }
    
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok && data.user.role === 'vendor') {
            currentUser = data.user;
            currentVendor = data.vendor;
            localStorage.setItem('vendorToken', data.token);
            showDashboard();
        } else {
            messageEl.innerHTML = `<span class="text-red-500">${data.message || 'লগইন ব্যর্থ হয়েছে'}</span>`;
        }
    } catch (err) {
        messageEl.innerHTML = '<span class="text-red-500">সার্ভার এরর, আবার চেষ্টা করুন</span>';
    }
}

async function registerVendor(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const storeName = document.getElementById('regStoreName').value;
    
    if (!name || !email || !phone || !password || !storeName) {
        alert('সবগুলো ফিল্ড পূরণ করুন');
        return;
    }
    
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password, role: 'vendor' })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Update vendor store name
            const token = localStorage.getItem('vendorToken');
            if (token) {
                await updateVendorStoreName(storeName);
            }
            
            hideRegister();
            alert('ভেন্ডর রেজিস্ট্রেশন সফল হয়েছে! লগইন করুন।');
        } else {
            alert(data.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
        }
    } catch (err) {
        alert('সার্ভার এরর, আবার চেষ্টা করুন');
    }
}

async function updateVendorStoreName(storeName) {
    try {
        const token = localStorage.getItem('vendorToken');
        const res = await fetch('/api/vendor/profile', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ storeName })
        });
        
        if (res.ok) {
            currentVendor.storeName = storeName;
            loadDashboardData();
        }
    } catch (err) {
        console.error('Failed to update store name:', err);
    }
}

function logout() {
    localStorage.removeItem('vendorToken');
    currentUser = null;
    currentVendor = null;
    showLogin();
}

// --- UI FUNCTIONS ---

function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('hidden');
    document.querySelector('main').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('hidden');
    document.querySelector('main').classList.remove('hidden');
    loadDashboardData();
}

function showSection(section) {
    // Update active nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('bg-gray-800', 'border-[#e76f51]');
        link.classList.add('text-gray-300');
    });
    
    // Show appropriate section
    const sections = ['dashboardSection', 'productsSection', 'ordersSection', 'earningsSection', 'profileSection'];
    sections.forEach(sec => {
        document.getElementById(sec).classList.add('hidden');
    });
    
    if (section === 'dashboard') {
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('pageTitle').innerHTML = '<i class="fas fa-tachometer-alt text-gray-400 hidden sm:inline"></i> ড্যাশবোর্ড';
    } else if (section === 'products') {
        document.getElementById('productsSection').classList.remove('hidden');
        document.getElementById('pageTitle').innerHTML = '<i class="fas fa-box text-gray-400 hidden sm:inline"></i> পণ্যসমূহ';
        loadProducts();
    } else if (section === 'orders') {
        document.getElementById('ordersSection').classList.remove('hidden');
        document.getElementById('pageTitle').innerHTML = '<i class="fas fa-shopping-bag text-gray-400 hidden sm:inline"></i> অর্ডারসমূহ';
        loadVendorOrders();
    } else if (section === 'earnings') {
        document.getElementById('earningsSection').classList.remove('hidden');
        document.getElementById('pageTitle').innerHTML = '<i class="fas fa-wallet text-gray-400 hidden sm:inline"></i> আয় ও কমিশন';
        loadEarnings();
    } else if (section === 'profile') {
        document.getElementById('profileSection').classList.remove('hidden');
        document.getElementById('pageTitle').innerHTML = '<i class="fas fa-user text-gray-400 hidden sm:inline"></i> প্রোফাইল';
        loadProfile();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

// --- DATA LOADING FUNCTIONS ---

async function loadDashboardData() {
    try {
        // Load user info
        document.getElementById('userName').innerText = currentUser.name;
        document.getElementById('storeName').innerText = currentVendor ? currentVendor.storeName : 'লোড হচ্ছে...';
        document.getElementById('storeStatus').innerText = currentVendor && currentVendor.verified ? 'স্ট্যাটাস: ভেরিফাইড' : 'স্ট্যাটাস: অপেক্ষারত';
        
        // Load stats
        const productsRes = await fetch('/api/vendor/products', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vendorToken')}` }
        });
        const productsData = await productsRes.json();
        document.getElementById('statProducts').innerText = productsData.length;
        
        const ordersRes = await fetch('/api/vendor/orders', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vendorToken')}` }
        });
        const ordersData = await ordersRes.json();
        document.getElementById('statOrders').innerText = ordersData.length;
        
        const totalEarnings = ordersData.reduce((sum, order) => {
            const vendorOrder = order.vendorOrders.find(vo => vo.vendorId.toString() === currentVendor._id.toString());
            return sum + (vendorOrder ? vendorOrder.vendorEarnings : 0);
        }, 0);
        document.getElementById('statEarnings').innerText = `৳ ${totalEarnings}`;
        
        // Load recent orders
        loadRecentOrders(ordersData.slice(0, 5));
        
    } catch (err) {
        console.error('Failed to load dashboard data:', err);
    }
}

async function loadProducts() {
    try {
        const res = await fetch('/api/vendor/products', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vendorToken')}` }
        });
        products = await res.json();
        
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = products.map(p => `
            <div class="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group">
                <div class="relative overflow-hidden">
                    <img src="${p.image || '/images/.image'}" class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500" alt="${p.name}">
                    ${p.stock < 10 ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow">Low Stock</span>` : ''}
                </div>
                <div class="p-4">
                    <p class="text-xs text-gray-500 uppercase tracking-widest mb-1">${p.category}</p>
                    <h4 class="font-bold text-gray-800 text-lg mb-2 truncate" title="${p.name}">${p.name}</h4>
                    <div class="flex justify-between items-center mt-4">
                        <span class="text-[#e76f51] font-bold text-xl">৳ ${p.price}</span>
                        <div class="flex gap-2">
                            <button onclick="editProduct('${p._id}')" class="bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors text-sm">
                                <i class="fas fa-edit"></i> এডিট
                            </button>
                            <button onclick="deleteProduct('${p._id}')" class="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 transition-colors text-sm">
                                <i class="fas fa-trash"></i> ডিলিট
                            </button>
                        </div>
                    </div>
                    <div class="mt-2 text-sm text-gray-600">
                        স্টক: ${p.stock} টি
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('Failed to load products:', err);
    }
}

async function loadVendorOrders() {
    try {
        const res = await fetch('/api/vendor/orders', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vendorToken')}` }
        });
        orders = await res.json();
        
        const tbody = document.getElementById('vendorOrdersList');
        tbody.innerHTML = orders.map(o => {
            const vendorOrder = o.vendorOrders.find(vo => vo.vendorId.toString() === currentVendor._id.toString());
            let badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
            if (o.status === 'Processing') badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
            if (o.status === 'Delivered') badgeColor = 'bg-green-100 text-green-800 border-green-200';

            return `
            <tr class="border-b hover:bg-gray-50 transition-colors">
                <td class="p-3">
                    <div class="font-bold text-gray-800">${o.customerName}</div>
                    <div class="text-xs text-gray-500 mt-1"><i class="fas fa-phone-alt"></i> ${o.phone}</div>
                </td>
                <td class="p-3 max-w-[200px]">
                    <div class="text-xs text-gray-800 bg-orange-50 border border-orange-100 shadow-sm rounded px-2 py-1.5 whitespace-normal leading-tight">
                        ${vendorOrder ? vendorOrder.items.map(item => `${item.qty}x ${item.name}`).join(', ') : 'No items'}
                    </div>
                </td>
                <td class="p-3 font-bold text-gray-800">
                    ৳ ${vendorOrder ? vendorOrder.subtotal : 0}
                </td>
                <td class="p-3">
                    <span class="${badgeColor} px-2 py-1 rounded text-xs font-semibold shadow-sm border">${o.status}</span>
                </td>
                <td class="p-3">
                    <select onchange="updateOrderStatus('${o._id}', this.value)" class="border border-gray-300 rounded p-1 text-xs bg-white cursor-pointer hover:border-[#2d5a27] outline-none">
                        <option disabled selected>স্ট্যাটাস পরিবর্তন</option>
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Delivered">Delivered</option>
                    </select>
                </td>
            </tr>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Failed to load vendor orders:', err);
    }
}

function loadRecentOrders(recentOrders) {
    const tbody = document.getElementById('vendorOrdersTable');
    tbody.innerHTML = recentOrders.map(o => {
        const vendorOrder = o.vendorOrders.find(vo => vo.vendorId.toString() === currentVendor._id.toString());
        
        return `
        <tr class="border-b hover:bg-gray-50 transition-colors">
            <td class="p-3">
                <div class="font-bold text-gray-800">${o.customerName}</div>
                <div class="text-xs text-gray-500 mt-1"><i class="fas fa-phone-alt"></i> ${o.phone}</div>
            </td>
            <td class="p-3 max-w-[150px]">
                <div class="text-xs text-gray-800 bg-orange-50 border border-orange-100 shadow-sm rounded px-2 py-1.5 whitespace-normal leading-tight">
                    ${vendorOrder ? vendorOrder.items.map(item => `${item.qty}x ${item.name}`).join(', ') : 'No items'}
                </div>
            </td>
            <td class="p-3 font-bold text-gray-800">
                ৳ ${vendorOrder ? vendorOrder.subtotal : 0}
            </td>
            <td class="p-3">
                <span class="bg-yellow-100 text-yellow-800 border-yellow-200 px-2 py-1 rounded text-xs font-semibold shadow-sm border">${o.status}</span>
            </td>
            <td class="p-3">
                <button onclick="showSection('orders')" class="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors">
                    দেখুন
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

async function loadEarnings() {
    try {
        const res = await fetch('/api/vendor/orders', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vendorToken')}` }
        });
        const ordersData = await res.json();
        
        document.getElementById('commissionRate').innerText = `${currentVendor.commissionRate}%`;
        document.getElementById('totalEarnings').innerText = `৳ ${currentVendor.totalEarnings}`;
        
        const details = document.getElementById('earningsDetails');
        details.innerHTML = ordersData.map(o => {
            const vendorOrder = o.vendorOrders.find(vo => vo.vendorId.toString() === currentVendor._id.toString());
            if (!vendorOrder) return '';
            
            return `
            <div class="flex justify-between items-center p-3 border border-gray-200 rounded">
                <div>
                    <div class="font-semibold text-gray-800">অর্ডার #${o._id.substring(0, 8)}</div>
                    <div class="text-sm text-gray-600">${new Date(o.createdAt).toLocaleDateString('bn-BD')}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-green-600">৳ ${vendorOrder.vendorEarnings}</div>
                    <div class="text-xs text-gray-500">কমিশন: ৳ ${vendorOrder.commission}</div>
                </div>
            </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Failed to load earnings:', err);
    }
}

async function loadProfile() {
    document.getElementById('userNameInput').value = currentUser.name;
    document.getElementById('userEmailInput').value = currentUser.email;
    document.getElementById('userPhoneInput').value = currentUser.phone;
    document.getElementById('storeNameInput').value = currentVendor.storeName;
    document.getElementById('storeDescriptionInput').value = currentVendor.storeDescription || '';
    document.getElementById('bKashNumberInput').value = currentVendor.bKashNumber || '';
    document.getElementById('bankAccountInput').value = currentVendor.bankAccount || '';
    
    const statusEl = document.getElementById('verificationStatus');
    if (currentVendor.verified) {
        statusEl.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200';
        statusEl.innerText = 'ভেরিফাইড';
    } else {
        statusEl.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200';
        statusEl.innerText = 'অপেক্ষারত';
    }
}

// --- PRODUCT MANAGEMENT ---

function showAddProduct() {
    document.getElementById('productForm').classList.remove('hidden');
    document.getElementById('productFormTitle').innerText = 'নতুন পণ্য যোগ করুন';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productDescription').value = '';
}

function hideAddProduct() {
    document.getElementById('productForm').classList.add('hidden');
}

async function saveProduct(e) {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        image: document.getElementById('productImage').value,
        description: document.getElementById('productDescription').value
    };
    
    const productId = document.getElementById('productId').value;
    const token = localStorage.getItem('vendorToken');
    
    try {
        let res;
        if (productId) {
            res = await fetch(`/api/vendor/products/${productId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });
        } else {
            res = await fetch('/api/vendor/products', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });
        }
        
        if (res.ok) {
            hideAddProduct();
            loadProducts();
            alert(productId ? 'পণ্য আপডেট সফল হয়েছে!' : 'পণ্য যোগ সফল হয়েছে!');
        } else {
            alert('কাজটি সম্পন্ন করতে ব্যর্থ হয়েছে');
        }
    } catch (err) {
        alert('সার্ভার এরর, আবার চেষ্টা করুন');
    }
}

async function editProduct(id) {
    const product = products.find(p => p._id === id);
    if (!product) return;
    
    document.getElementById('productFormTitle').innerText = 'পণ্য এডিট করুন';
    document.getElementById('productId').value = product._id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImage').value = product.image;
    document.getElementById('productDescription').value = product.description;
    
    document.getElementById('productForm').classList.remove('hidden');
}

async function deleteProduct(id) {
    if (!confirm('আপনি কি নিশ্চিত যে এই পণ্যটি মুছে ফেলতে চান?')) {
        return;
    }
    
    try {
        const res = await fetch(`/api/vendor/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vendorToken')}` }
        });
        
        if (res.ok) {
            loadProducts();
            alert('পণ্য মুছে ফেলা হয়েছে!');
        } else {
            alert('পণ্য মুছতে ব্যর্থ হয়েছে');
        }
    } catch (err) {
        alert('সার্ভার এরর, আবার চেষ্টা করুন');
    }
}

// --- ORDER MANAGEMENT ---

async function updateOrderStatus(orderId, status) {
    try {
        const res = await fetch(`/api/vendor/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vendorToken')}`
            },
            body: JSON.stringify({ status })
        });
        
        if (res.ok) {
            alert(`অর্ডার স্ট্যাটাস আপডেট হয়েছে: ${status}`);
            loadVendorOrders();
            loadDashboardData();
        } else {
            alert('স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
        }
    } catch (err) {
        alert('সার্ভার এরর, আবার চেষ্টা করুন');
    }
}

// --- PROFILE MANAGEMENT ---

async function updateVendorProfile(e) {
    e.preventDefault();
    
    const vendorData = {
        storeName: document.getElementById('storeNameInput').value,
        storeDescription: document.getElementById('storeDescriptionInput').value,
        bKashNumber: document.getElementById('bKashNumberInput').value,
        bankAccount: document.getElementById('bankAccountInput').value
    };
    
    try {
        const res = await fetch('/api/vendor/profile', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('vendorToken')}`
            },
            body: JSON.stringify(vendorData)
        });
        
        if (res.ok) {
            currentVendor = await res.json();
            alert('প্রোফাইল আপডেট সফল হয়েছে!');
            loadDashboardData();
        } else {
            alert('প্রোফাইল আপডেট ব্যর্থ হয়েছে');
        }
    } catch (err) {
        alert('সার্ভার এরর, আবার চেষ্টা করুন');
    }
}

// --- MODAL FUNCTIONS ---

function showRegister() {
    document.getElementById('registerModal').classList.remove('hidden');
}

function hideRegister() {
    document.getElementById('registerModal').classList.add('hidden');
    document.getElementById('registerForm').reset();
}