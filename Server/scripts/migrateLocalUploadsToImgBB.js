require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs/promises");
const path = require("path");
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "BazarBD";
const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.IMAGE_UPLOAD_IMGBB_API_KEY;
const uploadsRoot = path.join(__dirname, "..", "uploads");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;

const collections = [
  "products",
  "vendors",
  "shops",
  "banners",
  "offers",
  "campaigns",
  "homepage_slots",
  "reviews",
  "returns",
];

const uploadCache = new Map();

const isPlainObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const extractUploadPath = (value = "") => {
  const text = String(value || "").trim();
  const match = text.match(/(?:https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?|https?:\/\/[^/]+)?\/uploads\/([^?#]+)/i);
  if (!match) return null;
  return decodeURIComponent(match[1]).replace(/\\/g, "/");
};

async function uploadToImgBB(localRelativePath) {
  if (uploadCache.has(localRelativePath)) return uploadCache.get(localRelativePath);

  const absolutePath = path.resolve(uploadsRoot, localRelativePath);
  if (!absolutePath.startsWith(path.resolve(uploadsRoot))) return null;

  const buffer = await fs.readFile(absolutePath).catch(() => null);
  if (!buffer) {
    uploadCache.set(localRelativePath, null);
    return null;
  }

  if (!apply) {
    const previewUrl = `imgbb://pending/${localRelativePath}`;
    uploadCache.set(localRelativePath, previewUrl);
    return previewUrl;
  }

  const form = new URLSearchParams();
  form.set("image", buffer.toString("base64"));
  form.set("name", path.basename(localRelativePath, path.extname(localRelativePath)));

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(imgbbApiKey)}`, {
    method: "POST",
    body: form,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json?.success) {
    throw new Error(json?.error?.message || `ImgBB upload failed with ${response.status}`);
  }

  const url = json.data?.display_url || json.data?.url;
  uploadCache.set(localRelativePath, url);
  return url;
}

async function normalizeValue(value, stats) {
  if (typeof value === "string") {
    const localPath = extractUploadPath(value);
    if (!localPath) return value;
    const uploaded = await uploadToImgBB(localPath);
    if (!uploaded) {
      stats.missing += 1;
      return value;
    }
    stats.replaced += 1;
    return uploaded;
  }

  if (Array.isArray(value)) {
    const next = [];
    for (const item of value) next.push(await normalizeValue(item, stats));
    return next;
  }

  if (isPlainObject(value)) {
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = await normalizeValue(item, stats);
    }
    return next;
  }

  return value;
}

async function migrateCollection(db, name) {
  const collection = db.collection(name);
  const cursor = collection.find({}).limit(limit > 0 ? limit : 0);
  let scanned = 0;
  let changed = 0;
  let missing = 0;
  let replaced = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned += 1;
    const stats = { missing: 0, replaced: 0 };
    const patch = {};

    for (const [key, value] of Object.entries(doc)) {
      if (key === "_id") continue;
      const next = await normalizeValue(value, stats);
      if (JSON.stringify(next) !== JSON.stringify(value)) patch[key] = next;
    }

    missing += stats.missing;
    replaced += stats.replaced;

    if (Object.keys(patch).length > 0) {
      changed += 1;
      if (apply) await collection.updateOne({ _id: doc._id }, { $set: patch });
    }
  }

  return { collection: name, scanned, changed, replaced, missing };
}

async function main() {
  if (!uri) throw new Error("MONGO_URI or MONGODB_URI is required");
  if (apply && !imgbbApiKey) throw new Error("IMGBB_API_KEY is required when using --apply");

  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });
  await client.connect();

  try {
    const db = client.db(dbName);
    const results = [];
    for (const name of collections) {
      const exists = await db.listCollections({ name }).hasNext();
      if (exists) results.push(await migrateCollection(db, name));
    }
    console.table(results);
    console.log(apply ? "Migration applied." : "Dry run only. Re-run with --apply after setting IMGBB_API_KEY.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
