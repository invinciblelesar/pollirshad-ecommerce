const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
    .then(async () => {
        console.log('✅ MongoDB Connected Successfully');
        
        // Initialize admin user if none exists
        await initializeAdminUser();
        
        seedData(); 
    })
    .catch(err => console.log('❌ DB Error:', err.message));

// --- NEW: Enhanced User Model ---
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    phone: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['customer', 'vendor', 'admin'], default: 'customer' },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// --- NEW: Vendor Model ---
const VendorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storeName: String,
    storeDescription: String,
    bankAccount: String,
    bKashNumber: String,
    commissionRate: { type: Number, default: 15 }, // 15% default commission
    totalEarnings: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Vendor = mongoose.model('Vendor', VendorSchema);

// --- ENHANCED: Product Model ---
const ProductSchema = new mongoose.Schema({
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorName: String,
    name: String, 
    category: String, 
    price: Number,
    stock: Number, 
    image: String, 
    description: String,
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema);

// --- ENHANCED: Order Model with Vendor Splitting ---
const OrderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: String, 
    phone: String, 
    address: String,
    items: Array, 
    total: Number, 
    paymentMethod: String, 
    trxId: String, 
    senderPhone: String,
    status: { type: String, default: 'Pending', enum: ['Pending', 'Processing', 'Delivered', 'Cancelled'] },
    vendorOrders: [{ // Split orders per vendor
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
        vendorName: String,
        items: Array,
        subtotal: Number,
        commission: Number,
        vendorEarnings: Number
    }],
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// --- NEW: Chat Model ---
const ChatSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderType: { type: String, enum: ['customer', 'vendor'] },
    receiverType: { type: String, enum: ['customer', 'vendor'] },
    message: String,
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

// --- SEED INITIAL DATA ---
async function seedData() {
    try {
        // Clear existing data
        await Product.deleteMany({});
        
        // Create sample vendors first
        const vendor1 = await createVendor('Fresh Local Store', 'Premium local products from our farm');
        const vendor2 = await createVendor('Quality Groceries', 'Best quality groceries and essentials');
        
        // Create products with proper vendor ObjectId references
        const products = [
            // Vendor 1 products
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'খেজুরের গুড় (পাটালি)', category: 'গুড় ও মধু', price: 350, stock: 50, image: 'images/খেজুরের গুড় (পাটালি)1.jpg', description: 'Premium date jaggery, rich in minerals' },
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'ঝোলা গুড় (১ কেজি)', category: 'গুড় ও মধু', price: 350, stock: 50, image: 'images/ঝোলা গুড় (১ কেজি)1.jpg', description: 'Traditional jaggery with rich flavor' },
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'ঘি (১ কেজি)', category: 'গুড় ও মধু', price: 1600, stock: 30, image: 'images/ঘি1.jpg', description: 'Pure desi ghee, homemade' },
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'ঘি (২৫০ গ্রাম)', category: 'গুড় ও মধু', price: 400, stock: 50, image: 'images/ঘি1.jpg', description: 'Pure desi ghee, small pack' },
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'প্রাকৃতিক ফুলের মধু (১ কেজি)', category: 'গুড় ও মধু', price: 1600, stock: 50, image: 'images/প্রাকৃতিক ফুলের মধু (১ কেজি)1.jpg', description: 'Natural flower honey, pure and healthy' },
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'সরিষার তেল (১ কেজি)', category: 'তেল ও মসলা', price: 230, stock: 100, image: 'images/সরিষার তেল (১ কেজি)1.jpg', description: 'Cold pressed mustard oil' },
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'মরিচ গুড়া (১ কেজি)', category: 'তেল ও মসলা', price: 600, stock: 50, image: 'images/মরিচ.jpg', description: 'Premium red chili powder' },
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'মরিচ গুড়া (২৫০ গ্রাম)', category: 'তেল ও মসলা', price: 150, stock: 80, image: 'images/মরিচ.jpg', description: 'Premium red chili powder, small pack' },
            { vendorId: vendor1._id, vendorName: vendor1.storeName, name: 'কালোজিরা পোলাও চাল (১ কেজি)', category: 'চাল ও আটা', price: 180, stock: 100, image: 'images/চাল.jpg', description: 'Premium basmati rice for biryani' },
            
            // Vendor 2 products
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'আখেঁর দানাদার গুড় (১ কেজি)', category: 'গুড় ও মধু', price: 250, stock: 100, image: 'images/আখেঁর দানাদার গুড় (১ কেজি)1.jpg', description: 'Granular sugarcane jaggery' },
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'চকলেট গুড় (১ কেজি)', category: 'গুড় ও মধু', price: 700, stock: 40, image: 'images/চকলেট গুড় (১ কেজি)1.jpg', description: 'Chocolate flavored jaggery' },
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'সরিষা মধু (১ কেজি)', category: 'গুড় ও মধু', price: 600, stock: 40, image: 'images/সরিষা মধু (১ কেজি)1.jpg', description: 'Mustard flower honey' },
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'লিচু ফুলের মধু (১ কেজি)', category: 'গুড় ও মধু', price: 1000, stock: 40, image: 'images/লিচু ফুলের মধু (১ কেজি)1.jpg', description: 'Lychee flower honey, premium quality' },
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'হলুদ গুড়া (১ কেজি)', category: 'তেল ও মসলা', price: 480, stock: 50, image: 'images/হলুদ.jpg', description: 'Premium turmeric powder' },
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'হলুদ গুড়া (২৫০ গ্রাম)', category: 'তেল ও মসলা', price: 120, stock: 80, image: 'images/হলুদ.jpg', description: 'Premium turmeric powder, small pack' },
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'ধনিয়া গুড়া (১ কেজি)', category: 'তেল ও মসলা', price: 450, stock: 60, image: 'images/ধনিয়া গুড়া1.jpg', description: 'Premium coriander powder' },
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'ধনিয়া গুড়া (২৫০ গ্রাম)', category: 'তেল ও মসলা', price: 112, stock: 80, image: 'images/ধনিয়া গুড়া1.jpg', description: 'Premium coriander powder, small pack' },
            { vendorId: vendor2._id, vendorName: vendor2.storeName, name: 'লাল আটা (১ কেজি)', category: 'চাল ও আটা', price: 80, stock: 100, image: 'images/ময়দা.jpg', description: 'Premium whole wheat flour' }
        ];
        
        await Product.insertMany(products);
        console.log(`✅ Seeded ${products.length} products successfully!`);
        console.log(`🏪 Vendor 1: ${vendor1.storeName} (${vendor1._id})`);
        console.log(`🏪 Vendor 2: ${vendor2.storeName} (${vendor2._id})`);
        
    } catch (err) {
        console.log("❌ Seeding Error:", err.message);
    }
}

