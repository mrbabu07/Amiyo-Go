const mongoose = require("mongoose");

async function getCollection(app) {
  if (app?.locals?.models?.AuditLog?.collection) return app.locals.models.AuditLog.collection;
  if (app?.locals?.db) return app.locals.db.collection("audit_logs");
  if (mongoose.connection?.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db.collection("audit_logs");
  }
  return null;
}

async function log({
  app,
  actorId = null,
  actorType = "system",
  actorEmail = "",
  action,
  resource,
  resourceId = null,
  changes = {},
  ip = "",
  userAgent = "",
  note = "",
}) {
  if (!action || !resource) {
    return { success: false, mock: true, error: "action and resource are required" };
  }

  const entry = {
    actorId: actorId ? String(actorId) : null,
    actorType,
    actorEmail,
    action,
    resource,
    resourceId: resourceId ? String(resourceId) : null,
    changes,
    ip,
    userAgent,
    note,
    createdAt: new Date(),
  };

  const collection = await getCollection(app);
  if (!collection) {
    console.log("[mock-audit]", entry);
    return { success: true, mock: true, entry };
  }

  const result = await collection.insertOne(entry);
  return { success: true, id: result.insertedId, entry };
}

module.exports = {
  log,
};
