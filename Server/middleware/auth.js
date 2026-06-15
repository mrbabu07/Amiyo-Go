const admin = require("firebase-admin");
const {
  isStaffRole,
  roleCan,
  resolvePermissionFromRequest,
} = require("../config/permissions");
const { getScopeFromUser } = require("../utils/logisticsScope");

const debugAuth = process.env.DEBUG_AUTH === "true";
const authDebug = (...args) => {
  if (debugAuth) console.log(...args);
};

let firebaseInitError = null;

const hasFirebaseConfig = () =>
  Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );

// Initialize Firebase Admin
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    firebaseInitError = new Error("Firebase Admin SDK is not configured.");
    console.error(firebaseInitError.message);
  } else if (projectId.includes("your_project_id") || clientEmail.includes("xxxxx")) {
    firebaseInitError = new Error("Firebase credentials are still placeholder values.");
    console.error(firebaseInitError.message);
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
      console.log("Firebase Admin SDK initialized");
    } catch (error) {
      firebaseInitError = error;
      console.error("\nFailed to initialize Firebase Admin SDK");
      console.error("Error:", error.message);
      console.error("Common issue: FIREBASE_PRIVATE_KEY must keep escaped \\n characters.");
    }
  }
}

const requireFirebaseAdmin = (res) => {
  if (admin.apps.length && hasFirebaseConfig() && !firebaseInitError) {
    return true;
  }

  res.status(503).json({
    error: "Authentication service is not configured",
    missing: ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]
      .filter((key) => !process.env[key]),
  });
  return false;
};

const attachDatabaseUser = async (req, decodedToken) => {
  const User = req.app.locals.models.User;
  const dbUser = await User.findByFirebaseUid(decodedToken.uid);

  if (!dbUser) {
    authDebug("Authenticated Firebase user has no local user record");
    return null;
  }

  req.user._id = dbUser._id;
  req.user.role = dbUser.role;
  req.dbUser = dbUser;
  authDebug("Authenticated role:", dbUser.role);

  if (dbUser.role === "vendor") {
    const Vendor = req.app.locals.models.Vendor;
    const vendor = await Vendor.findByUserId(dbUser._id);
    if (vendor) {
      req.user.vendorId = vendor._id;
      req.vendor = vendor;
      authDebug("Vendor context attached");
    }
  }

  if (dbUser.role === "vendor_staff") {
    const VendorStaff = req.app.locals.models.VendorStaff;
    const Vendor = req.app.locals.models.Vendor;
    const staff = VendorStaff ? await VendorStaff.findActiveForUser(dbUser) : null;
    const vendor = staff ? await Vendor.findById(staff.vendorId) : null;
    if (staff && vendor) {
      req.user.vendorId = vendor._id;
      req.user.vendorPermissions = staff.permissions || [];
      req.vendor = vendor;
      req.vendorStaff = staff;
      authDebug("Vendor staff context attached");
    }
  }

  if (dbUser.role === "logistics_manager") {
    req.user.logisticsScope = getScopeFromUser(dbUser);
    req.logisticsScope = req.user.logisticsScope;
    authDebug("Logistics scope attached");
  }

  return dbUser;
};

