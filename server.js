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
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pollirshad'; 

// --- DATABASE MODELS & CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        seedData(); 
    })
    .catch(err => console.log('❌ DB Error:', err.message));

const ProductSchema = new mongoose.Schema({
    vendorId: String, name: String, category: String, price: Number,
    stock: Number, image: String, description: String
});
const Product = mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({
    customerId: String, customerName: String, phone: String, address: String,
    items: Array, total: Number, paymentMethod: String, trxId: String, senderPhone: String,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- SEED INITIAL DATA ---
async function seedData() {
    try {
        const count = await Product.countDocuments();
        if(count === 0) {
            await Product.insertMany([
                { vendorId: 'v1', name: 'খাটি সরিষার তেল (১ লিটার)', category: 'Grocery', price: 250, stock: 50, image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=300' }
                // (Your exact product list continues here in production)
            ]);
        }
    } catch (err) {}
}

// --- API ROUTES ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'Rasel' && password === '12345#') {
        const token = jwt.sign({ id: 'admin1', role: 'admin', name: 'Rasel' }, JWT_SECRET);
        return res.json({ token, role: 'admin', message: 'Admin login successful' });
    }
    res.status(401).json({ message: 'Invalid credentials' });
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
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

// Update Single Order Status (With Password Protection for Deletion)
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status, password } = req.body;
        if (status === 'Deleted' && password !== '12345#') {
            return res.status(401).json({ error: 'ভুল পাসওয়ার্ড! অ্যাক্সেস ডিনাইড।' });
        }
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NEW SECURE ROUTE: Soft Delete All Orders
app.post('/api/orders/clear', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== '12345#') {
            return res.status(401).json({ message: 'ভুল পাসওয়ার্ড! অ্যাক্সেস ডিনাইড।' });
        }
        // Soft delete all orders
        await Order.updateMany({}, { status: 'Deleted' });
        res.json({ message: 'সমস্ত অর্ডার মুছে ফেলা হয়েছে এবং অর্ডার ট্যাবে সংরক্ষিত আছে।' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics (Excludes 'Deleted' Orders)
app.get('/api/analytics', async (req, res) => {
    try {
        // Fetch only ACTIVE orders for stats
        const activeOrders = await Order.find({ status: { $ne: 'Deleted' } });
        const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
        const pendingCount = activeOrders.filter(o => o.status === 'Pending').length;
        res.json({ totalRevenue, totalOrders: activeOrders.length, pendingCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
