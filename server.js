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
        await Product.deleteMany({});
        await Product.insertMany([
            { vendorId: 'v1', name: 'খেজুরের গুড় (পাটালি)', category: 'গুড় ও মধু', price: 350, stock: 50, image: 'images/খেজুরের গুড় (পাটালি)1.jpg' },
            { vendorId: 'v1', name: 'ঝোলা গুড় (১ কেজি)', category: 'গুড় ও মধু', price: 350, stock: 50, image: 'images/ঝোলা গুড় (১ কেজি)1.jpg' },
            { vendorId: 'v2', name: 'আখেঁর দানাদার গুড় (১ কেজি)', category: 'গুড় ও মধু', price: 250, stock: 100, image: 'images/আখেঁর দানাদার গুড় (১ কেজি)1.jpg' },
            { vendorId: 'v2', name: 'চকলেট গুড় (১ কেজি)', category: 'গুড় ও মধু', price: 700, stock: 40, image: 'images/চকলেট গুড় (১ কেজি)1.jpg' },
            { vendorId: 'v1', name: 'ঘি (১ কেজি)', category: 'গুড় ও মধু', price: 1600, stock: 30, image: 'images/ঘি1.jpg' },
            { vendorId: 'v1', name: 'ঘি (২৫০ গ্রাম)', category: 'গুড় ও মধু', price: 400, stock: 50, image: 'images/ঘি1.jpg' },
            { vendorId: 'v2', name: 'সরিষা মধু (১ কেজি)', category: 'গুড় ও মধু', price: 600, stock: 40, image: 'images/সরিষা মধু (১ কেজি)1.jpg' },
            { vendorId: 'v2', name: 'লিচু ফুলের মধু (১ কেজি)', category: 'গুড় ও মধু', price: 1000, stock: 40, image: 'images/লিচু ফুলের মধু (১ কেজি)1.jpg' },
            { vendorId: 'v1', name: 'প্রাকৃতিক ফুলের মধু (১ কেজি)', category: 'গুড় ও মধু', price: 1600, stock: 50, image: 'images/প্রাকৃতিক ফুলের মধু (১ কেজি)1.jpg' },
            { vendorId: 'v1', name: 'সরিষার তেল (১ কেজি)', category: 'তেল ও মসলা', price: 230, stock: 100, image: 'images/সরিষার তেল (১ কেজি)1.jpg' },
            { vendorId: 'v2', name: 'হলুদ গুড়া (১ কেজি)', category: 'তেল ও মসলা', price: 480, stock: 50, image: 'images/হলুদ.jpg' },
            { vendorId: 'v2', name: 'হলুদ গুড়া (২৫০ গ্রাম)', category: 'তেল ও মসলা', price: 120, stock: 80, image: 'images/হলুদ.jpg' },
            { vendorId: 'v1', name: 'মরিচ গুড়া (১ কেজি)', category: 'তেল ও মসলা', price: 600, stock: 50, image: 'images/মরিচ.jpg' },
            { vendorId: 'v1', name: 'মরিচ গুড়া (২৫০ গ্রাম)', category: 'তেল ও মসলা', price: 150, stock: 80, image: 'images/মরিচ.jpg' },
            { vendorId: 'v2', name: 'ধনিয়া গুড়া (১ কেজি)', category: 'তেল ও মসলা', price: 450, stock: 60, image: 'images/ধনিয়া গুড়া1.jpg' },
            { vendorId: 'v2', name: 'ধনিয়া গুড়া (২৫০ গ্রাম)', category: 'তেল ও মসলা', price: 112, stock: 80, image: 'images/ধনিয়া গুড়া1.jpg' },
            { vendorId: 'v1', name: 'কালোজিরা পোলাও চাল (১ কেজি)', category: 'চাল ও আটা', price: 180, stock: 100, image: 'images/চাল.jpg' },
            { vendorId: 'v2', name: 'লাল আটা (১ কেজি)', category: 'চাল ও আটা', price: 80, stock: 100, image: 'images/ময়দা.jpg' }
        ]);
        console.log('✅ Updated Products Seeded!');
    } catch (err) {
        console.log("❌ Seeding Error:", err.message);
    }
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

app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NEW ROUTE TO DELETE ALL DEMO ORDERS
app.delete('/api/orders', async (req, res) => {
    try {
        await Order.deleteMany({});
        res.json({ message: 'All orders cleared successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
