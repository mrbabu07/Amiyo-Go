const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Check if Firebase credentials are configured
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("\n❌ Firebase Admin SDK not configured!");
    console.error("Please configure the following in Server/.env:");
    console.error("  - FIREBASE_PROJECT_ID");
    console.error("  - FIREBASE_CLIENT_EMAIL");
    console.error("  - FIREBASE_PRIVATE_KEY");
    console.error("\nSee BACKEND_FIREBASE_SETUP.md for instructions.\n");
    process.exit(1);
  }

  if (projectId.includes("your_project_id") || clientEmail.includes("xxxxx")) {
    console.error("\n❌ Firebase credentials are still placeholder values!");
    console.error(
      "Please replace them with actual values from Firebase Console."
    );
    console.error(
      "See BACKEND_FIREBASE_SETUP.md for step-by-step instructions.\n"
    );
    process.exit(1);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
    console.log("✅ Firebase Admin SDK initialized");
  } catch (error) {
    console.error("\n❌ Failed to initialize Firebase Admin SDK");
    console.error("Error:", error.message);
    console.error("\nCommon issues:");
    console.error("  1. FIREBASE_PRIVATE_KEY must be wrapped in quotes");
    console.error("  2. Keep \\n as text (don't replace with actual newlines)");
    console.error("  3. Copy the entire private_key value from the JSON file");
    console.error(
      "\nSee BACKEND_FIREBASE_SETUP.md for detailed instructions.\n"
    );
    process.exit(1);
  }
}

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: "No token provided" });
    }

    console.log('\n🔐 VERIFY TOKEN');
    console.log('   Token received:', token.substring(0, 20) + '...');
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('   ✅ Token verified for UID:', decodedToken.uid);
    req.user = decodedToken;
    
    // Fetch user from database to get MongoDB _id
    const User = req.app.locals.models.User;
    console.log('   🔎 Looking up user in database...');
    const dbUser = await User.findByFirebaseUid(decodedToken.uid);
    
    if (dbUser) {
      console.log('   ✅ User found:', dbUser.email);
      console.log('   ✅ Setting req.user._id:', dbUser._id);
      console.log('   ✅ Setting req.user.role:', dbUser.role);
      req.user._id = dbUser._id;
      req.user.role = dbUser.role;
      req.dbUser = dbUser;

      // If user is a vendor, fetch and attach vendorId
      if (dbUser.role === "vendor") {
        const Vendor = req.app.locals.models.Vendor;
        const vendor = await Vendor.findByUserId(dbUser._id);
        if (vendor) {
          console.log('   ✅ Vendor found, setting vendorId:', vendor._id);
          req.user.vendorId = vendor._id;
          req.vendor = vendor;
        }
      }
    } else {
      console.log('   ⚠️  User not found in database for UID:', decodedToken.uid);
    }
    
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    const User = req.app.locals.models.User;
    const user = await User.findByFirebaseUid(req.user.uid);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.dbUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Authorization failed" });
  }
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
          error: `${role.charAt(0).toUpperCase() + role.slice(1)} access required` 
        });
      }

      req.dbUser = user;
      req.user._id = user._id;
      req.user.role = user.role;

      // If role is vendor, fetch and attach vendorId
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
      console.error("requireRole error:", error);
      return res.status(500).json({ error: "Authorization failed" });
    }
  };
};

const requireApprovedVendor = async (req, res, next) => {
  try {
    const User = req.app.locals.models.User;
    const Vendor = req.app.locals.models.Vendor;

    const user = await User.findByFirebaseUid(req.user.uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await Vendor.findByUserId(user._id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor profile not found" });
    }

    if (vendor.status !== "approved") {
      return res.status(403).json({ 
        error: "Your vendor account is not approved yet",
        status: vendor.status 
      });
    }

    req.dbUser = user;
    req.user._id = user._id;
    req.vendor = vendor;
    next();
  } catch (error) {
    console.error("Vendor authorization error:", error);
    return res.status(500).json({ error: "Authorization failed" });
  }
};

module.exports = { verifyToken, verifyAdmin, requireRole, requireApprovedVendor };
