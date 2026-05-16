const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "amiyo-go";
const MAX_IMAGE_WIDTH = Number(process.env.IMAGE_MAX_WIDTH || 1600);

let supabaseClient = null;

const getSupabaseClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }

  return supabaseClient;
};

const safeFolder = (folder = "general") =>
  folder
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, "-"))
    .join("/");

const extensionFor = (file) => {
  const original = path.extname(file.originalname || "").toLowerCase();
  if (original) return original.replace(".", "");

  const mimeExt = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };

  return mimeExt[file.mimetype] || "bin";
};

const processFile = async (file, options = {}) => {
  if (file.mimetype?.startsWith("image/")) {
    const buffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: options.maxWidth || MAX_IMAGE_WIDTH, withoutEnlargement: true })
      .webp({ quality: options.quality || 82 })
      .toBuffer();

    return {
      buffer,
      extension: "webp",
      contentType: "image/webp",
    };
  }

  return {
    buffer: file.buffer,
    extension: extensionFor(file),
    contentType: file.mimetype || "application/octet-stream",
  };
};

const buildStoragePath = (folder, extension) => {
  const today = new Date().toISOString().slice(0, 10);
  const id = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  return `${safeFolder(folder)}/${today}/${id}.${extension}`;
};

const localUrlFor = (req, relativePath) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/${relativePath.replace(/\\/g, "/")}`;
};

const uploadFile = async ({ req, file, folder = "general", options = {} }) => {
  const processed = await processFile(file, options);
  const storagePath = buildStoragePath(folder, processed.extension);
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, processed.buffer, {
        contentType: processed.contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);

    return {
      url: data.publicUrl,
      path: storagePath,
      provider: "supabase",
      bucket: SUPABASE_BUCKET,
      size: processed.buffer.length,
      mimetype: processed.contentType,
      originalName: file.originalname,
    };
  }

  const localPath = path.join(__dirname, "..", "uploads", storagePath);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, processed.buffer);

  return {
    url: localUrlFor(req, storagePath),
    path: `/uploads/${storagePath.replace(/\\/g, "/")}`,
    provider: "local",
    size: processed.buffer.length,
    mimetype: processed.contentType,
    originalName: file.originalname,
  };
};

const uploadFiles = async ({ req, files = [], folder = "general", options = {} }) =>
  Promise.all(files.map((file) => uploadFile({ req, file, folder, options })));

module.exports = {
  uploadFile,
  uploadFiles,
};
