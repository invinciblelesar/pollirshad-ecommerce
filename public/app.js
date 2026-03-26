const API_URL = '/api'; 

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products =[];

if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '') {
    loadProducts();
    updateCartUI();
    registerServiceWorker();
    checkAuth();
}

// ---- SHOP FRONTEND ----
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        products = await res.json();
        const grid = document.getElementById('productGrid');
        
        if(grid) {
            grid.innerHTML = products.map(p => `
                <div class="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group">
                    <div class="relative overflow-hidden">
                        <img src="${p.image}" class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500" alt="${p.name}">
                        ${p.stock < 10 ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow">Low Stock</span>` : ''}
                    </div>
                    <div class="p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-widest mb-1">${p.category}</p>
                        <h4 class="font-bold text-gray-800 text-lg mb-2 truncate" title="${p.name}">${p.name}</h4>
                        <div class="flex justify-between items-center mt-4">
                            <span class="text-[#e76f51] font-bold text-xl">৳ ${p.price}</span>
                            <button onclick="addToCart('${p._id}')" class="bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-[#2d5a27] transition-colors shadow-sm text-sm">
                                <i class="fas fa-cart-plus"></i> অ্যাড
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error("Error loading products", e); }
}

function addToCart(id) {
    const product = products.find(p => p._id === id);
    const existing = cart.find(i => i._id === id);
    if (existing) existing.qty++;
    else cart.push({ ...product, qty: 1 });
    
    if(typeof trackPixel === 'function') trackPixel('AddToCart');
    
    saveCart();
    updateCartUI();
    
    const cartPanel = document.getElementById('cartPanel');
    if(cartPanel && cartPanel.classList.contains('translate-x-full')) {
        toggleCart();
    }
}

function updateCartQty(idx, change) {
    cart[idx].qty += change;
    if (cart[idx].qty <= 0) {
        cart.splice(idx, 1);
    }
    saveCart();
    updateCartUI();
}

function updateCartUI() {
    const countEl = document.getElementById('cartCount');
    if(countEl) countEl.innerText = cart.reduce((sum, item) => sum + item.qty, 0);
    
    const itemsContainer = document.getElementById('cartItems');
    if(!itemsContainer) return;
    
    itemsContainer.innerHTML = cart.length ? cart.map((item, idx) => `
        <div class="flex gap-4 border-b py-3 items-center">
            <img src="${item.image}" class="w-16 h-16 rounded object-cover border">
            <div class="flex-1">
                <h5 class="text-sm font-bold text-gray-800 leading-tight mb-1" title="${item.name}">${item.name}</h5>
                <p class="text-[#e76f51] text-xs font-semibold mb-2">৳ ${item.price} / per</p>
                <div class="flex items-center gap-2">
                    <button onclick="updateCartQty(${idx}, -1)" class="w-7 h-7 flex items-center justify-center rounded bg-gray-200 text-gray-700 hover:bg-red-200 transition">
                        <i class="fas fa-minus text-xs"></i>
                    </button>
                    <span class="text-sm font-bold w-5 text-center">${item.qty}</span>
                    <button onclick="updateCartQty(${idx}, 1)" class="w-7 h-7 flex items-center justify-center rounded bg-gray-200 text-gray-700 hover:bg-green-200 transition">
                        <i class="fas fa-plus text-xs"></i>
                    </button>
                </div>
            </div>
            <div class="flex flex-col items-end gap-3">
                <button onclick="removeCart(${idx})" class="text-red-500 hover:text-red-700 text-sm p-2 bg-red-50 rounded"><i class="fas fa-trash"></i></button>
                <span class="font-bold text-gray-800 text-sm">৳ ${item.price * item.qty}</span>
            </div>
        </div>
    `).join('') : '<div class="text-center text-gray-400 mt-10"><i class="fas fa-shopping-basket text-4xl mb-3"></i><p>আপনার কার্ট খালি।</p></div>';
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalEl = document.getElementById('cartTotal');
    if(totalEl) totalEl.innerText = `৳ ${total}`;
}

function removeCart(idx) { cart.splice(idx, 1); saveCart(); updateCartUI(); }
function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }
function toggleCart() { document.getElementById('cartPanel').classList.toggle('translate-x-full'); }

