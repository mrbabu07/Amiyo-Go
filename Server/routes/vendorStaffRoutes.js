const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, requireApprovedVendor, requireVendorPermission } = require("../middleware/auth");
const {
  buildVendorStaffAuditEntry,
  summarizeStaffAuditEntry,
} = require("../utils/vendorStaffAudit");

const router = express.Router();

const writeStaffAudit = async (req, payload) => {
  try {
    const entry = buildVendorStaffAuditEntry({
      vendorId: req.vendor._id,
      actorId: req.user?.uid,
      ...payload,
    });

    await req.app.locals.db.collection("vendor_staff_audit_logs").insertOne({
      ...entry,
      summary: summarizeStaffAuditEntry(entry),
    });
  } catch (error) {
    console.error("Failed to write vendor staff audit:", error.message);
  }
};

const assertOwner = (req, res, next) => {
  if (req.vendorStaff) {
    return res.status(403).json({ success: false, error: "Only the vendor owner can manage staff" });
  }
  next();
};

router.use(verifyToken, requireApprovedVendor);

router.get("/audit", requireVendorPermission("staff:manage"), assertOwner, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 40), 100);
    const query = { vendorId: req.vendor._id.toString() };
    if (req.query.staffId) query.staffId = String(req.query.staffId);

    const logs = await req.app.locals.db
      .collection("vendor_staff_audit_logs")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error loading vendor staff audit:", error);
    res.status(500).json({ success: false, error: "Failed to load staff audit history" });
  }
});

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

    await writeStaffAudit(req, {
      action: "staff.invited",
      before: null,
      after: staff,
      metadata: { email, userLinked: Boolean(existingUser) },
    });

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

    if (!staff || staff.vendorId?.toString?.() !== req.vendor._id.toString()) {
      return res.status(404).json({ success: false, error: "Staff account not found" });
    }

    const update = {};
    if (req.body.name !== undefined) update.name = req.body.name;
    if (req.body.permissions !== undefined) update.permissions = req.body.permissions;
    if (req.body.status !== undefined) update.status = req.body.status;

    await VendorStaff.update(req.params.id, update);
    const updated = await VendorStaff.findById(req.params.id);

    if (updated?.userId && req.body.permissions !== undefined) {
      const User = req.app.locals.models.User;
      if (User?.collection) {
        const userId = updated.userId.toString();
        const userQuery = ObjectId.isValid(userId)
          ? { $or: [{ _id: new ObjectId(userId) }, { _id: userId }] }
          : { _id: userId };

        await User.collection.updateOne(
          userQuery,
          {
            $set: {
              permissions: { vendor: updated.permissions || [] },
              updatedAt: new Date(),
              updatedBy: req.user.uid,
            },
          },
        ).catch(() => null);
      }
    }

    await writeStaffAudit(req, {
      action: "staff.updated",
      before: staff,
      after: updated,
      metadata: { staffId: req.params.id },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating vendor staff:", error);
    res.status(500).json({ success: false, error: "Failed to update staff account" });
  }
});

router.delete("/:id", requireVendorPermission("staff:manage"), assertOwner, async (req, res) => {
  try {
    const VendorStaff = req.app.locals.models.VendorStaff;
    const staff = await VendorStaff.findById(req.params.id);

    if (!staff || staff.vendorId?.toString?.() !== req.vendor._id.toString()) {
      return res.status(404).json({ success: false, error: "Staff account not found" });
    }

    await VendorStaff.remove(req.params.id, req.vendor._id);
    const removed = await VendorStaff.findById(req.params.id);

    await writeStaffAudit(req, {
      action: "staff.removed",
      before: staff,
      after: removed || { ...staff, status: "removed" },
      metadata: { staffId: req.params.id },
    });

    res.json({ success: true, message: "Staff account removed" });
  } catch (error) {
    console.error("Error removing vendor staff:", error);
    res.status(500).json({ success: false, error: "Failed to remove staff account" });
  }
});

module.exports = router;
