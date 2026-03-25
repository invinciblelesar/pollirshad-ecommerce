const API_URL = '/api'; // Dynamically uses local or live URL

// ---- STATE ----
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products =[];

// ---- INITIALIZATION ----
// Check if we are on the customer facing page
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
                        <img src="${p.image}" class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500">
                        ${p.stock < 10 ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow">Low Stock</span>` : ''}
                    </div>
                    <div class="p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-widest mb-1">${p.category}</p>
                        <h4 class="font-bold text-gray-800 text-lg mb-2 truncate">${p.name}</h4>
                        <div class="flex justify-between items-center mt-4">
                            <span class="text-orange-600 font-bold text-xl">৳ ${p.price}</span>
                            <button onclick="addToCart('${p._id}')" class="bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-orange-600 transition-colors shadow-sm">
                                <i class="fas fa-cart-plus"></i> Add
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
    
    // Meta Pixel Mock
    if(typeof trackPixel === 'function') trackPixel('AddToCart');
    
    saveCart();
    updateCartUI();
    
    // Open cart slider automatically
    const cartPanel = document.getElementById('cartPanel');
    if(cartPanel && cartPanel.classList.contains('translate-x-full')) {
        toggleCart();
    }
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
                <h5 class="text-sm font-bold text-gray-800">${item.name}</h5>
                <p class="text-orange-600 text-sm font-semibold">৳ ${item.price} x ${item.qty}</p>
            </div>
            <button onclick="removeCart(${idx})" class="text-red-500 hover:text-red-700 text-sm p-2 bg-red-50 rounded"><i class="fas fa-trash"></i></button>
        </div>
    `).join('') : '<div class="text-center text-gray-400 mt-10"><i class="fas fa-shopping-basket text-4xl mb-3"></i><p>Your cart is empty.</p></div>';
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalEl = document.getElementById('cartTotal');
    if(totalEl) totalEl.innerText = `৳ ${total}`;
}

function removeCart(idx) { cart.splice(idx, 1); saveCart(); updateCartUI(); }
function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }
function toggleCart() { document.getElementById('cartPanel').classList.toggle('translate-x-full'); }

// ---- CHECKOUT & PDF INVOICE ----
function openCheckout() {
    if(cart.length === 0) return alert('Your cart is empty!');
    document.getElementById('checkoutModal').classList.remove('hidden');
    toggleCart(); // Close slider
}
function closeCheckout() { document.getElementById('checkoutModal').classList.add('hidden'); }

// Show/Hide MFS details based on payment selection
function togglePayment() {
    const val = document.getElementById('paymentMethod').value;
    const details = document.getElementById('paymentDetails');
    if(val !== 'COD') {
        details.classList.remove('hidden');
    } else {
        details.classList.add('hidden');
    }
}

async function placeOrder() {
    // Gather all data from the frontend form
    const data = {
        customerName: document.getElementById('cName').value.trim(),
        phone: document.getElementById('cPhone').value.trim(),
        address: document.getElementById('cAddress').value.trim(),
        paymentMethod: document.getElementById('paymentMethod').value,
        senderPhone: document.getElementById('senderPhone') ? document.getElementById('senderPhone').value.trim() : '',
        trxId: document.getElementById('trxId').value.trim(),
        items: cart,
        total: cart.reduce((s, i) => s + (i.price * i.qty), 0)
    };
    
    // Validation
    if(!data.customerName || !data.phone || !data.address) {
        return alert("Please fill in your Full Name, Phone Number, and Delivery Address.");
    }
    if (data.paymentMethod !== 'COD' && (!data.senderPhone || !data.trxId)) {
        return alert("Please provide the Sender Phone Number and Transaction ID for your payment.");
    }

    try {
        // Send to backend
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        // Meta Pixel Mock
        if(typeof trackPixel === 'function') trackPixel('Purchase');
        
        // Generate PDF
        generatePDFInvoice(data, result.orderId);
        
        alert("Order placed successfully! Your Order ID is: " + result.orderId);
        
        // Clear Cart
        cart =[]; 
        saveCart(); 
        updateCartUI(); 
        closeCheckout();
        
        // WhatsApp Notification Redirection
        const waMsg = `*New Order Placed*\n\nID: ${result.orderId}\nName: ${data.customerName}\nPhone: ${data.phone}\nTotal: ৳${data.total}\nPayment: ${data.paymentMethod}`;
        window.open(`https://wa.me/8801580567606?text=${encodeURIComponent(waMsg)}`, '_blank');
        
    } catch (e) { 
        alert("Error placing order. Please try again."); 
        console.error(e);
    }
}