function openCheckout() {
    if(cart.length === 0) return alert('আপনার কার্ট খালি!');
    document.getElementById('checkoutModal').classList.remove('hidden');
    toggleCart(); 
}
function closeCheckout() { document.getElementById('checkoutModal').classList.add('hidden'); }

function togglePayment() {
    const val = document.getElementById('paymentMethod').value;
    const details = document.getElementById('paymentDetails');
    if(val !== 'Cash on Delivery') {
        details.classList.remove('hidden');
    } else {
        details.classList.add('hidden');
    }
}

async function placeOrder() {
    const data = {
        customerName: document.getElementById('cName').value.trim(),
        phone: document.getElementById('cPhone').value.trim(),
        address: document.getElementById('cAddress').value.trim(),
        paymentMethod: document.getElementById('paymentMethod').value,
        senderPhone: document.getElementById('senderPhone') ? document.getElementById('senderPhone').value.trim() : '',
        trxId: document.getElementById('trxId') ? document.getElementById('trxId').value.trim() : '',
        items: cart.map(item => ({
            vendorId: item.vendorId,
            vendorName: item.vendorName,
            name: item.name,
            price: item.price,
            qty: item.qty,
            category: item.category
        })),
        total: cart.reduce((s, i) => s + (i.price * i.qty), 0)
    };
    
    if(!data.customerName || !data.phone || !data.address) {
        return alert("দয়া করে নাম ও ঠিকানা পূরণ করুন।");
    }
    if (data.paymentMethod !== 'Cash on Delivery' && (!data.senderPhone || !data.trxId)) {
        return alert("পেমেন্ট নম্বর এবং TrxID দিন।");
    }

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if(typeof trackPixel === 'function') trackPixel('Purchase');
        generatePDFInvoice(data, result.orderId);
        
        alert("অর্ডার সফলভাবে প্লেস হয়েছে! অর্ডার আইডি: " + result.orderId);
        
        let paymentTxt = `💳 পেমেন্ট: ${data.paymentMethod}\n`;
        if(data.paymentMethod !== 'Cash on Delivery') {
            paymentTxt += `📱 প্রেরক নম্বর: ${data.senderPhone}\n🆔 TrxID: ${data.trxId}\n`;
        }
        
        let waMsg = `*নতুন অর্ডার - পল্লীর স্বাদ*\n━━━━━━━━━━━━━━\n👤 নাম: ${data.customerName}\n📞 ফোন: ${data.phone}\n📍 ঠিকানা: ${data.address}\n${paymentTxt}\n*অর্ডার লিস্ট:*\n`;
        cart.forEach((item, i) => {
            waMsg += `${i+1}. ${item.name} - ${item.qty} টি (${item.price * item.qty} ৳)\n`;
        });
        waMsg += `\n*সর্বমোট মূল্য:* ${data.total} টাকা`;
        
        cart =[]; saveCart(); updateCartUI(); closeCheckout();
        window.open(`https://wa.me/8801580567606?text=${encodeURIComponent(waMsg)}`, '_blank');
        
    } catch (e) { 
        alert("অর্ডার প্লেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।"); 
        console.error(e);
    }
}

