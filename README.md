# পল্লীর স্বাদ - Multi-Vendor E-commerce Platform

A comprehensive multi-vendor e-commerce platform built with Node.js, Express, MongoDB, and modern frontend technologies. This platform connects local vendors with customers, featuring real-time chat, AI recommendations, and a complete admin dashboard.

## 🌟 Features

### 🛒 Customer Features
- **Multi-Vendor Shopping**: Browse products from multiple verified vendors
- **Real-time Chat**: Live chat support with AI-powered responses
- **Smart Recommendations**: AI-driven product suggestions based on browsing history
- **Secure Authentication**: JWT-based authentication with role-based access
- **Mobile-First Design**: Fully responsive PWA with offline capabilities
- **Multiple Payment Options**: Cash on delivery, bKash, Nagad, and more
- **Order Tracking**: Real-time order status updates

### 👨‍💼 Vendor Features
- **Vendor Dashboard**: Complete control over products and orders
- **Inventory Management**: Real-time stock tracking and management
- **Sales Analytics**: Detailed sales reports and performance metrics
- **Order Management**: Process and track customer orders
- **Commission Tracking**: Automatic commission calculation and tracking
- **Product Management**: Add, edit, and manage product listings

### 👑 Admin Features
- **Multi-Vendor Management**: Approve vendors and manage commissions
- **Order Oversight**: Monitor all orders across vendors
- **Analytics Dashboard**: Comprehensive sales and user analytics
- **User Management**: Manage customers, vendors, and admin users
- **System Configuration**: Configure platform settings and policies

### 🤖 AI Features
- **Smart Chatbot**: AI-powered customer support with quick responses
- **Product Recommendations**: Machine learning-based suggestions
- **Sales Predictions**: AI-driven sales forecasting and insights

## 🏗️ Architecture

### Backend (Node.js/Express)
- **RESTful API**: Clean, well-documented REST API
- **Authentication**: JWT-based authentication with middleware
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io for live chat functionality
- **AI Integration**: OpenAI API for chatbot and recommendations
- **File Upload**: Multer for product image uploads
- **Validation**: Joi for request validation
- **Security**: Helmet, CORS, rate limiting, and input sanitization

### Frontend (Vanilla JS + Tailwind CSS)
- **Customer Portal**: Modern, responsive shopping interface
- **Vendor Dashboard**: Feature-rich vendor management interface
- **Admin Panel**: Comprehensive administrative interface
- **PWA Support**: Progressive Web App with offline capabilities
- **Real-time Updates**: Live chat and order status updates

### Database Schema
- **Users**: Customer, vendor, and admin user management
- **Vendors**: Vendor profiles, verification, and commission rates
- **Products**: Multi-vendor product catalog with inventory
- **Orders**: Complete order management with status tracking
- **Chats**: Real-time chat messages and history
- **Analytics**: Sales data and user behavior tracking

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd pollirshad-ecommerce
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
MONGO_URI=mongodb://localhost:27017/pollirshad
OPENAI_API_KEY=your-openai-api-key

