const {
  verifyToken,
  verifyAdmin,
  requirePermission,
  requireRole,
} = require("./auth");

const adminAuth = [verifyToken, verifyAdmin];

module.exports = {
  adminAuth,
  verifyToken,
  verifyAdmin,
  requirePermission,
  requireRole,
};