function generatePDFInvoice(data, orderId) {
    if(!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("POLLIRSHAD - INVOICE", 10, 20);
    doc.setFontSize(12);
    doc.text(`Order ID: ${orderId}`, 10, 30);
    doc.text(`Name: ${data.customerName}`, 10, 40);
    doc.text(`Phone: ${data.phone}`, 10, 50);
    doc.text(`Total: ${data.total} BDT`, 10, 60);
    doc.save(`Pollirshad_Invoice_${orderId}.pdf`);
}

function toggleChat() {
    const chat = document.getElementById('chatBox');
    if(chat) chat.classList.toggle('hidden');
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if(!msg) return;
    
    const box = document.getElementById('chatMessages');
    box.innerHTML += `<div class="mb-2 text-right text-blue-700"><strong>আপনি:</strong> ${msg}</div>`;
    input.value = '';
    
    setTimeout(() => {
        let reply = "আমাদের সাপোর্ট টিম শিগ্রই যোগাযোগ করবে।";
        if(msg.includes('ডেলিভারি')) reply = "ঢাকার ভিতরে ২-৩ দিন এবং ঢাকার বাহিরে ৩-৫ দিনের মাঝে ডেলিভারি পাবেন।";
        else if(msg.includes('বিকাশ') || msg.includes('পেমেন্ট')) reply = "আমাদের বিকাশ/নগদ পার্সোনাল নাম্বারঃ 01580567606";
        
        box.innerHTML += `<div class="mb-2 text-green-800 bg-green-100 p-2 rounded"><strong>বট:</strong> ${reply}</div>`;
        box.scrollTop = box.scrollHeight;
    }, 1000);
}

// ============================================
// ---- ADMIN DASHBOARD LOGIC ----
// ============================================

// Admin Login Function (already defined in admin.html)
// This is kept for backward compatibility
async function adminLogin() {
    const u = document.getElementById('adminUser').value;
    const p = document.getElementById('adminPass').value;
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        
        if(data.token && data.role === 'admin') {
            localStorage.setItem('adminToken', data.token);
            document.getElementById('loginScreen').classList.add('hidden');
            loadAdminData();
        } else { 
            alert("ভুল ইউজারনেম বা পাসওয়ার্ড!"); 
        }
    } catch(err) {
        alert("সার্ভার এরর।");
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.reload();
}

// ---- VENDOR MANAGEMENT FUNCTIONS ----

function showVendors() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="text-2xl font-bold text-gray-800">ভেন্ডর ম্যানেজমেন্ট</h3>
                <button onclick="loadAdminData()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors">
                    অর্ডারসমূহ
                </button>
            </div>
            
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 text-xs uppercase text-gray-500 border-y">
                            <th class="p-3 font-semibold">ভেন্ডর</th>
                            <th class="p-3 font-semibold">স্টোর</th>
                            <th class="p-3 font-semibold">যোগাযোগ</th>
                            <th class="p-3 font-semibold">ভেরিফিকেশন</th>
                            <th class="p-3 font-semibold">কমিশন</th>
                            <th class="p-3 font-semibold">আয়</th>
                            <th class="p-3 font-semibold">অ্যাকশন</th>
                        </tr>
                    </thead>
                    <tbody id="vendorsTableBody" class="text-sm"></tbody>
                </table>
            </div>
        </div>
    `;
    
    loadVendors();
}

async function loadVendors() {
    try {
        const res = await fetch('/api/admin/vendors', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const vendors = await res.json();
        
        const tbody = document.getElementById('vendorsTableBody');
        tbody.innerHTML = vendors.map(v => `
            <tr class="border-b hover:bg-gray-50 transition-colors">
                <td class="p-3">
                    <div class="font-bold text-gray-800">${v.userId.name}</div>
                    <div class="text-xs text-gray-500 mt-1"><i class="fas fa-envelope"></i> ${v.userId.email}</div>
                </td>
                <td class="p-3">
                    <div class="font-semibold text-[#e76f51]">${v.storeName}</div>
                    <div class="text-xs text-gray-600">${v.storeDescription || 'No description'}</div>
                </td>
                <td class="p-3 text-xs">
                    <div><i class="fas fa-phone-alt text-gray-500 mr-1"></i> ${v.userId.phone}</div>
                    <div><i class="fas fa-mobile-alt text-gray-500 mr-1"></i> ${v.bKashNumber || 'N/A'}</div>
                </td>
                <td class="p-3">
                    ${v.verified ? 
                        '<span class="bg-green-100 text-green-800 border border-green-200 px-2 py-1 rounded text-xs font-semibold">ভেরিফাইড</span>' : 
                        '<span class="bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-1 rounded text-xs font-semibold">অপেক্ষারত</span>'
                    }
                </td>
                <td class="p-3">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-orange-600">${v.commissionRate}%</span>
                        <input type="number" id="commission-${v._id}" value="${v.commissionRate}" class="w-16 p-1 border border-gray-300 rounded text-xs" min="0" max="50">
                        <button onclick="updateCommission('${v._id}')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors">আপডেট</button>
                    </div>
                </td>
                <td class="p-3 font-bold text-green-600">৳ ${v.totalEarnings}</td>
                <td class="p-3">
                    ${!v.verified ? 
                        `<button onclick="approveVendor('${v._id}')" class="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors">অনুমোদন</button>` : 
                        `<span class="text-green-600 text-xs">অনুমোদিত</span>`
                    }
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Failed to load vendors:", err);
        alert("ভেন্ডর লোড করতে সমস্যা হয়েছে।");
    }
}