# Admin User Configuration (Required for first-time setup)
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@pollirshad.com
ADMIN_PHONE=01700000000
ADMIN_PASSWORD=YourSecureAdminPassword123!
```

4. **Admin User Setup**
The system automatically creates an admin user on first startup if none exists:
- **Admin Email**: `admin@pollirshad.com`
- **Admin Password**: `YourSecureAdminPassword123!` (set in .env)
- **Role**: Admin
- **Access**: http://localhost:5000/admin.html

**Important**: The admin credentials are validated for security:
- Password must be at least 8 characters
- Must contain uppercase, lowercase, number, and special character
- Email must be valid format
- Phone must be Bangladeshi mobile number format

If admin user already exists, the system will skip creation and log the existing admin email.

4. **Start the server**
```bash
npm start
```

5. **Access the application**
- Customer Portal: http://localhost:5000
- Admin Panel: http://localhost:5000/admin.html
- Vendor Dashboard: http://localhost:5000/vendor.html

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (vendor)
- `PUT /api/products/:id` - Update product (vendor)
- `DELETE /api/products/:id` - Delete product (vendor)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (admin/vendor)
- `DELETE /api/orders` - Delete all orders (admin)

### Vendors
- `GET /api/vendors` - Get all vendors
- `POST /api/vendors` - Create vendor request
- `PUT /api/vendors/:id/approve` - Approve vendor (admin)
- `PUT /api/vendors/:id/commission` - Update commission rate (admin)

### Chat
- `GET /api/chat/history` - Get chat history
- `POST /api/chat/message` - Send message
- `POST /api/chat/ai` - Get AI response

### Analytics
- `GET /api/analytics` - Get platform analytics
- `GET /api/analytics/vendor/:id` - Get vendor analytics

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 5000)
- `JWT_SECRET`: JWT signing secret
- `MONGO_URI`: MongoDB connection string
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `CLOUDINARY_URL`: Cloudinary URL for image uploads (optional)

### Database Models

#### User Model
```javascript
{
  name: String,
  email: String,
  phone: String,
  password: String,
  role: ['customer', 'vendor', 'admin'],
  createdAt: Date
}
```

#### Vendor Model
```javascript
{
  userId: ObjectId,
  storeName: String,
  storeDescription: String,
  bKashNumber: String,
  nagadNumber: String,
  commissionRate: Number,
  verified: Boolean,
  totalEarnings: Number,
  createdAt: Date
}
```

#### Product Model
```javascript
{
  name: String,
  description: String,
  price: Number,
  category: String,
  stock: Number,
  image: String,
  vendorId: ObjectId,
  createdAt: Date
}
```

## 🎨 Frontend Structure

### Customer Portal (`/public/`)
- `index.html` - Main shopping interface
- `app.js` - Customer frontend logic
- `styles.css` - Customer styling

### Admin Panel (`/public/admin.html`)
- Complete admin dashboard
- Order management
- Vendor management
- Analytics and reporting

### Vendor Dashboard (`/vendor/`)
- `vendor.html` - Vendor interface
- `vendor.js` - Vendor logic
- Product and order management

## 🤖 AI Integration

### Chatbot
The platform includes an AI-powered chatbot that provides:
- Instant customer support
- Product recommendations
- Order status information
- FAQ responses

### Product Recommendations
AI-driven recommendations based on:
- User browsing history
- Purchase patterns
- Similar user behavior
- Product popularity

## 📱 PWA Features

- **Offline Support**: Service worker for offline functionality
- **Push Notifications**: Real-time order updates
- **Add to Home Screen**: Native app-like experience
- **Fast Loading**: Optimized for performance

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers middleware
- **Password Hashing**: bcrypt for secure password storage

## 🚀 Deployment

### Local Development
```bash
npm install
npm start
```

### Production Deployment (Render)

1. **Create Render Account**: Sign up at [render.com](https://render.com)
2. **Connect Repository**: Link your GitHub repository
3. **Create Web Service**: Use the `render.yaml` configuration
4. **Set Environment Variables**: Add required environment variables
5. **Deploy**: Render will automatically deploy your application

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-production-secret-key
MONGO_URI=your-production-mongodb-uri
OPENAI_API_KEY=your-openai-api-key
```

### MongoDB Setup
For production, use MongoDB Atlas:
1. Create cluster at [mongodb.com](https://mongodb.com)
2. Get connection string
3. Add to environment variables
4. Configure IP access and user permissions

## 📊 Monitoring & Analytics

### Built-in Analytics
- Sales performance tracking
- User behavior analysis
- Product popularity metrics
- Vendor performance reports

### Third-party Integration
- Google Analytics for web analytics
- Sentry for error tracking
- Custom metrics and logging

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📚 Documentation

### API Documentation
Auto-generated API documentation available at:
- `/api-docs` - Swagger UI documentation
- `/api` - API endpoint reference

### Code Documentation
- JSDoc comments throughout the codebase
- Architecture decision records (ADRs)
- Database schema documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for your changes
5. Run the test suite
6. Submit a pull request

### Code Style
- Use ESLint for code linting
- Follow Prettier formatting rules
- Write meaningful commit messages
- Document new features and changes

## 🐛 Bug Reports

To report a bug:
1. Check existing issues
2. Create detailed bug report
3. Include steps to reproduce
4. Add relevant screenshots or logs

## 💡 Feature Requests

To request a new feature:
1. Check existing requests
2. Create detailed feature request
3. Explain the use case
4. Suggest implementation approach

## 📞 Support

- **Documentation**: [Link to documentation]
- **Issues**: [GitHub Issues]
- **Email**: [support@pollirshad.com]
- **Discord**: [Community chat]

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI**: For AI-powered features
- **MongoDB**: For database services
- **Cloudinary**: For image hosting
- **Socket.io**: For real-time communication
- **Tailwind CSS**: For styling framework

## 📈 Future Roadmap

### Phase 1: Core Features ✅
- [x] Multi-vendor support
- [x] Product catalog
- [x] Order management
- [x] User authentication
- [x] Admin dashboard

### Phase 2: Enhanced Features 🔄
- [ ] Mobile app development
- [ ] Advanced analytics
- [ ] Marketing tools
- [ ] Loyalty program
- [ ] Review system

### Phase 3: AI & ML 🚀
- [ ] Advanced recommendation engine
- [ ] Predictive analytics
- [ ] Automated customer support
- [ ] Dynamic pricing
- [ ] Inventory optimization

### Phase 4: Scale & Optimize 📊
- [ ] Microservices architecture
- [ ] CDN integration
- [ ] Advanced caching
- [ ] Performance optimization
- [ ] Global deployment

---

**Made with ❤️ for the local business community**

For more information, visit our [website](https://pollirshad.com) or contact us at [info@pollirshad.com](mailto:info@pollirshad.com).