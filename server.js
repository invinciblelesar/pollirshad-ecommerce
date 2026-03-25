const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve Frontend

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_pollirshad';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pollirshad'; // Uses Render Env Var in production

// --- DATABASE MODELS & CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        seedData(); // Only run this safely AFTER the database is connected
    })
    .catch(err => console.log('❌ DB Error:', err.message));

// Product Schema
const ProductSchema = new mongoose.Schema({
    vendorId: String, name: String, category: String, price: Number,
    stock: Number, image: String, description: String
});
const Product = mongoose.model('Product', ProductSchema);

// Order Schema
const OrderSchema = new mongoose.Schema({
    customerId: String, customerName: String, phone: String, address: String,
    items: Array, total: Number, paymentMethod: String, trxId: String,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- SEED INITIAL DATA ---
// (This creates test products automatically if the database is empty)
async function seedData() {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            await Product.insertMany([
                { vendorId: 'v1', name: 'খাটি সরিষার তেল (১ লিটার)', category: 'Grocery', price: 250, stock: 50, image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=300' },
                { vendorId: 'v1', name: 'সুন্দরবনের খাঁটি মধু (৫০০ গ্রাম)', category: 'Honey', price: 400, stock: 30, image: 'https://images.unsplash.com/photo-1587049352847-4d4b1f450370?auto=format&fit=crop&w=300' },
                { vendorId: 'v2', name: 'খেজুরের গুড় (১ কেজি)', category: 'Sweets', price: 350, stock: 100, image: 'https://images.unsplash.com/photo-1600180735311-65715206f363?auto=format&fit=crop&w=300' },
                { vendorId: 'v2', name: 'কালোজিরা পোলাও চাল (১ কেজি)', category: 'Grocery', price: 180, stock: 40, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300' }
            ]);
            console.log('✅ Demo Products Seeded!');
        }
    } catch (err) {
        console.log("❌ Seeding Error:", err.message);
    }
}

// --- API ROUTES ---

// 1. Auth Route (Admin Panel Login)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // Admin login using Rasel & 12345#
    if (username === 'Rasel' && password === '12345#') {
        const token = jwt.sign({ id: 'admin1', role: 'admin', name: 'Rasel' }, JWT_SECRET);
        return res.json({ token, role: 'admin', message: 'Admin login successful' });
    }
    
    // Mock Vendor Login
    if (username === 'vendor' && password === 'vendor123') {
        const token = jwt.sign({ id: 'v1', role: 'vendor' }, JWT_SECRET);
        return res.json({ token, role: 'vendor', message: 'Vendor login successful' });
    }
    
    res.status(401).json({ message: 'Invalid credentials' });
});

// 2. Products API (Frontend Grid)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Orders API (Checkout & Admin Dashboard)
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        console.log(`[Courier API] Syncing Order ${newOrder._id} with Courier...`);
        res.json({ message: 'Order placed successfully', orderId: newOrder._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Analytics API (For Admin Dashboard Stats)
app.get('/api/analytics', async (req, res) => {
    try {
        const orders = await Order.find();
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const pendingCount = orders.filter(o => o.status === 'Pending').length;
        res.json({ totalRevenue, totalOrders: orders.length, pendingCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
