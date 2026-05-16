const { ObjectId } = require("mongodb");
const {
  TRANSPARENT_GIF,
  ensureNewsletterIndexes,
  makeToken,
  sendBroadcast,
} = require("../services/newsletterBroadcastService");

const subscribe = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }

    const now = new Date();
    const collection = req.app.locals.db.collection("newsletterSubscribers");
    await ensureNewsletterIndexes(req.app.locals.db);

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          source: req.body.source || "web",
          unsubscribeToken: makeToken(),
          createdAt: now,
        },
        $set: {
          isActive: true,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    res.json({
      success: true,
      message: "Subscribed successfully",
      data: result.value || result,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({ success: true, message: "Already subscribed" });
    }
    console.error("Newsletter subscribe error:", error);
    res.status(500).json({ success: false, error: "Failed to subscribe" });
  }
};

const listSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 50, status = "all" } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;
    const collection = req.app.locals.db.collection("newsletterSubscribers");
    const query = {};
    if (status === "active") query.isActive = { $ne: false };
    if (status === "unsubscribed") query.isActive = false;
    const [subscribers, total] = await Promise.all([
      collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      collection.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: subscribers,
      pagination: {
        page: pageNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Newsletter list error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch subscribers" });
  }
};

const createBroadcast = async (req, res) => {
  try {
    const subject = String(req.body.subject || "").trim();
    const html = String(req.body.html || req.body.body || "").trim();
    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
    const sendNow = Boolean(req.body.sendNow);

    if (!subject) {
      return res.status(400).json({ success: false, error: "Subject is required" });
    }
    if (!html) {
      return res.status(400).json({ success: false, error: "Newsletter body is required" });
    }
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ success: false, error: "scheduledAt must be a valid date" });
    }

    const db = req.app.locals.db;
    await ensureNewsletterIndexes(db);

    const now = new Date();
    const status = sendNow ? "draft" : scheduledAt && scheduledAt > now ? "scheduled" : "draft";
    const payload = {
      subject,
      html,
      previewText: String(req.body.previewText || "").trim(),
      scheduledAt: scheduledAt || null,
      status,
      recipientCount: 0,
      sentCount: 0,
      failedCount: 0,
      openCount: 0,
      createdBy: req.user?.uid || req.user?._id || "admin",
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("newsletterBroadcasts").insertOne(payload);
    let broadcast = await db.collection("newsletterBroadcasts").findOne({ _id: result.insertedId });

    if (sendNow) {
      broadcast = await sendBroadcast({
        app: req.app,
        broadcastId: result.insertedId.toString(),
        req,
      });
    }

    res.status(201).json({
      success: true,
      data: broadcast,
      message: sendNow ? "Newsletter broadcast sent" : "Newsletter broadcast saved",
    });
  } catch (error) {
    console.error("Newsletter broadcast create error:", error);
    res.status(500).json({ success: false, error: "Failed to create newsletter broadcast" });
  }
};

const listBroadcasts = async (req, res) => {
  try {
    const { page = 1, limit = 25, status = "all" } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const query = {};
    if (status !== "all") query.status = status;

    const collection = req.app.locals.db.collection("newsletterBroadcasts");
    const [broadcasts, total] = await Promise.all([
      collection.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).toArray(),
      collection.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: broadcasts,
      pagination: {
        page: pageNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Newsletter broadcasts list error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch newsletter broadcasts" });
  }
};

const getBroadcast = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid broadcast id" });
    }

    const db = req.app.locals.db;
    const broadcastId = new ObjectId(req.params.id);
    const [broadcast, recipients] = await Promise.all([
      db.collection("newsletterBroadcasts").findOne({ _id: broadcastId }),
      db.collection("newsletterBroadcastRecipients").find({ broadcastId }).sort({ createdAt: -1 }).limit(200).toArray(),
    ]);

    if (!broadcast) {
      return res.status(404).json({ success: false, error: "Newsletter broadcast not found" });
    }

    res.json({ success: true, data: { ...broadcast, recipients } });
  } catch (error) {
    console.error("Newsletter broadcast get error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch newsletter broadcast" });
  }
};

const sendBroadcastNow = async (req, res) => {
  try {
    const broadcast = await sendBroadcast({
      app: req.app,
      broadcastId: req.params.id,
      req,
    });

    res.json({
      success: true,
      data: broadcast,
      message: "Newsletter broadcast sent",
    });
  } catch (error) {
    console.error("Newsletter send error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to send newsletter broadcast" });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const token = String(req.params.token || "").replace(/\.gif$/i, "");
    if (!token) {
      return res.status(400).send("Invalid unsubscribe link");
    }

    const result = await req.app.locals.db.collection("newsletterSubscribers").findOneAndUpdate(
      { unsubscribeToken: token },
      {
        $set: {
          isActive: false,
          unsubscribedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    const subscriber = result.value || result;
    if (!subscriber) {
      return res.status(404).send("Subscriber not found");
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`
      <!doctype html>
      <html>
        <head><title>Unsubscribed</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; color: #111827;">
          <h1>You are unsubscribed</h1>
          <p>${subscriber.email} will no longer receive newsletter broadcasts.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    res.status(500).send("Failed to unsubscribe");
  }
};

const trackOpen = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    const token = String(req.params.token || "").replace(/\.gif$/i, "");
    const db = req.app.locals.db;

    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    if (!ObjectId.isValid(broadcastId) || !token) {
      return res.end(TRANSPARENT_GIF);
    }

    const subscriber = await db.collection("newsletterSubscribers").findOne({ unsubscribeToken: token });
    if (!subscriber) return res.end(TRANSPARENT_GIF);

    const bId = new ObjectId(broadcastId);
    const now = new Date();
    await Promise.all([
      db.collection("newsletterOpens").insertOne({
        broadcastId: bId,
        subscriberId: subscriber._id,
        email: subscriber.email,
        openedAt: now,
        ip: req.ip,
        userAgent: req.get("user-agent") || "",
      }),
      db.collection("newsletterBroadcastRecipients").updateOne(
        { broadcastId: bId, subscriberId: subscriber._id },
        {
          $set: {
            openedAt: now,
            updatedAt: now,
          },
          $inc: { openCount: 1 },
        },
      ),
      db.collection("newsletterBroadcasts").updateOne(
        { _id: bId },
        { $inc: { openCount: 1 }, $set: { updatedAt: now } },
      ),
    ]);

    res.end(TRANSPARENT_GIF);
  } catch (error) {
    console.error("Newsletter open tracking error:", error);
    res.setHeader("Content-Type", "image/gif");
    res.end(TRANSPARENT_GIF);
  }
};

module.exports = {
  subscribe,
  listSubscribers,
  createBroadcast,
  listBroadcasts,
  getBroadcast,
  sendBroadcastNow,
  unsubscribe,
  trackOpen,
};