// Helper function to create vendors
async function createVendor(storeName, storeDescription) {
    try {
        // Check if vendor already exists
        const existingVendor = await Vendor.findOne({ storeName });
        if (existingVendor) {
            return existingVendor;
        }
        
        // Create a dummy user for the vendor
        const dummyUser = await User.findOne({ email: `vendor${Date.now()}@pollirshad.com` });
        let userId;
        
        if (!dummyUser) {
            const newUser = new User({
                name: storeName,
                email: `vendor${Date.now()}@pollirshad.com`,
                phone: `017${Math.floor(10000000 + Math.random() * 90000000)}`,
                password: 'vendor123',
                role: 'vendor'
            });
            await newUser.save();
            userId = newUser._id;
        } else {
            userId = dummyUser._id;
        }
        
        // Create vendor
        const vendor = new Vendor({
            userId: userId,
            storeName: storeName,
            storeDescription: storeDescription,
            bKashNumber: '01700000000',
            commissionRate: 15,
            verified: true,
            totalEarnings: 0
        });
        
        await vendor.save();
        return vendor;
        
    } catch (err) {
        console.log(`❌ Error creating vendor ${storeName}:`, err.message);
        throw err;
    }
}

// --- AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

// --- API ROUTES ---

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or phone already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = new User({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || 'customer'
        });
        
        await newUser.save();
        
        // If vendor, create vendor profile
        if (role === 'vendor') {
            const newVendor = new Vendor({
                userId: newUser._id,
                storeName: `${name}'s Store`,
                storeDescription: 'Welcome to my store!',
                verified: false
            });
            await newVendor.save();
        }
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        
        // Find user by email or phone
        const user = await User.findOne({
            $or: [
                { email: email },
                { phone: phone }
            ]
        });
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Compare password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            token, 
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                verified: user.verified
            },
            message: 'Login successful' 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        let vendor = null;
        if (user.role === 'vendor') {
            vendor = await Vendor.findOne({ userId: user._id });
        }
        
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                verified: user.verified
            },
            vendor
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin login (proper authentication)
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find admin user by email
        const adminUser = await User.findOne({ email: email, role: 'admin' });
        
        if (!adminUser) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }
        
        // Compare password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, adminUser.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }
        
        const token = jwt.sign(
            { id: adminUser._id, role: adminUser.role, name: adminUser.name, email: adminUser.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            token, 
            user: {
                id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                phone: adminUser.phone,
                role: adminUser.role,
                verified: adminUser.verified
            },
            message: 'Admin login successful' 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all products (for customer frontend)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().populate('vendorId', 'storeName');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get products by vendor (for vendor dashboard)
app.get('/api/vendor/products', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        const products = await Product.find({ vendorId: vendor._id });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new product (vendor only)
app.post('/api/vendor/products', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        const { name, category, price, stock, image, description } = req.body;
        
        const newProduct = new Product({
            vendorId: vendor._id,
            vendorName: vendor.storeName,
            name,
            category,
            price,
            stock,
            image,
            description
        });
        
        await newProduct.save();
        res.status(201).json({ message: 'Product added successfully', product: newProduct });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update product (vendor only)
app.put('/api/vendor/products/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        const { name, category, price, stock, image, description } = req.body;
        
        const updatedProduct = await Product.findOneAndUpdate(
            { _id: req.params.id, vendorId: vendor._id },
            { name, category, price, stock, image, description },
            { new: true }
        );
        
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        res.json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete product (vendor only)
app.delete('/api/vendor/products/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        const deletedProduct = await Product.findOneAndDelete({
            _id: req.params.id,
            vendorId: vendor._id
        });
        
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get vendor orders (vendor only)
app.get('/api/vendor/orders', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        const orders = await Order.find({
            'vendorOrders.vendorId': vendor._id
        }).sort({ createdAt: -1 });
        
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update vendor order status (vendor only)
app.put('/api/vendor/orders/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        const { status } = req.body;
        const orderId = req.params.id;
        
        // Update the vendor-specific order status
        const order = await Order.findOne({
            _id: orderId,
            'vendorOrders.vendorId': vendor._id
        });
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Update the vendor order status
        const vendorOrder = order.vendorOrders.find(vo => vo.vendorId.toString() === vendor._id.toString());
        if (vendorOrder) {
            vendorOrder.status = status;
            await order.save();
        }
        
        res.json({ message: 'Order status updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get vendor profile (vendor only)
app.get('/api/vendor/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        res.json(vendor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update vendor profile (vendor only)
app.put('/api/vendor/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findOne({ userId: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        const { storeName, storeDescription, bKashNumber, bankAccount } = req.body;
        
        const updatedVendor = await Vendor.findByIdAndUpdate(
            vendor._id,
            { storeName, storeDescription, bKashNumber, bankAccount },
            { new: true }
        );
        
        res.json(updatedVendor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get all vendors (admin only)
app.get('/api/admin/vendors', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendors = await Vendor.find().populate('userId', 'name email phone');
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Approve vendor (admin only)
app.put('/api/admin/vendors/:id/approve', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const vendor = await Vendor.findByIdAndUpdate(
            req.params.id,
            { verified: true },
            { new: true }
        );
        
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        res.json({ message: 'Vendor approved successfully', vendor });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update commission rate (admin only)
app.put('/api/admin/vendors/:id/commission', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { commissionRate } = req.body;
        
        const vendor = await Vendor.findByIdAndUpdate(
            req.params.id,
            { commissionRate },
            { new: true }
        );
        
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        
        res.json({ message: 'Commission rate updated successfully', vendor });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Enhanced Order Creation with Vendor Splitting
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orderData = req.body;
        
        // Group items by vendor
        const vendorGroups = {};
        orderData.items.forEach(item => {
            if (!vendorGroups[item.vendorId]) {
                vendorGroups[item.vendorId] = [];
            }
            vendorGroups[item.vendorId].push(item);
        });
        
        // Calculate vendor orders
        const vendorOrders = [];
        let totalCommission = 0;
        
        for (const vendorId in vendorGroups) {
            const vendorItems = vendorGroups[vendorId];
            const subtotal = vendorItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
            
            // Get vendor details and commission rate
            const vendor = await Vendor.findById(vendorId);
            if (!vendor) {
                return res.status(400).json({ message: `Vendor not found: ${vendorId}` });
            }
            
            const commission = (subtotal * vendor.commissionRate) / 100;
            const vendorEarnings = subtotal - commission;
            
            vendorOrders.push({
                vendorId: vendor._id,
                vendorName: vendor.storeName,
                items: vendorItems,
                subtotal: subtotal,
                commission: commission,
                vendorEarnings: vendorEarnings
            });
            
            totalCommission += commission;
            
            // Update vendor earnings
            vendor.totalEarnings += vendorEarnings;
            await vendor.save();
        }
        
        // Create the main order
        const newOrder = new Order({
            customerId: req.user.id,
            customerName: orderData.customerName,
            phone: orderData.phone,
            address: orderData.address,
            items: orderData.items,
            total: orderData.total,
            paymentMethod: orderData.paymentMethod,
            trxId: orderData.trxId,
            senderPhone: orderData.senderPhone,
            vendorOrders: vendorOrders
        });
        
        await newOrder.save();
        
        res.json({ 
            message: 'Order placed successfully', 
            orderId: newOrder._id,
            vendorOrders: vendorOrders.length
        });
    } catch (err) {
        console.error('Order creation error:', err);
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

// --- ADMIN USER INITIALIZATION SYSTEM ---
// Admin User Initialization Function
async function initializeAdminUser() {
    try {
        // Check if admin credentials are configured
        const adminName = process.env.ADMIN_NAME;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPhone = process.env.ADMIN_PHONE;
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        if (!adminName || !adminEmail || !adminPhone || !adminPassword) {
            console.log('⚠️  Admin credentials not configured in environment variables');
            console.log('📝 Please set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, and ADMIN_PASSWORD in .env file');
            return;
        }
        
        // Validate admin credentials
        if (!validateAdminCredentials(adminName, adminEmail, adminPhone, adminPassword)) {
            console.log('❌ Admin credentials validation failed');
            return;
        }
        
        // Check if any admin user already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('✅ Admin user already exists:', existingAdmin.email);
            return;
        }
        
        // Create new admin user
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const adminUser = new User({
            name: adminName,
            email: adminEmail,
            phone: adminPhone,
            password: hashedPassword,
            role: 'admin'
        });
        
        await adminUser.save();
        
        console.log('🎉 Admin user created successfully!');
        console.log('📧 Admin Email:', adminEmail);
        console.log('🔑 Admin Password: [SECURE - Set in environment variables]');
        console.log('👑 Role: Admin');
        console.log('📍 Access Admin Panel: http://localhost:5000/admin.html');
        
    } catch (error) {
        console.error('❌ Error initializing admin user:', error.message);
    }
}

// Admin Credentials Validation Function
function validateAdminCredentials(name, email, phone, password) {
    // Validate name
    if (!name || name.trim().length < 2) {
        console.log('❌ Admin name must be at least 2 characters long');
        return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        console.log('❌ Invalid admin email format');
        return false;
    }
    
    // Validate phone number (Bangladesh format)
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phone || !phoneRegex.test(phone)) {
        console.log('❌ Invalid admin phone number format (must be Bangladeshi mobile number)');
        return false;
    }
    
    // Validate password complexity
    if (!password || password.length < 8) {
        console.log('❌ Admin password must be at least 8 characters long');
        return false;
    }
    
    // Check password complexity (at least one uppercase, lowercase, number, and special character)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        console.log('❌ Admin password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
        return false;
    }
    
    return true;
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