const verifyToken = async (req, res, next) => {
  try {
    if (!requireFirebaseAdmin(res)) return;

    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    authDebug("Verifying Firebase auth token");
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    await attachDatabaseUser(req, decodedToken);
    next();
  } catch (error) {
    if (debugAuth) console.error("Token verification error:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

const verifyOptionalToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return next();
    if (!admin.apps.length || firebaseInitError) return next();

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    await attachDatabaseUser(req, decodedToken);
  } catch (error) {
    if (debugAuth) console.error("Optional token verification skipped:", error.message);
  }
  next();
};

const verifyAdmin = async (req, res, next) => {
  try {
    const User = req.app.locals.models.User;
    const Permission = req.app.locals.models.Permission;

    if (!req.user?.uid) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.dbUser || await User.findByFirebaseUid(req.user.uid);

    if (!user || !isStaffRole(user.role)) {
      return res.status(403).json({ error: "Admin or staff access required" });
    }

    const requestPath = `${req.baseUrl || ""}${req.path || ""}`;
    if (user.role === "logistics_manager" && !requestPath.includes("/admin/logistics")) {
      return res.status(403).json({ error: "Logistics staff can only access the logistics workspace" });
    }

    const permission = resolvePermissionFromRequest(req);
    const permissionDoc = Permission ? await Permission.findByRole(user.role) : null;

    if (!roleCan(user, permission.resource, permission.action, permissionDoc)) {
      return res.status(403).json({
        error: "Permission denied",
        required: permission,
        role: user.role,
      });
    }

    req.dbUser = user;
    req.user._id = user._id;
    req.user.role = user.role;
    if (user.role === "logistics_manager") {
      req.user.logisticsScope = getScopeFromUser(user);
      req.logisticsScope = req.user.logisticsScope;
    }
    next();
  } catch {
    return res.status(500).json({ error: "Authorization failed" });
  }
};

const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const User = req.app.locals.models.User;
      const Permission = req.app.locals.models.Permission;

      if (!req.user?.uid) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.dbUser || await User.findByFirebaseUid(req.user.uid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const permissionDoc = Permission ? await Permission.findByRole(user.role) : null;
      if (!roleCan(user, resource, action, permissionDoc)) {
        return res.status(403).json({
          error: "Permission denied",
          required: { resource, action },
          role: user.role,
        });
      }

      req.dbUser = user;
      req.user._id = user._id;
      req.user.role = user.role;
      next();
    } catch (error) {
      if (debugAuth) console.error("Permission authorization error:", error);
      return res.status(500).json({ error: "Authorization failed" });
    }
  };
};

const requireRole = (role) => {
  return async (req, res, next) => {
    try {
      const User = req.app.locals.models.User;
      const user = await User.findByFirebaseUid(req.user.uid);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role !== role && user.role !== "admin") {
        return res.status(403).json({
          error: `${role.charAt(0).toUpperCase() + role.slice(1)} access required`,
        });
      }

      req.dbUser = user;
      req.user._id = user._id;
      req.user.role = user.role;

      if (role === "vendor" || user.role === "vendor") {
        const Vendor = req.app.locals.models.Vendor;
        const vendor = await Vendor.findByUserId(user._id);
        if (vendor) {
          req.user.vendorId = vendor._id;
          req.vendor = vendor;
        }
      }

      next();
    } catch (error) {
      if (debugAuth) console.error("Role authorization error:", error);
      return res.status(500).json({ error: "Authorization failed" });
    }
  };
};

const requireApprovedVendor = async (req, res, next) => {
  try {
    const User = req.app.locals.models.User;
    const Vendor = req.app.locals.models.Vendor;
    const VendorStaff = req.app.locals.models.VendorStaff;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let vendor = await Vendor.findByUserId(user._id);
    let staff = null;
    if (!vendor && user.role === "vendor_staff" && VendorStaff) {
      staff = await VendorStaff.findActiveForUser(user);
      vendor = staff ? await Vendor.findById(staff.vendorId) : null;
    }

    if (!vendor) {
      return res.status(404).json({ error: "Vendor profile not found" });
    }

    if (vendor.status !== "approved") {
      return res.status(403).json({
        error: "Your vendor account is not approved yet",
        status: vendor.status,
      });
    }

    req.dbUser = user;
    req.user._id = user._id;
    req.user.role = user.role;
    req.user.vendorId = vendor._id;
    req.user.vendorPermissions = staff?.permissions || [];
    req.vendor = vendor;
    req.vendorStaff = staff;
    next();
  } catch (error) {
    if (debugAuth) console.error("Vendor authorization error:", error);
    return res.status(500).json({ error: "Authorization failed" });
  }
};

const requireVendorPermission = (permission) => {
  return (req, res, next) => {
    if (!req.vendorStaff) return next();

    const permissions = req.vendorStaff.permissions || [];
    const [resource, action] = permission.split(":");
    const allowed =
      permissions.includes("*") ||
      permissions.includes(permission) ||
      permissions.includes(`${resource}:*`) ||
      (action === "view" && permissions.includes(`${resource}:manage`)) ||
      (action === "view" && permissions.includes(`${resource}:ship`));

    if (!allowed) {
      return res.status(403).json({
        error: "Vendor staff permission denied",
        required: permission,
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  verifyOptionalToken,
  verifyAdmin,
  requireRole,
  requireApprovedVendor,
  requirePermission,
  requireVendorPermission,
};
