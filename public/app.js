const API_URL = '/api'; 

// ---- STATE ----
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products =[];

// ---- INITIALIZATION ----
if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '') {
    loadProducts();
    updateCartUI();
    registerServiceWorker();
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

// Function to handle + and - buttons in Cart
function updateCartQty(idx, change) {
    cart[idx].qty += change;
    if (cart[idx].qty <= 0) {
        cart.splice(idx, 1); // Remove item if qty is 0 or less
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
                
                <!-- Plus/Minus Buttons Added Here -->
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

// ---- CHECKOUT ----
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
        items: cart,
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

// ---- AI CHATBOT ----
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
            alert("ভুল ইউজারনেম বা পাসওয়ার্ড!"); 
        }
    } catch(err) {
        alert("সার্ভার এরর।");
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.reload();
}

async function loadAdminData() {
    try {
        // Fetch Analytics Stats
        const res = await fetch(`${API_URL}/analytics`);
        const stats = await res.json();
        
        document.getElementById('statRev').innerText = `৳ ${stats.totalRevenue}`;
        document.getElementById('statOrders').innerText = stats.totalOrders;
        document.getElementById('statPending').innerText = stats.pendingCount;

        // Fetch Orders for Table
        const ordRes = await fetch(`${API_URL}/orders`);
        const orders = await ordRes.json();
        const tbody = document.getElementById('ordersTableBody');
        
        if(tbody) {
            tbody.innerHTML = orders.map(o => {
                // Determine Badge Colors
                let badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Pending
                if(o.status === 'Processing') badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                if(o.status === 'Delivered') badgeColor = 'bg-green-100 text-green-800 border-green-200';

                // Format Payment Info
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

                // Format Ordered Items for the New Column
                let itemsHtml = (o.items ||[]).map(i => `
                    <div class="text-xs text-gray-700 bg-white border border-gray-200 shadow-sm rounded px-2 py-1 mb-1 whitespace-normal">
                        <span class="font-bold text-[#e76f51]">${i.qty}x</span> ${i.name}
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
                    <!-- RENDER ITEMS HERE -->
                    <td class="p-3 min-w-[200px] max-w-[250px]">
                        <div class="max-h-24 overflow-y-auto pr-1 custom-scroll">
                            ${itemsHtml || '<span class="text-gray-400 text-xs">No items found</span>'}
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

        // Setup Admin Chart
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
                        backgroundColor: 'rgba(45, 90, 39, 0.8)', // Dark Green matching #2d5a27
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
        loadAdminData(); // Refresh table immediately
    } catch(err) {
        alert("স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।");
    }
}

// ---- PWA SETUP ----
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('✅ PWA Service Worker Registered'))
            .catch(err => console.log('❌ SW Registration failed:', err));
    }
}
