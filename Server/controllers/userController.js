const emailService = require("../services/emailService");

const getOrCreateUser = async (req, res) => {
  try {
    console.log("\n=== GET OR CREATE USER ===");
    console.log("📝 Firebase UID:", req.user.uid);
    console.log("📝 Email:", req.user.email);
    console.log("📝 Name:", req.user.name);

    const User = req.app.locals.models.User;
    
    console.log("🔍 Searching for user by Firebase UID...");
    let user = await User.findByFirebaseUid(req.user.uid);

    if (user) {
      console.log("✅ User found in database:");
      console.log("   _id:", user._id);
      console.log("   Email:", user.email);
      console.log("   Role:", user.role);
      console.log("   Firebase UID:", user.firebaseUid);
    } else {
      console.log("❌ User NOT found by Firebase UID");
      console.log("🔍 Checking if user exists by email...");
      
      const existingUser = await User.findByEmail(req.user.email);
      if (existingUser) {
        console.log("⚠️  User exists with this email but different Firebase UID!");
        console.log("   Existing Firebase UID:", existingUser.firebaseUid);
        console.log("   Current Firebase UID:", req.user.uid);
        console.log("   This user needs Firebase UID update!");
        
        // Update the Firebase UID
        await User.collection.updateOne(
          { email: req.user.email },
          { $set: { firebaseUid: req.user.uid, updatedAt: new Date() } }
        );
        
        user = await User.findByFirebaseUid(req.user.uid);
        console.log("✅ Firebase UID updated. User role:", user.role);
      } else {
        // For regular users, default to customer.
        // For the main admin email, we force role = admin at creation.
        const isRootAdminEmail = req.user.email === "admin@bazarbd.com";

        console.log(
          `📝 Creating new user with role: ${isRootAdminEmail ? "admin" : "customer"}`,
        );

        const newUser = await User.create({
          firebaseUid: req.user.uid,
          firstName: req.user.name?.split(" ")[0] || "",
          lastName: req.user.name?.split(" ").slice(1).join(" ") || "",
          email: req.user.email,
          role: isRootAdminEmail ? "admin" : "customer",
        });

        user = newUser;
        console.log("✅ New user created:", user._id);

        // Send welcome email to new user
        try {
          await emailService.sendWelcomeEmail({
            userEmail: req.user.email,
            userName: req.user.name || req.user.email.split("@")[0],
          });
          console.log("✅ Welcome email sent");
        } catch (emailError) {
          console.error("⚠️ Failed to send welcome email:", emailError.message);
        }
      }
    }

    // 🔒 Enforce database-based role for the root admin user
    // This guarantees that admin@bazarbd.com is ALWAYS an admin,
    // even if some old document or previous logic stored it as customer.
    if (user && user.email === "admin@bazarbd.com") {
      if (user.role !== "admin") {
        console.log(
          "⚙️ Forcing role=admin for root admin user (admin@bazarbd.com). Previous role:",
          user.role,
        );

        try {
          // Update role + permissions in DB using our model helper
          await User.updateRole(user.firebaseUid, "admin", "system");

          // Reload fresh copy from DB so what we return matches DB state
          user = await User.findByFirebaseUid(user.firebaseUid);
          console.log("✅ Root admin user updated to role:", user.role);
        } catch (roleError) {
          console.error(
            "❌ Failed to force admin role for root admin user:",
            roleError,
          );
        }
      }
    }

    console.log("📤 Returning user with role:", user.role);
    console.log("=== END GET OR CREATE USER ===\n");
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("❌ Error in getOrCreateUser:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getUserStatus = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    const user = await User.findByFirebaseUid(req.user.uid);

    res.json({
      success: true,
      data: {
        firebaseUid: req.user.uid,
        email: req.user.email,
        name: req.user.name,
        dbUser: user,
        isAdmin: user?.role === "admin",
        hasUser: !!user,
      },
    });
  } catch (error) {
    console.error("❌ Error in getUserStatus:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getOrCreateUser, getUserStatus };
