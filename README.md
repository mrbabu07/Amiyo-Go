# 🛍️ HnilaBazar - Modern E-Commerce Platform

A full-featured e-commerce platform built with React, Node.js, Express, and MongoDB. Features include flash sales, loyalty rewards, product recommendations, stock alerts, and comprehensive admin dashboard.

## 📁 Project Structure

```
HnilaBazar/
├── Client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React Context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API services
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
│
├── Server/                # Node.js/Express backend
│   ├── controllers/      # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── scripts/         # Utility scripts (seed, test)
│   └── uploads/         # Uploaded files
│
├── FOLDER_STRUCTURE.md   # Detailed folder structure
└── README.md            # This file
```

For detailed folder structure documentation, see [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Firebase account (for authentication)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd HnilaBazar
   ```

2. **Setup Server**

   ```bash
   cd Server
   npm install
   cp .env.example .env
   # Edit .env with your MongoDB URI and Firebase credentials
   npm run seed        # Seed database with sample products
   npm run seed:all    # Seed flash sales, alerts, loyalty data
   npm run dev         # Start server on port 5000
   ```

3. **Setup Client**

   ```bash
   cd Client
   npm install
   cp .env.example .env.local
   # Edit .env.local with API URL and Firebase config
   npm run dev         # Start client on port 5173
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000
   - Admin Panel: http://localhost:5173/admin

### Create Admin User

```bash
cd Server
npm run make:admin your-email@example.com
# User must have registered/logged in at least once
```

---

## ✨ Features

### 🛒 Customer Features

#### Shopping Experience

- **Product Catalog** - Browse products with advanced filters and sorting
- **Product Search** - Real-time search with suggestions
- **Product Details** - Image gallery, reviews, recommendations
- **Shopping Cart** - Add, update, remove items with size/color selection
- **Wishlist** - Save favorite products for later
- **Product Comparison** - Compare up to 4 products side-by-side
- **Recently Viewed** - Track browsing history

#### Deals & Rewards

- **⚡ Flash Sales** - Limited-time deals with countdown timers and stock tracking
- **🎁 Loyalty Program** - 4-tier system (Bronze, Silver, Gold, Platinum)
  - Earn points on purchases (1 point = $1)
  - Tier multipliers (1x to 3x)
  - Referral bonuses (500 points for referrer, 100 for new user)
  - Points redemption (100 points = $1)
  - Birthday bonuses
  - Leaderboard
- **🔔 Stock Alerts** - Get notified when products are back in stock or prices drop
- **🎯 Product Recommendations** - AI-powered suggestions (trending, similar, bought together)
- **🎫 Coupons** - Apply discount codes at checkout

#### Social & Communication

- **📱 Social Sharing** - Share products on Facebook, Twitter, WhatsApp, Pinterest, LinkedIn
- **⭐ Reviews & Ratings** - Rate and review products with images
- **💬 Live Chat** - Tawk.to integration for instant support
- **🎫 Support Tickets** - Create and track support requests

#### Account & Orders

- **📦 Order Management** - Place orders, track status, view history
- **🔄 Returns** - Request returns/refunds with tracking
- **📍 Address Book** - Save multiple shipping addresses
- **👤 Profile Management** - Update personal information
- **💳 Multiple Payment Methods** - Card, UPI, Cash on Delivery

#### User Experience

- **🌐 Multi-language** - English, Bengali, Hindi support
- **🌙 Dark Mode** - Toggle between light and dark themes
- **📱 PWA Support** - Install as mobile app, offline support
- **🔙 Navigation** - Back button on all pages, scroll to top
- **🎨 Modern UI** - Gradient backgrounds, smooth animations, responsive design

### 👨‍💼 Admin Features

#### Dashboard & Analytics

- **📊 Analytics Dashboard** - Real-time stats (sales, revenue, orders, customers)
- **📈 Customer Insights** - Behavior analytics, segmentation (New, Regular, VIP)
- **📉 Sales Charts** - Revenue trends, top products
- **🔔 Low Stock Alerts** - Automatic inventory warnings
- **📊 Stock Movement Tracker** - Track inventory changes

#### Product Management

- **📦 Product CRUD** - Create, read, update, delete products
- **🏷️ Category Management** - Organize products into categories
- **📸 Image Upload** - Multiple product images with ImgBB integration
- **📊 Inventory Management** - Track stock levels, import/export
- **⚡ Flash Sales** - Create time-limited deals with countdown timers

#### Order & Customer Management

- **📋 Order Management** - View, process, update order status
- **👥 User Management** - Manage customers, assign roles
- **🔄 Returns Management** - Handle return requests, approve/reject
- **💬 Support Tickets** - Respond to customer inquiries
- **⭐ Review Moderation** - Approve, reject, or delete reviews

#### Marketing & Promotions

- **🎫 Coupon Management** - Create discount codes with conditions
- **🎁 Offer Management** - Create promotional banners
- **⚡ Flash Sales** - Manage limited-time deals
- **🔔 Alert Management** - Monitor stock alerts, send notifications
- **🏆 Loyalty Statistics** - Track loyalty program performance

---

## 🔧 Environment Variables

### Server (.env)

```env
# Server Configuration
PORT=5000

# MongoDB
MONGO_URI=mongodb://localhost:27017/HnilaBazar
# Or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/HnilaBazar

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----\n"

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ImgBB API (for image uploads)
IMGBB_API_KEY=your-imgbb-api-key
```

### Client (.env.local)

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# ImgBB API (for image uploads)
VITE_IMGBB_API_KEY=your-imgbb-api-key
```

---

## 📚 API Documentation

### Public Endpoints

```
GET    /api/products                    # Get all products
GET    /api/products/:id                # Get product by ID
GET    /api/categories                  # Get all categories
GET    /api/flash-sales/active          # Get active flash sales
GET    /api/flash-sales/upcoming        # Get upcoming flash sales
GET    /api/recommendations/trending    # Get trending products
GET    /api/loyalty/leaderboard         # Get loyalty leaderboard
GET    /api/coupons                     # Get active coupons
GET    /api/offers                      # Get active offers
```

### Protected Endpoints (Require Authentication)

```
# Orders
POST   /api/orders                      # Create order
GET    /api/orders/my-orders            # Get user orders

# Wishlist
GET    /api/wishlist                    # Get user wishlist
POST   /api/wishlist                    # Add to wishlist
DELETE /api/wishlist/:productId         # Remove from wishlist

# Reviews
POST   /api/reviews                     # Create review
GET    /api/reviews/product/:productId  # Get product reviews

# Addresses
GET    /api/addresses                   # Get user addresses
POST   /api/addresses                   # Create address
PUT    /api/addresses/:id               # Update address
DELETE /api/addresses/:id               # Delete address

# Stock Alerts
POST   /api/stock-alerts/subscribe      # Subscribe to alert
GET    /api/stock-alerts/my-alerts      # Get user alerts
DELETE /api/stock-alerts/:id            # Delete alert

# Loyalty
GET    /api/loyalty/my-points           # Get user points
POST   /api/loyalty/redeem              # Redeem points
GET    /api/loyalty/history             # Get transaction history
POST   /api/loyalty/apply-referral      # Apply referral code

# Support
POST   /api/support/tickets             # Create support ticket
GET    /api/support/tickets/my-tickets  # Get user tickets
POST   /api/support/tickets/:id/messages # Add message to ticket

# Returns
POST   /api/returns                     # Create return request
GET    /api/returns/my-returns          # Get user returns
```

### Admin Endpoints (Require Admin Role)

```
# Products
POST   /api/products                    # Create product
PUT    /api/products/:id                # Update product
DELETE /api/products/:id                # Delete product

# Categories
POST   /api/categories                  # Create category
PUT    /api/categories/:id              # Update category
DELETE /api/categories/:id              # Delete category

# Orders
GET    /api/orders                      # Get all orders
PUT    /api/orders/:id/status           # Update order status

# Users
GET    /api/admin/users                 # Get all users
PUT    /api/admin/users/:id/role        # Update user role
DELETE /api/admin/users/:id             # Delete user

# Flash Sales
POST   /api/flash-sales                 # Create flash sale
PUT    /api/flash-sales/:id             # Update flash sale
DELETE /api/flash-sales/:id             # Delete flash sale

# Coupons
POST   /api/coupons                     # Create coupon
PUT    /api/coupons/:id                 # Update coupon
DELETE /api/coupons/:id                 # Delete coupon

# Analytics
GET    /api/admin/insights              # Get customer insights
GET    /api/admin/stats                 # Get dashboard stats

# Stock Alerts
GET    /api/stock-alerts/stats          # Get alert statistics
POST   /api/stock-alerts/check-and-send # Send pending alerts

# Loyalty
GET    /api/loyalty/stats               # Get loyalty statistics
POST   /api/loyalty/birthday-bonus      # Award birthday bonus

# Support
GET    /api/support/tickets             # Get all tickets
PUT    /api/support/tickets/:id/status  # Update ticket status

# Returns
GET    /api/returns/admin               # Get all returns
PUT    /api/returns/:id/status          # Update return status
```

---

## 🛠️ Available Scripts

### Server Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with nodemon
npm run seed           # Seed database with sample products
node seedAll.js        # Seed all data (flash sales, alerts, loyalty)
node makeAdmin.js      # Create admin user
node checkFlashSales.js # Check flash sales status
node testAllAPIs.js    # Test all API endpoints
```

### Client Scripts

```bash
npm run dev            # Start development server (Vite)
npm run build          # Build for production
npm run preview        # Preview production build
npm run lint           # Run ESLint
```

### Database Seeding

```bash
# Manual seeding
cd Server
npm run seed           # Basic data (products, categories, users)
npm run seed:all       # All features (flash sales, loyalty, etc.)
```

cd Server
npm run seed # Seed products
node seedAll.js # Seed flash sales, alerts, loyalty data

````

---

## 🎨 Tech Stack

### Frontend

| Technology          | Purpose                     |
| ------------------- | --------------------------- |
| **React 18**        | UI library                  |
| **Vite**            | Build tool & dev server     |
| **Tailwind CSS**    | Utility-first CSS framework |
| **React Router v6** | Client-side routing         |
| **Axios**           | HTTP client                 |
| **i18next**         | Internationalization        |
| **Firebase Auth**   | User authentication         |
| **React Context**   | State management            |
| **Lucide React**    | Icon library                |

### Backend

| Technology         | Purpose              |
| ------------------ | -------------------- |
| **Node.js**        | JavaScript runtime   |
| **Express**        | Web framework        |
| **MongoDB**        | NoSQL database       |
| **Mongoose**       | MongoDB ODM          |
| **Firebase Admin** | Token verification   |
| **Multer**         | File upload handling |
| **Nodemailer**     | Email service        |
| **ImgBB API**      | Image hosting        |

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. **User Registration/Login** - Firebase Authentication (Email/Password or Google OAuth)
2. **Token Generation** - Firebase generates JWT token
3. **API Requests** - Client sends token in `Authorization: Bearer <token>` header
4. **Token Verification** - Server verifies token using Firebase Admin SDK
5. **User Identification** - Extract user ID from verified token

### Role-Based Access Control

- **Customer** - Default role, access to shopping features
- **Admin** - Full access to admin panel and management features

### Protected Routes

**Frontend:**

- `/checkout` - Requires authentication
- `/orders` - Requires authentication
- `/profile` - Requires authentication
- `/admin/*` - Requires admin role

**Backend:**

- All `/api/admin/*` endpoints require admin role
- User-specific endpoints require authentication

---

## 📦 Database Models

| Model               | Description               | Key Fields                                       |
| ------------------- | ------------------------- | ------------------------------------------------ |
| **User**            | Customer & admin accounts | email, role, firebaseUid                         |
| **Product**         | Product catalog           | title, price, stock, images, category            |
| **Category**        | Product categories        | name, slug, description                          |
| **Order**           | Customer orders           | products, total, status, shipping                |
| **Review**          | Product reviews           | rating, comment, images, verified                |
| **Wishlist**        | User wishlists            | userId, products                                 |
| **Coupon**          | Discount codes            | code, discountType, value, conditions            |
| **FlashSale**       | Time-limited deals        | product, flashPrice, startTime, endTime, stock   |
| **StockAlert**      | Inventory alerts          | userId, productId, alertType, priceThreshold     |
| **Loyalty**         | Loyalty program           | userId, points, tier, transactions, referralCode |
| **Recommendation**  | Product recommendations   | userId, productId, type, score                   |
| **Address**         | Shipping addresses        | userId, name, phone, address, city, isDefault    |
| **Return**          | Return requests           | orderId, reason, status, refundAmount            |
| **SupportTicket**   | Customer support          | userId, subject, status, messages                |
| **Offer**           | Promotional banners       | title, image, link, startDate, endDate           |
| **CustomerInsight** | Analytics data            | userId, segment, preferences, behavior           |

---

## 🚀 Deployment

### Quick Deploy to Vercel (Recommended)

**📖 Complete Guide:** See [VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md) for detailed instructions

**✅ Checklist:** See [DEPLOY-CHECKLIST.md](./DEPLOY-CHECKLIST.md) for step-by-step checklist

#### Quick Steps:

1. **Push to GitHub**
   ```bash
   check-secrets.bat  # Verify security
   git push origin main
   ```

2. **Deploy Backend**
   - Create Vercel project → Root: `Server`
   - Add environment variables (MongoDB, Firebase, SMTP, etc.)
   - Deploy & copy backend URL

3. **Deploy Frontend**
   - Create Vercel project → Root: `Client` → Framework: Vite
   - Add environment variables (API URL, Firebase, etc.)
   - Deploy & copy frontend URL

4. **Update URLs**
   - Update backend `FRONTEND_URL` with frontend URL
   - Update Firebase authorized domains
   - Redeploy both projects

**Your MongoDB credentials stay secure in Vercel environment variables!** 🔒

---

### Alternative: Server Deployment (Railway/Render/Heroku)

1. **Prepare Environment**

   ```bash
   # Set environment variables in hosting dashboard
   PORT=5000
   MONGODB_URI=<your-mongodb-atlas-uri>
   FIREBASE_PROJECT_ID=<your-project-id>
   FIREBASE_CLIENT_EMAIL=<your-client-email>
   FIREBASE_PRIVATE_KEY=<your-private-key>
```

2. **Deploy**

   ```bash
   # Push to Git repository
   git push origin main

   # Or use CLI
   railway up  # For Railway
   render deploy  # For Render
   ```

3. **Post-Deployment**

   ```bash
   # Seed database (run once)
   npm run seed
   node seedAll.js

   # Create admin user
   node makeAdmin.js
   ```

### Alternative: Client Deployment (Netlify)

1. **Update Environment Variables**

   ```env
   VITE_API_URL=https://your-backend-url.com/api
   VITE_FIREBASE_API_KEY=<your-api-key>
   # ... other Firebase config
   ```

2. **Build**

   ```bash
   npm run build
   # Creates 'dist' folder
   ```

3. **Deploy**

   ```bash
   # Netlify
   netlify deploy --prod --dir=dist
   ```

4. **Configure Routing**
   - Add `_redirects` file for Netlify: `/* /index.html 200`
   - Vercel handles SPA routing automatically

### Database (MongoDB Atlas)

1. Create cluster at https://cloud.mongodb.com
2. Create database user
3. Whitelist IP addresses (0.0.0.0/0 for all)
4. Get connection string
5. Update `MONGODB_URI` in server environment

---

## 🧪 Testing

### Test Backend APIs

```bash
cd Server
node testAllAPIs.js
```

**Tests:**

- ✅ Public endpoints (products, categories, flash sales)
- ✅ Protected endpoints return 401 without auth
- ✅ All routes are registered

### Test Flash Sales

```bash
cd Server
node checkFlashSales.js
```

**Checks:**

- Active flash sales
- Upcoming flash sales
- Expired flash sales
- Stock levels

### Manual Testing Checklist

**Customer Features:**

- [ ] Register/Login with email
- [ ] Browse products and categories
- [ ] Add products to cart
- [ ] Apply coupon code
- [ ] Place order
- [ ] View order history
- [ ] Add product to wishlist
- [ ] Write product review
- [ ] Subscribe to stock alert
- [ ] Check loyalty points
- [ ] Redeem loyalty points
- [ ] Create support ticket

**Admin Features:**

- [ ] Login as admin
- [ ] View dashboard analytics
- [ ] Create/edit product
- [ ] Create flash sale
- [ ] Manage orders
- [ ] Manage users
- [ ] View customer insights
- [ ] Respond to support tickets

---

## 🐛 Troubleshooting

### Server Issues

**Server won't start**

```bash
# Check MongoDB connection
mongosh <your-connection-string>

# Check port availability
netstat -ano | findstr :5000

# Verify environment variables
cat .env
```

**Authentication errors**

```bash
# Verify Firebase credentials
# Check FIREBASE_PRIVATE_KEY has proper line breaks
# Ensure Firebase Admin SDK is initialized
```

**Database errors**

```bash
# Check MongoDB connection
# Verify database name in connection string
# Run seed scripts if database is empty
npm run seed
node seedAll.js
```

### Client Issues

**Client won't start**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Vite config
cat vite.config.js

# Verify API URL
cat .env.local
```

**API calls failing**

```bash
# Check VITE_API_URL in .env.local
# Ensure server is running
# Check browser console for CORS errors
# Verify Firebase token is being sent
```

**Build errors**

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Check for TypeScript errors
npm run lint

# Rebuild
npm run build
```

### Common Issues

**"Cannot read property 'success' of undefined"**

- Fixed: Using correct toast API (`success()` and `error()` directly)

**"Missing product ID in order items"**

- Fixed: Added cart validation in Checkout page

**Flash sales not showing**

- Run: `node seedAll.js` to seed flash sales data
- Check: Flash sales have valid start/end times

**Admin panel not accessible**

- Run: `node makeAdmin.js` to create admin user
- Verify: User has `role: "admin"` in database

---

## 📖 Feature Guides

### Flash Sales

**Customer View:** `/flash-sales`

- View active and upcoming flash sales
- Real-time countdown timers
- Stock progress bars
- Add to cart directly

**Admin Panel:** `/admin/flash-sales`

- Create new flash sales
- Set discount percentage
- Configure start/end times
- Set stock limits
- Track sales performance

### Loyalty Program

**Customer View:** `/loyalty`

- View points balance and tier
- See transaction history
- Access referral code
- View leaderboard
- Redeem points

**Tiers:**

- Bronze: 1x multiplier (0-999 points)
- Silver: 1.5x multiplier (1000-4999 points)
- Gold: 2x multiplier (5000-9999 points)
- Platinum: 3x multiplier (10000+ points)

**Earning Points:**

- $1 spent = 1 point (× tier multiplier)
- Referral: 500 points (referrer), 100 points (new user)
- Birthday: 1000 bonus points

**Redeeming:**

- 100 points = $1 discount
- Apply at checkout

### Stock Alerts

**Customer View:** `/my-alerts`

- Subscribe to back-in-stock alerts
- Set price drop thresholds
- Manage active alerts
- Receive email notifications

**Alert Types:**

- Back in stock
- Price drop (custom threshold)
- Low stock warning

### Product Recommendations

**Algorithms:**

1. **Trending** - Most viewed products
2. **Similar** - Same category products
3. **Also Viewed** - Frequently viewed together
4. **Bought Together** - Frequently purchased together
5. **Personalized** - Based on user history

**Display Locations:**

- Product detail pages
- Home page
- Cart page

---

## 🎨 Customization

### Theme Colors

Edit `Client/tailwind.config.js`:

```javascript
colors: {
  primary: {
    500: "#10B981",  // Main green
    600: "#059669",
    // ...
  },
  secondary: {
    500: "#3B82F6",  // Blue
    // ...
  },
  accent: {
    500: "#F59E0B",  // Orange/Yellow
    // ...
  }
}
```

### Languages

Add new language in `Client/src/i18n/locales/`:

1. Create `{language}.json` file
2. Add translations
3. Import in `Client/src/i18n/i18n.js`
4. Add to language switcher

### Email Templates

Edit `Server/services/emailService.js`:

```javascript
const emailTemplates = {
  orderConfirmation: (order) => `...`,
  stockAlert: (product) => `...`,
  // Add custom templates
};
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

### Code Style

- Use ESLint configuration
- Follow React best practices
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation

---

## 🔐 Security

### Before Pushing to Git

**⚠️ IMPORTANT:** Always run the security check before pushing:

```bash
check-secrets.bat
```

This verifies that your MongoDB credentials and other secrets are NOT being pushed to Git.

### Security Documentation

- **[READY-TO-PUSH.md](./READY-TO-PUSH.md)** - Quick verification before pushing
- **[QUICK-PUSH.md](./QUICK-PUSH.md)** - Fast reference guide
- **[SECURITY.md](./SECURITY.md)** - Complete security guide

### What's Protected

✅ MongoDB connection strings
✅ Firebase private keys
✅ SMTP passwords
✅ API keys
✅ VAPID keys
✅ SSL certificates

All sensitive data is in `.env` files which are protected by `.gitignore`.

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Support

- **Email:** support@hnilabazar.com
- **Documentation:** This README
- **Issues:** GitHub Issues
- **Live Chat:** Tawk.to widget on website

---

## 🙏 Acknowledgments

- **Firebase** - Authentication & hosting
- **MongoDB** - Database
- **Tawk.to** - Live chat widget
- **ImgBB** - Image hosting
- **Tailwind CSS** - Styling framework
- **React** - UI library
- **Vite** - Build tool
- **Express** - Backend framework

---

**Made with ❤️ by HnilaBazar Team**

**Version:** 2.0.0
**Last Updated:** January 2026
**Status:** Production Ready ✅
````