function generatePDFInvoice(data, orderId) {
    if(!window.jspdf) return console.warn("jsPDF library not loaded");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("POLLIRSHAD - INVOICE", 10, 20);
    
    doc.setFontSize(12);
    doc.text(`Order ID: ${orderId}`, 10, 30);
    doc.text(`Customer Name: ${data.customerName}`, 10, 40);
    doc.text(`Phone: ${data.phone}`, 10, 50);
    doc.text(`Delivery Address: ${data.address}`, 10, 60);
    doc.text(`Payment Method: ${data.paymentMethod}`, 10, 70);
    doc.text(`Total Amount: ${data.total} BDT`, 10, 80);
    
    doc.save(`Pollirshad_Invoice_${orderId}.pdf`);
}

// ---- AI CHATBOT (Rule-Based Mock) ----
function toggleChat() {
    const chat = document.getElementById('chatBox');
    if(chat) chat.classList.toggle('hidden');
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if(!msg) return;
    
    const box = document.getElementById('chatMessages');
    box.innerHTML += `<div class="mb-2 text-right text-blue-700"><strong>You:</strong> ${msg}</div>`;
    input.value = '';
    
    // AI Mock Logic Responses
    setTimeout(() => {
        let reply = "Our support team will contact you shortly.";
        const lowerMsg = msg.toLowerCase();
        
        if(lowerMsg.includes('delivery') || lowerMsg.includes('time')) {
            reply = "Standard delivery takes 2-3 days inside Dhaka, and 3-5 days outside Dhaka via Pathao/Steadfast.";
        } else if(lowerMsg.includes('bkash') || lowerMsg.includes('nagad') || lowerMsg.includes('payment')) {
            reply = "We accept Cash on Delivery, bKash, Nagad, and Rocket. Our payment number is 017XXXXXX (Personal).";
        } else if(lowerMsg.includes('order') || lowerMsg.includes('track')) {
            reply = "Please provide your phone number or Order ID so we can track it for you.";
        }
        
        box.innerHTML += `<div class="mb-2 text-orange-700 bg-orange-50 p-2 rounded"><strong>Bot:</strong> ${reply}</div>`;
        box.scrollTop = box.scrollHeight;
    }, 1000);
}

// ---- ADMIN DASHBOARD LOGIC ----
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
            alert("Invalid Admin Credentials"); 
        }
    } catch(err) {
        alert("Server error during login.");
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
                let badgeColor = 'bg-yellow-100 text-yellow-800 border border-yellow-200'; // Pending
                if(o.status === 'Processing') badgeColor = 'bg-blue-100 text-blue-800 border border-blue-200';
                if(o.status === 'Delivered') badgeColor = 'bg-green-100 text-green-800 border border-green-200';

                // Format Payment Info
                let paymentInfo = '';
                if(o.paymentMethod === 'COD') {
                    paymentInfo = `<span class="text-orange-600 font-bold px-2 py-1 bg-orange-50 rounded border border-orange-200 text-xs">COD</span>`;
                } else {
                    paymentInfo = `
                        <div class="text-xs leading-tight bg-gray-50 p-2 rounded border">
                            <strong class="text-gray-800">${o.paymentMethod}</strong><br>
                            <span class="text-gray-500">No:</span> ${o.senderPhone || 'N/A'}<br>
                            <span class="text-gray-500">TrxID:</span> <span class="font-mono">${o.trxId || 'N/A'}</span>
                        </div>`;
                }

                return `
                <tr class="border-b hover:bg-gray-50 transition-colors">
                    <td class="p-3">
                        <div class="font-bold text-gray-800">${o.customerName}</div>
                        <div class="text-xs text-gray-500 mt-1"><i class="fas fa-phone-alt"></i> ${o.phone}</div>
                    </td>
                    <td class="p-3 text-xs text-gray-600 max-w-[200px] whitespace-normal">
                        ${o.address}
                    </td>
                    <td class="p-3">
                        ${paymentInfo}
                    </td>
                    <td class="p-3 font-bold text-gray-800 text-base">
                        ৳ ${o.total}
                    </td>
                    <td class="p-3">
                        <span class="${badgeColor} px-2 py-1 rounded text-xs font-semibold shadow-sm">${o.status}</span>
                    </td>
                    <td class="p-3">
                        <select onchange="updateOrderStatus('${o._id}', this.value)" class="border border-gray-300 rounded p-1 text-xs bg-white cursor-pointer hover:border-orange-500 outline-none focus:ring-1 focus:ring-orange-500">
                            <option disabled selected>Change Status</option>
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
                        backgroundColor: 'rgba(234, 88, 12, 0.7)',
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
        alert(`Order status successfully updated to: ${status}`);
        loadAdminData(); // Refresh table immediately
    } catch(err) {
        alert("Failed to update status");
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