async function approveVendor(vendorId) {
    try {
        const res = await fetch(`/api/admin/vendors/${vendorId}/approve`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert('ভেন্ডর অনুমোদন করা হয়েছে!');
            loadVendors();
        } else {
            alert(data.message || 'ভেন্ডর অনুমোদন ব্যর্থ হয়েছে');
        }
    } catch (err) {
        alert("সার্ভার এরর, আবার চেষ্টা করুন");
    }
}

async function updateCommission(vendorId) {
    const input = document.getElementById(`commission-${vendorId}`);
    const commissionRate = parseInt(input.value);
    
    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 50) {
        alert('কমিশন রেট ০-৫০% এর মধ্যে হতে হবে');
        return;
    }
    
    try {
        const res = await fetch(`/api/admin/vendors/${vendorId}/commission`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ commissionRate })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert('কমিশন রেট আপডেট করা হয়েছে!');
            loadVendors();
        } else {
            alert(data.message || 'কমিশন রেট আপডেট ব্যর্থ হয়েছে');
        }
    } catch (err) {
        alert("সার্ভার এরর, আবার চেষ্টা করুন");
    }
}

// ---- NEW: DELETE ALL ORDERS RESET BUTTON ----
async function clearAllOrders() {
    if(!confirm("আপনি কি নিশ্চিত যে আপনি সমস্ত ডেমো অর্ডার মুছে ফেলতে চান? এটি আর ফিরে পাওয়া যাবে না।")) return;
    
    try {
        await fetch(`${API_URL}/orders`, { method: 'DELETE' });
        alert("✅ সব অর্ডার সফলভাবে মুছে ফেলা হয়েছে!");
        loadAdminData(); // Refresh the table
    } catch(err) {
        alert("অর্ডার মুছতে সমস্যা হয়েছে।");
    }
}

