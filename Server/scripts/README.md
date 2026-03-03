# Server Scripts

This folder contains utility scripts for database seeding, testing, and server maintenance.

## 📜 Available Scripts

### Database Seeding

#### `seed.js`

Seeds basic data (products, categories, users).

```bash
npm run seed
```

**What it does:**

- Clears existing products and categories
- Creates 4 categories (Men's, Women's, Electronics, Baby)
- Creates 16 sample products with images, sizes, colors
- Perfect for initial setup

---

#### `seedAll.js`

Seeds all advanced features (flash sales, stock alerts, loyalty accounts, recommendations).

```bash
npm run seed:all
```

**What it does:**

- Creates 3 flash sales (active, upcoming)
- Creates 4 stock alerts for test users
- Creates 3 loyalty accounts (Bronze, Silver, Gold, Platinum tiers)
- Creates recommendation records
- **Note**: Run `seed.js` first to create products

---

#### `seedFlashSales.js`

Seeds flash sales only with detailed timing.

```bash
npm run seed:flash
```

**What it does:**

- Creates 8 flash sales with different statuses:
  - Active sales (happening now)
  - Upcoming sales (starting soon)
  - Various discount percentages (35-60% off)
- Links to existing products
- Shows detailed summary with timing

---

### Testing & Debugging

#### `checkFlashSales.js`

Checks the status of all flash sales in the database.

```bash
npm run check:flash
```

**What it shows:**

- Total flash sales count
- Active sales (live now)
- Upcoming sales (scheduled)
- Expired sales
- Sold out sales
- Time remaining for each sale
- Stock information

---

#### `testFlashSalesAPI.js`

Tests all flash sales API endpoints.

```bash
npm run test:flash
```

**What it tests:**

- GET /api/flash-sales (all sales)
- GET /api/flash-sales/active
- GET /api/flash-sales/upcoming
- GET /api/flash-sales/:id
- POST /api/flash-sales (create)
- PUT /api/flash-sales/:id (update)
- DELETE /api/flash-sales/:id
- POST /api/flash-sales/:id/purchase

---

#### `testAllAPIs.js`

Tests all backend API endpoints.

```bash
npm run test:all
```

**What it tests:**

- Public endpoints (products, categories, flash sales, etc.)
- Protected endpoints (should return 401 without auth)
- Shows pass/fail status for each endpoint
- Displays success rate

---

#### `test-server.js`

Runs a minimal test server for debugging.

```bash
npm run test:server
```

**What it does:**

- Starts a simple Express server on port 5000
- Provides test routes for debugging
- Useful for isolating server issues

---

### User Management

#### `makeAdmin.js`

Makes a user an admin by email.

```bash
npm run make:admin your-email@example.com
```

**Usage:**

```bash
# Example
npm run make:admin john@example.com
```

**What it does:**

- Finds user by email
- Updates role to 'admin'
- Grants access to admin panel
- **Note**: User must have logged in at least once

---

## 🔄 Common Workflows

### Initial Setup

```bash
# 1. Seed basic data
npm run seed

# 2. Seed all features
npm run seed:all

# 3. Make yourself admin
npm run make:admin your-email@example.com
```

### Testing

```bash
# Check if flash sales are working
npm run check:flash

# Test all API endpoints
npm run test:all

# Test flash sales specifically
npm run test:flash
```

### Maintenance

```bash
# Re-seed flash sales (if expired)
npm run seed:flash

# Check flash sale status
npm run check:flash
```

---

## 📝 Script Details

### File Locations

All scripts are in `Server/scripts/` folder and use relative paths:

- Models: `../models/`
- Environment: `../.env`

### Database Connection

All scripts connect to MongoDB using `MONGO_URI` from `.env` file.

### Error Handling

Scripts include:

- Connection error handling
- Validation checks
- Helpful error messages
- Exit codes (0 = success, 1 = error)

---

## 🎯 Tips

1. **Always run `seed.js` before `seedAll.js`** - seedAll needs products to exist
2. **Check flash sales regularly** - they expire based on time
3. **Use test scripts** - verify everything works before deploying
4. **Make admin after registration** - register in frontend first, then run makeAdmin
5. **Re-seed if needed** - safe to run multiple times (clears old data)

---

## 🐛 Troubleshooting

### "No products found"

Run `npm run seed` first to create products.

### "User not found"

Make sure the user has logged in at least once in the frontend.

### "Connection failed"

Check your `MONGO_URI` in `.env` file.

### "Flash sales expired"

Run `npm run seed:flash` to create new flash sales.

---

## 📚 Related Documentation

- Main README: `/README.md`
- Folder Structure: `/FOLDER_STRUCTURE.md`
- API Documentation: See README.md

---

**Last Updated**: January 2026
