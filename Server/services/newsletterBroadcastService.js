const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const emailService = require("./emailService");

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64",
);

const makeToken = () => crypto.randomBytes(24).toString("hex");

const getServerBaseUrl = (req) => {
  const envUrl =
    process.env.API_PUBLIC_URL ||
    process.env.SERVER_PUBLIC_URL ||
    process.env.BACKEND_URL;

  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (req) return `${req.protocol}://${req.get("host")}`;
  return `http://localhost:${process.env.PORT || 5000}`;
};

const ensureNewsletterIndexes = async (db) => {
  await Promise.all([
    db.collection("newsletterSubscribers").createIndex({ email: 1 }, { unique: true }),
    db.collection("newsletterSubscribers").createIndex({ unsubscribeToken: 1 }, { unique: true, sparse: true }),
    db.collection("newsletterBroadcasts").createIndex({ status: 1, scheduledAt: 1 }),
    db.collection("newsletterBroadcastRecipients").createIndex({ broadcastId: 1, subscriberId: 1 }, { unique: true }),
    db.collection("newsletterOpens").createIndex({ broadcastId: 1, subscriberId: 1, openedAt: -1 }),
  ]);
};

const replacePlaceholders = (html, replacements) =>
  Object.entries(replacements).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value || ""),
    html || "",
  );

const buildRecipientHtml = ({ broadcast, subscriber, req }) => {
  const baseUrl = getServerBaseUrl(req);
  const token = subscriber.unsubscribeToken || makeToken();
  const broadcastId = broadcast._id.toString();
  const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe/${token}`;
  const openPixel = `${baseUrl}/api/newsletter/open/${broadcastId}/${token}.gif`;

  const html = replacePlaceholders(broadcast.html || broadcast.body || "", {
    email: subscriber.email,
    unsubscribeUrl,
  });

  return `
    ${html}
    <div style="margin-top:24px;font-size:12px;color:#6b7280;line-height:1.5">
      You are receiving this because you subscribed to ${process.env.APP_NAME || "Amiyo Go"} updates.
      <a href="${unsubscribeUrl}" style="color:#2563eb">Unsubscribe</a>
    </div>
    <img src="${openPixel}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0" />
  `;
};

const loadBroadcast = async (db, broadcastId) => {
  if (!ObjectId.isValid(broadcastId)) return null;
  return db.collection("newsletterBroadcasts").findOne({ _id: new ObjectId(broadcastId) });
};

const sendBroadcast = async ({ app, broadcastId, req = null }) => {
  const db = app.locals.db;
  await ensureNewsletterIndexes(db);

  const broadcasts = db.collection("newsletterBroadcasts");
  const subscribers = db.collection("newsletterSubscribers");
  const recipients = db.collection("newsletterBroadcastRecipients");
  const broadcast = await loadBroadcast(db, broadcastId);

  if (!broadcast) {
    throw new Error("Newsletter broadcast not found");
  }

  if (broadcast.status === "sent" || broadcast.status === "sending") {
    return broadcast;
  }

  const now = new Date();
  await broadcasts.updateOne(
    { _id: broadcast._id },
    {
      $set: {
        status: "sending",
        startedAt: now,
        updatedAt: now,
      },
    },
  );

  const activeSubscribers = await subscribers
    .find({ isActive: { $ne: false } })
    .sort({ createdAt: 1 })
    .toArray();

  let sentCount = 0;
  let failedCount = 0;

  for (const subscriber of activeSubscribers) {
    let token = subscriber.unsubscribeToken;
    if (!token) {
      token = makeToken();
      await subscribers.updateOne(
        { _id: subscriber._id },
        { $set: { unsubscribeToken: token, updatedAt: new Date() } },
      );
      subscriber.unsubscribeToken = token;
    }

    const html = buildRecipientHtml({ broadcast, subscriber, req });
    const recipientDoc = {
      broadcastId: broadcast._id,
      subscriberId: subscriber._id,
      email: subscriber.email,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await recipients.updateOne(
      { broadcastId: broadcast._id, subscriberId: subscriber._id },
      { $setOnInsert: recipientDoc, $set: { updatedAt: new Date() } },
      { upsert: true },
    );

    const result = await emailService.sendEmail(subscriber.email, broadcast.subject, html);
    if (result?.success) {
      sentCount += 1;
      await recipients.updateOne(
        { broadcastId: broadcast._id, subscriberId: subscriber._id },
        { $set: { status: "sent", sentAt: new Date(), updatedAt: new Date(), error: null } },
      );
    } else {
      failedCount += 1;
      await recipients.updateOne(
        { broadcastId: broadcast._id, subscriberId: subscriber._id },
        {
          $set: {
            status: "failed",
            failedAt: new Date(),
            updatedAt: new Date(),
            error: result?.error || "SMTP send failed",
          },
        },
      );
    }
  }

  const finalStatus = failedCount > 0 && sentCount > 0 ? "partial_failed" : failedCount > 0 ? "failed" : "sent";
  await broadcasts.updateOne(
    { _id: broadcast._id },
    {
      $set: {
        status: finalStatus,
        recipientCount: activeSubscribers.length,
        sentCount,
        failedCount,
        sentAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return broadcasts.findOne({ _id: broadcast._id });
};

const sendDueBroadcasts = async (app) => {
  const db = app.locals.db;
  if (!db) return [];
  await ensureNewsletterIndexes(db);

  const due = await db
    .collection("newsletterBroadcasts")
    .find({
      status: "scheduled",
      scheduledAt: { $lte: new Date() },
    })
    .limit(5)
    .toArray();

  const sent = [];
  for (const broadcast of due) {
    sent.push(await sendBroadcast({ app, broadcastId: broadcast._id.toString() }));
  }

  return sent;
};

module.exports = {
  TRANSPARENT_GIF,
  makeToken,
  ensureNewsletterIndexes,
  buildRecipientHtml,
  sendBroadcast,
  sendDueBroadcasts,
};