async function loadAdminData() {
    try {
        const res = await fetch(`${API_URL}/analytics`);
        const stats = await res.json();
        
        document.getElementById('statRev').innerText = `৳ ${stats.totalRevenue}`;
        document.getElementById('statOrders').innerText = stats.totalOrders;
        document.getElementById('statPending').innerText = stats.pendingCount;

        const ordRes = await fetch(`${API_URL}/orders`);
        const orders = await ordRes.json();
        const tbody = document.getElementById('ordersTableBody');
        
        if(tbody) {
            tbody.innerHTML = orders.map(o => {
                let badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                if(o.status === 'Processing') badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                if(o.status === 'Delivered') badgeColor = 'bg-green-100 text-green-800 border-green-200';

                let paymentInfo = '';
                if(o.paymentMethod === 'Cash on Delivery') {
                    paymentInfo = `<span class="text-[#e76f51] font-bold px-2 py-1 bg-orange-50 rounded border border-orange-200 text-xs">COD</span>`;
                } else {
                    paymentInfo = `
                        <div class="text-xs leading-tight bg-gray-50 p-2 rounded border">
                            <strong class="text-gray-800">${o.paymentMethod}</strong><br>
                            <span class="text-gray-500">No:</span> ${o.senderPhone || 'N/A'}<br>
                            <span class="text-gray-500">TrxID:</span> <span class="font-mono">${o.trxId || 'N/A'}</span>
                        </div>`;
                }

                // ---- FORMAT ORDERED ITEMS (SERIAL 1, 2, 3...) ----
                let itemsHtml = (o.items ||[]).map((i, index) => `
                    <div class="text-xs text-gray-800 bg-orange-50 border border-orange-100 shadow-sm rounded px-2 py-1.5 mb-1.5 whitespace-normal leading-tight">
                        <span class="font-bold text-gray-500 mr-1">${index + 1}.</span> 
                        <span class="font-bold text-[#e76f51] mr-1">${i.qty}x</span> 
                        ${i.name}
                    </div>
                `).join('');

                return `
                <tr class="border-b hover:bg-gray-50 transition-colors">
                    <td class="p-3">
                        <div class="font-bold text-gray-800">${o.customerName}</div>
                        <div class="text-xs text-gray-500 mt-1"><i class="fas fa-phone-alt"></i> ${o.phone}</div>
                    </td>
                    <td class="p-3 text-xs text-gray-600 max-w-[150px] whitespace-normal">
                        ${o.address}
                    </td>
                    <td class="p-3">
                        ${paymentInfo}
                    </td>
                    <!-- RENDER ITEMS HERE WITH SCROLLBAR -->
                    <td class="p-3 min-w-[220px] max-w-[280px]">
                        <div class="max-h-24 overflow-y-auto pr-1 custom-scroll">
                            ${itemsHtml || '<span class="text-gray-400 text-xs">No items</span>'}
                        </div>
                    </td>
                    <td class="p-3 font-bold text-gray-800 text-base">
                        ৳ ${o.total}
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
        }

        const chartCanvas = document.getElementById('salesChart');
        if(chartCanvas && !window.mySalesChart) {
            const ctx = chartCanvas.getContext('2d');
            window.mySalesChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels:['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    datasets:[{ 
                        label: 'Daily Sales (Mock BDT)', 
                        data:[1200, 1900, 3000, 500, 2000, 3000, 4500], 
                        backgroundColor: 'rgba(45, 90, 39, 0.8)', 
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    } catch(err) {
        console.error("Failed to load admin data", err);
    }
}

async function updateOrderStatus(id, status) {
    try {
        await fetch(`${API_URL}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        alert(`অর্ডার স্ট্যাটাস আপডেট হয়েছে: ${status}`);
        loadAdminData(); 
    } catch(err) {
        alert("স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।");
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(() => console.log('✅ PWA SW Registered'));
    }
}

// ---- AUTHENTICATION FUNCTIONS ----

function checkAuth() {
    const token = localStorage.getItem('customerToken');
    if (token) {
        // User is logged in
        updateAuthUI(true);
    } else {
        // User is not logged in
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    const authButtons = document.querySelector('.flex.gap-4.sm\\:gap-6.items-center');
    if (!authButtons) return;
    
    if (isLoggedIn) {
        authButtons.innerHTML = `
            <a href="#" onclick="logoutCustomer()" class="hover:text-orange-200 text-sm font-semibold flex items-center gap-1 transition-colors pl-2 sm:border-l border-green-800">
                <i class="fas fa-user-circle"></i> <span class="hidden sm:inline">লগআউট</span>
            </a>
            <button onclick="toggleCart()" class="relative flex items-center gap-1 hover:text-orange-200 transition-colors">
                <i class="fas fa-shopping-cart text-xl"></i>
                <span id="cartCount" class="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm border border-orange-600">0</span>
            </button>
        `;
    } else {
        authButtons.innerHTML = `
            <a href="#" onclick="showLoginModal()" class="hover:text-orange-200 text-sm font-semibold flex items-center gap-1 transition-colors pl-2 sm:border-l border-green-800">
                <i class="fas fa-user"></i> <span class="hidden sm:inline">লগইন/রেজিস্টার</span>
            </a>
            <button onclick="toggleCart()" class="relative flex items-center gap-1 hover:text-orange-200 transition-colors">
                <i class="fas fa-shopping-cart text-xl"></i>
                <span id="cartCount" class="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm border border-orange-600">0</span>
            </button>
        `;
    }
}

function showLoginModal() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div id="authModal" class="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <div class="bg-white p-6 rounded-xl w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold text-gray-800">গ্রাহক লগইন/রেজিস্টার</h2>
                    <button onclick="hideAuthModal()" class="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
                </div>
                
                <div class="space-y-4">
                    <button onclick="showCustomerLogin()" class="w-full bg-[#2d5a27] text-white py-3 rounded-md hover:bg-green-800 transition-colors">
                        লগইন
                    </button>
                    <button onclick="showCustomerRegister()" class="w-full bg-gray-200 text-gray-800 py-3 rounded-md hover:bg-gray-300 transition-colors">
                        রেজিস্টার
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.remove();
}

function showCustomerLogin() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-xl w-full max-w-lg">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">গ্রাহক লগইন</h2>
                <button onclick="hideAuthModal()" class="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
            </div>
            
            <form id="customerLoginForm">
                <div class="mb-4">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">ইমেইল বা ফোন</label>
                    <input type="text" id="customerUser" placeholder="আপনার ইমেইল বা ফোন নম্বর" class="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#2d5a27] focus:ring-1 focus:ring-[#2d5a27] bg-gray-50">
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">পাসওয়ার্ড</label>
                    <input type="password" id="customerPass" placeholder="আপনার পাসওয়ার্ড" class="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#2d5a27] focus:ring-1 focus:ring-[#2d5a27] bg-gray-50">
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 bg-[#2d5a27] text-white py-3 rounded font-bold hover:bg-green-800 transition duration-200 shadow-md">
                        লগইন করুন
                    </button>
                    <button type="button" onclick="showCustomerRegister()" class="flex-1 bg-gray-200 text-gray-800 py-3 rounded font-bold hover:bg-gray-300 transition duration-200 shadow-md">
                        রেজিস্টার
                    </button>
                </div>
                
                <div id="customerAuthMessage" class="mt-4 text-center text-sm"></div>
            </form>
        </div>
    `;
    
    document.getElementById('customerLoginForm').addEventListener('submit', customerLogin);
}

function showCustomerRegister() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-xl w-full max-w-lg">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">গ্রাহক রেজিস্ট্রেশন</h2>
                <button onclick="hideAuthModal()" class="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
            </div>
            
            <form id="customerRegisterForm">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">নাম</label>
                        <input type="text" id="regName" required class="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#2d5a27]">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">ইমেইল</label>
                        <input type="email" id="regEmail" required class="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#2d5a27]">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">ফোন</label>
                        <input type="tel" id="regPhone" required class="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#2d5a27]">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">পাসওয়ার্ড</label>
                        <input type="password" id="regPassword" required class="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#2d5a27]">
                    </div>
                </div>
                
                <div class="flex gap-3 mt-6">
                    <button type="submit" class="flex-1 bg-[#2d5a27] text-white py-3 rounded-md hover:bg-green-800 transition-colors">রেজিস্টার</button>
                    <button type="button" onclick="showCustomerLogin()" class="flex-1 bg-gray-200 text-gray-800 py-3 rounded-md hover:bg-gray-300 transition-colors">লগইন</button>
                </div>
                
                <div id="customerRegMessage" class="mt-4 text-center text-sm"></div>
            </form>
        </div>
    `;
    
    document.getElementById('customerRegisterForm').addEventListener('submit', customerRegister);
}

async function customerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('customerUser').value;
    const password = document.getElementById('customerPass').value;
    const messageEl = document.getElementById('customerAuthMessage');
    
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
        
        if (res.ok && data.user.role === 'customer') {
            localStorage.setItem('customerToken', data.token);
            hideAuthModal();
            updateAuthUI(true);
            alert('স্বাগতম ' + data.user.name + '!');
        } else {
            messageEl.innerHTML = `<span class="text-red-500">${data.message || 'লগইন ব্যর্থ হয়েছে'}</span>`;
        }
    } catch (err) {
        messageEl.innerHTML = '<span class="text-red-500">সার্ভার এরর, আবার চেষ্টা করুন</span>';
    }
}

async function customerRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const messageEl = document.getElementById('customerRegMessage');
    
    if (!name || !email || !phone || !password) {
        messageEl.innerHTML = '<span class="text-red-500">সবগুলো ফিল্ড পূরণ করুন</span>';
        return;
    }
    
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password, role: 'customer' })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            messageEl.innerHTML = '<span class="text-green-500">রেজিস্ট্রেশন সফল হয়েছে! এখন লগইন করুন।</span>';
            setTimeout(() => {
                showCustomerLogin();
            }, 2000);
        } else {
            messageEl.innerHTML = `<span class="text-red-500">${data.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে'}</span>`;
        }
    } catch (err) {
        messageEl.innerHTML = '<span class="text-red-500">সার্ভার এরর, আবার চেষ্টা করুন</span>';
    }
}

function logoutCustomer() {
    if (confirm('আপনি কি নিশ্চিত যে আপনি লগআউট করতে চান?')) {
        localStorage.removeItem('customerToken');
        updateAuthUI(false);
        alert('সফলভাবে লগআউট হয়েছে!');
    }
}
