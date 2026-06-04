const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken, verifyAdmin } = require("../../middleware/auth");

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get("/", async (req, res) => {
  try {
    const collection = req.app.locals.db.collection("audit_logs");
    const {
      actorId,
      action,
      resource,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = req.query;
    const query = {};

    if (actorId) {
      query.$or = [
        { actorId: String(actorId) },
        { "actor.userId": String(actorId) },
      ];
    }
    if (action) query.action = { $regex: String(action), $options: "i" };
    if (resource) {
      query.$or = [
        ...(query.$or || []),
        { resource: String(resource) },
        { "target.type": String(resource) },
      ];
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
    const [logs, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid audit id" });
    }
    const log = await req.app.locals.db.collection("audit_logs").findOne({ _id: new ObjectId(req.params.id) });
    if (!log) return res.status(404).json({ success: false, error: "Audit log not found" });
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
