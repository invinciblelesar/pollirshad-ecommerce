const API_URL = '/api';

// ---- STATE ----
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products =[];

// ---- INITIALIZATION ----
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
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
        grid.innerHTML = products.map(p => `
            <div class="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group">
                <div class="relative overflow-hidden">
                    <img src="${p.image}" class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500">
                    ${p.stock < 10 ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Low Stock</span>` : ''}
                </div>
                <div class="p-4">
                    <p class="text-xs text-gray-500 uppercase tracking-widest mb-1">${p.category}</p>
                    <h4 class="font-bold text-gray-800 text-lg mb-2 truncate">${p.name}</h4>
                    <div class="flex justify-between items-center mt-4">
                        <span class="text-orange-600 font-bold text-xl">৳ ${p.price}</span>
                        <button onclick="addToCart('${p._id}')" class="bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-orange-600 transition-colors">
                            <i class="fas fa-cart-plus"></i> Add
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error("Error loading products", e); }
}

function addToCart(id) {
    const product = products.find(p => p._id === id);
    const existing = cart.find(i => i._id === id);
    if (existing) existing.qty++;
    else cart.push({ ...product, qty: 1 });
    
    // Meta Pixel Mock
    if(typeof trackPixel === 'function') trackPixel('AddToCart');
    
    saveCart();
    updateCartUI();
    toggleCart(); // Open cart slider
}

function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
    const itemsContainer = document.getElementById('cartItems');
    if(!itemsContainer) return;
    
    itemsContainer.innerHTML = cart.length ? cart.map((item, idx) => `
        <div class="flex gap-4 border-b py-3 items-center">
            <img src="${item.image}" class="w-16 h-16 rounded object-cover">
            <div class="flex-1">
                <h5 class="text-sm font-bold text-gray-800">${item.name}</h5>
                <p class="text-orange-600 text-sm">৳ ${item.price} x ${item.qty}</p>
            </div>
            <button onclick="removeCart(${idx})" class="text-red-500 text-sm"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') : '<p class="text-center text-gray-500 mt-10">Cart is empty.</p>';
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('cartTotal').innerText = `৳ ${total}`;
}

function removeCart(idx) { cart.splice(idx, 1); saveCart(); updateCartUI(); }
function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }
function toggleCart() { document.getElementById('cartPanel').classList.toggle('translate-x-full'); }

// ---- CHECKOUT & PDF INVOICE ----
function openCheckout() {
    if(cart.length === 0) return alert('Cart is empty!');
    document.getElementById('checkoutModal').classList.remove('hidden');
    toggleCart(); // Close slider
}
function closeCheckout() { document.getElementById('checkoutModal').classList.add('hidden'); }
function togglePayment() {
    const val = document.getElementById('paymentMethod').value;
    document.getElementById('paymentDetails').style.display = (val !== 'COD') ? 'block' : 'none';
}

async function placeOrder() {
    const data = {
        customerName: document.getElementById('cName').value,
        phone: document.getElementById('cPhone').value,
        address: document.getElementById('cAddress').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        trxId: document.getElementById('trxId').value || '',
        items: cart,
        total: cart.reduce((s, i) => s + (i.price * i.qty), 0)
    };
    
    if(!data.customerName || !data.phone) return alert("Name and Phone required");

    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if(typeof trackPixel === 'function') trackPixel('Purchase');
        
        // Generate PDF Invoice
        generatePDFInvoice(data, result.orderId);
        
        alert("Order placed successfully! Order ID: " + result.orderId);
        cart =[]; saveCart(); updateCartUI(); closeCheckout();
        
        // WhatsApp Notification Redirection Link Mock
        const waMsg = `Hello! I placed order ${result.orderId}. Total: ৳${data.total}`;
        window.open(`https://wa.me/8801580567606?text=${encodeURIComponent(waMsg)}`, '_blank');
        
    } catch (e) { alert("Error placing order"); }
}

function generatePDFInvoice(data, orderId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("POLLIRSHAD - INVOICE", 10, 20);
    doc.setFontSize(12);
    doc.text(`Order ID: ${orderId}`, 10, 30);
    doc.text(`Customer: ${data.customerName}`, 10, 40);
    doc.text(`Total: ${data.total} BDT`, 10, 50);
    doc.save(`Invoice_${orderId}.pdf`);
}

// ---- AI CHATBOT (Rule-Based Mock) ----
function toggleChat() {
    const chat = document.getElementById('chatBox');
    chat.classList.toggle('hidden');
}
function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if(!msg) return;
    
    const box = document.getElementById('chatMessages');
    box.innerHTML += `<div class="mb-2 text-right text-blue-600"><strong>You:</strong> ${msg}</div>`;
    input.value = '';
    
    // AI Mock Logic
    setTimeout(() => {
        let reply = "Our team will contact you soon.";
        if(msg.toLowerCase().includes('delivery')) reply = "Standard delivery takes 2-3 days inside Dhaka, 3-5 days outside via Pathao.";
        if(msg.toLowerCase().includes('bhkash') || msg.toLowerCase().includes('payment')) reply = "You can pay via bKash to 017XXXXXX (Personal).";
        if(msg.toLowerCase().includes('order')) reply = "Please provide your phone number to track your order.";
        
        box.innerHTML += `<div class="mb-2 text-orange-600"><strong>Bot:</strong> ${reply}</div>`;
        box.scrollTop = box.scrollHeight;
    }, 1000);
}

// ---- ADMIN LOGIC ----
async function adminLogin() {
    const u = document.getElementById('adminUser').value;
    const p = document.getElementById('adminPass').value;
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
    } else { alert("Invalid Admin Credentials"); }
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.reload();
}

async function loadAdminData() {
    const res = await fetch(`${API_URL}/analytics`);
    const stats = await res.json();
    document.getElementById('statRev').innerText = `৳ ${stats.totalRevenue}`;
    document.getElementById('statOrders').innerText = stats.totalOrders;
    document.getElementById('statPending').innerText = stats.pendingCount;

    const ordRes = await fetch(`${API_URL}/orders`);
    const orders = await ordRes.json();
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = orders.slice(0, 10).map(o => `
        <tr class="border-b">
            <td class="p-2">${o.customerName}</td>
            <td class="p-2 font-bold">৳ ${o.total}</td>
            <td class="p-2"><span class="bg-${o.status==='Pending'?'yellow':'green'}-200 px-2 py-1 rounded text-xs">${o.status}</span></td>
            <td class="p-2">
                <select onchange="updateOrderStatus('${o._id}', this.value)" class="border rounded p-1 text-xs">
                    <option disabled selected>Update</option>
                    <option value="Processing">Processing</option>
                    <option value="Delivered">Delivered</option>
                </select>
            </td>
        </tr>
    `).join('');

    // Setup Chart
    const ctx = document.getElementById('salesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels:['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{ label: 'Daily Sales (Mock)', data:[1200, 1900, 3000, 500, 2000, 3000, 4500], backgroundColor: 'rgba(234, 88, 12, 0.5)' }]
        }
    });
}

async function updateOrderStatus(id, status) {
    await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    alert("Status Updated");
    loadAdminData();
}

// ---- PWA SETUP ----
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(() => console.log('PWA Service Worker Registered'));
    }
}
