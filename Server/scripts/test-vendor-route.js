// Diagnostic script - test that all models load correctly
try {
  const VendorOrder = require('../models/VendorOrder');
  console.log('VendorOrder model loaded OK:', typeof VendorOrder);
} catch(e) {
  console.error('VendorOrder load error:', e.message);
}

try {
  const vendorsFinanceController = require('../controllers/vendorsFinanceController');
  console.log('vendorsFinanceController loaded OK:', Object.keys(vendorsFinanceController));
} catch(e) {
  console.error('vendorsFinanceController load error:', e.message);
}

try {
  const vendorDashboardController = require('../controllers/vendorDashboardController');
  console.log('vendorDashboardController loaded OK:', Object.keys(vendorDashboardController));
} catch(e) {
  console.error('vendorDashboardController load error:', e.message);
}

try {
  const vendorRoutes = require('../routes/vendorRoutes');
  console.log('vendorRoutes loaded OK:', typeof vendorRoutes);
} catch(e) {
  console.error('vendorRoutes load error:', e.message);
}

console.log('All checks done.');
