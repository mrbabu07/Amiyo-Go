const express = require("express");
const { verifyToken, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");

const router = express.Router();

const assertOwner = (req, res, next) => {
  if (req.vendorStaff) {
    return res.status(403).json({ success: false, error: "Only the vendor owner can manage staff" });
  }
  next();
};

router.use(verifyToken, requireApprovedVendor);

router.get("/", requireVendorPermission("staff:manage"), assertOwner, async (req, res) => {
  try {
    const VendorStaff = req.app.locals.models.VendorStaff;
    const staff = await VendorStaff.findByVendorId(req.vendor._id);
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error("Error loading vendor staff:", error);
    res.status(500).json({ success: false, error: "Failed to load vendor staff" });
  }
});

router.post("/", requireVendorPermission("staff:manage"), assertOwner, async (req, res) => {
  try {
    const VendorStaff = req.app.locals.models.VendorStaff;
    const User = req.app.locals.models.User;
    const { email, name, permissions = ["orders:view", "orders:manage"] } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Staff email is required" });
    }

    const existingUser = await User.findByEmail(String(email).toLowerCase());
    const staff = await VendorStaff.create({
      vendorId: req.vendor._id,
      userId: existingUser?._id || null,
      email,
      name,
      permissions,
      invitedBy: req.user.uid,
    });

    if (existingUser && existingUser.role !== "vendor_staff") {
      await User.collection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            role: "vendor_staff",
            vendorId: req.vendor._id.toString(),
            permissions: { vendor: permissions },
            updatedAt: new Date(),
            updatedBy: req.user.uid,
          },
        },
      );
    }

    res.status(201).json({ success: true, data: staff });
  } catch (error) {
    const duplicate = error.code === 11000;
    res.status(duplicate ? 409 : 500).json({
      success: false,
      error: duplicate ? "This staff email is already invited" : "Failed to invite staff",
    });
  }
});

router.patch("/:id", requireVendorPermission("staff:manage"), assertOwner, async (req, res) => {
  try {
    const VendorStaff = req.app.locals.models.VendorStaff;
    const staff = await VendorStaff.findById(req.params.id);

    if (!staff || staff.vendorId !== req.vendor._id.toString()) {
      return res.status(404).json({ success: false, error: "Staff account not found" });
    }

    const update = {};
    if (req.body.name !== undefined) update.name = req.body.name;
    if (req.body.permissions !== undefined) update.permissions = req.body.permissions;
    if (req.body.status !== undefined) update.status = req.body.status;

    await VendorStaff.update(req.params.id, update);
    const updated = await VendorStaff.findById(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating vendor staff:", error);
    res.status(500).json({ success: false, error: "Failed to update staff account" });
  }
});

router.delete("/:id", requireVendorPermission("staff:manage"), assertOwner, async (req, res) => {
  try {
    const VendorStaff = req.app.locals.models.VendorStaff;
    await VendorStaff.remove(req.params.id, req.vendor._id);
    res.json({ success: true, message: "Staff account removed" });
  } catch (error) {
    console.error("Error removing vendor staff:", error);
    res.status(500).json({ success: false, error: "Failed to remove staff account" });
  }
});

module.exports = router;
