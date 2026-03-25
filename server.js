const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve Frontend

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_pollirshad';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pollirshad'; // Replace with Atlas URL for production

// --- DATABASE MODELS & CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        seedData(); // Only run this AFTER database connects
    })
    .catch(err => console.log('❌ DB Error:', err.message));

const ProductSchema = new mongoose.Schema({
    vendorId: String, name: String, category: String, price: Number,
    stock: Number, image: String, description: String
});
const Product = mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({
    customerId: String, customerName: String, phone: String, address: String,
    items: Array, total: Number, paymentMethod: String, trxId: String,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- SEED INITIAL DATA (Safely) ---
async function seedData() {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            await Product.insertMany([
                { vendorId: 'v1', name: 'খাটি সরিষার তেল (১ লিটার)', category: 'Grocery', price: 250, stock: 50, image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=300' },
                { vendorId: 'v1', name: 'সুন্দরবনের খাঁটি মধু (৫০০ গ্রাম)', category: 'Honey', price: 400, stock: 30, image: 'https://images.unsplash.com/photo-1587049352847-4d4b1f450370?auto=format&fit=crop&w=300' },
                { vendorId: 'v2', name: 'খেজুরের গুড় (১ কেজি)', category: 'Sweets', price: 350, stock: 100, image: 'https://images.unsplash.com/photo-1600180735311-65715206f363?auto=format&fit=crop&w=300' }
            ]);
            console.log('✅ Products Seeded!');
        }
    } catch (err) {
        console.log("❌ Seeding Error:", err.message);
    }
}

// --- SEED INITIAL DATA (Test Data) ---
async function seedData() {
    const count = await Product.countDocuments();
    if (count === 0) {
        await Product.insertMany([
            { vendorId: 'v1', name: 'খাটি সরিষার তেল (১ লিটার)', category: 'Grocery', price: 250, stock: 50, image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&w=300' },
            { vendorId: 'v1', name: 'সুন্দরবনের খাঁটি মধু (৫০০ গ্রাম)', category: 'Honey', price: 400, stock: 30, image: 'https://images.unsplash.com/photo-1587049352847-4d4b1f450370?auto=format&fit=crop&w=300' },
            { vendorId: 'v2', name: 'খেজুরের গুড় (১ কেজি)', category: 'Sweets', price: 350, stock: 100, image: 'https://images.unsplash.com/photo-1600180735311-65715206f363?auto=format&fit=crop&w=300' }
        ]);
    }
}
seedData();

// --- API ROUTES ---

// 1. Auth Route (Handles Hardcoded Admin & Vendors)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    // Admin login explicitly requested
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

// 2. Products API
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});
app.post('/api/products', async (req, res) => {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json(newProduct);
});

// 3. Orders API
app.post('/api/orders', async (req, res) => {
    const newOrder = new Order(req.body);
    await newOrder.save();
    // Simulate Courier API Push (Pathao/Steadfast Placeholder)
    console.log(`[Courier API] Syncing Order ${newOrder._id} with Pathao...`);
    res.json({ message: 'Order placed successfully', orderId: newOrder._id });
});
app.get('/api/orders', async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
});
app.put('/api/orders/:id/status', async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(order);
});

// 4. Analytics
app.get('/api/analytics', async (req, res) => {
    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    res.json({ totalRevenue, totalOrders: orders.length, pendingCount });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
