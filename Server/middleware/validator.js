const { body, param, query, validationResult } = require("express-validator");

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

// Product validation rules
const validateProduct = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  handleValidationErrors,
];

// Order validation rules
const validateOrder = [
  body("products").isArray({ min: 1 }).withMessage("Products array is required"),
  body("shippingInfo.name").trim().notEmpty().withMessage("Shipping name is required"),
  body("shippingInfo.phone").trim().notEmpty().withMessage("Phone number is required"),
  body("shippingInfo.address").trim().notEmpty().withMessage("Address is required"),
  handleValidationErrors,
];

// User registration validation
const validateUserRegistration = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("displayName").trim().notEmpty().withMessage("Display name is required"),
  handleValidationErrors,
];

// Review validation
const validateReview = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").trim().notEmpty().withMessage("Comment is required"),
  handleValidationErrors,
];

// Coupon validation
const validateCoupon = [
  body("code").trim().notEmpty().withMessage("Coupon code is required"),
  body("discount").isFloat({ min: 0, max: 100 }).withMessage("Discount must be between 0 and 100"),
  body("expiryDate").isISO8601().withMessage("Valid expiry date is required"),
  handleValidationErrors,
];

// Payment validation
const validatePayment = [
  body("orderId").trim().notEmpty().withMessage("Order ID is required"),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
  body("paymentMethod").isIn(["stripe", "bkash", "nagad", "cod"]).withMessage("Invalid payment method"),
  handleValidationErrors,
];

// ID parameter validation
const validateObjectId = [
  param("id").isLength({ min: 24, max: 24 }).withMessage("Invalid ID format"),
  handleValidationErrors,
];

// Pagination validation
const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateProduct,
  validateOrder,
  validateUserRegistration,
  validateReview,
  validateCoupon,
  validatePayment,
  validateObjectId,
  validatePagination,
};
