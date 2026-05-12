const subscribe = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }

    const now = new Date();
    const collection = req.app.locals.db.collection("newsletterSubscribers");
    await collection.createIndex({ email: 1 }, { unique: true });

    const result = await collection.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          source: req.body.source || "web",
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
      data: result.value,
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
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const collection = req.app.locals.db.collection("newsletterSubscribers");
    const [subscribers, total] = await Promise.all([
      collection.find({}).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).toArray(),
      collection.countDocuments({}),
    ]);

    res.json({
      success: true,
      data: subscribers,
      pagination: {
        page: parseInt(page),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Newsletter list error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch subscribers" });
  }
};

module.exports = {
  subscribe,
  listSubscribers,
};
