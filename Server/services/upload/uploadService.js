const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const hasValue = (value) => String(value || "").trim().length > 0;

const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

const safeFolder = (folder = "general") =>
  String(folder || "general")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, "-"))
    .join("/") || "general";

const fileExt = (file) => {
  const original = path.extname(file.originalname || "").toLowerCase();
  if (original) return original;
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
  };
  return map[file.mimetype] || ".bin";
};

const publicIdFor = (folder, extension) => {
  const today = new Date().toISOString().slice(0, 10);
  return `${safeFolder(folder)}/${today}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
};

const localUrlFor = (req, publicId) => {
  const relative = `/uploads/${publicId.replace(/\\/g, "/")}`;
  if (req) return `${req.protocol}://${req.get("host")}${relative}`;
  if (process.env.API_PUBLIC_URL) return `${process.env.API_PUBLIC_URL.replace(/\/$/, "")}${relative}`;
  if (process.env.API_URL) return `${process.env.API_URL.replace(/\/$/, "")}${relative}`;
  return relative;
};

const cloudinaryConfigured = () =>
  hasValue(process.env.CLOUDINARY_CLOUD_NAME) &&
  hasValue(process.env.CLOUDINARY_API_KEY) &&
  hasValue(process.env.CLOUDINARY_API_SECRET);

const getCloudinary = () => {
  if (!cloudinaryConfigured()) return null;
  try {
    const { v2 } = require("cloudinary");
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return v2;
  } catch {
    throw new Error("Cloudinary package is not installed. Run npm install cloudinary in Server/.");
  }
};

const supabaseConfigured = () =>
  hasValue(process.env.SUPABASE_URL) &&
  hasValue(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

let supabaseClient = null;
const getSupabase = () => {
  if (!supabaseConfigured()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
  }
  return supabaseClient;
};

const resourceTypeFor = (kind) => {
  if (kind === "video") return "video";
  if (kind === "document") return "raw";
  return "image";
};

async function uploadToCloudinary(file, folder, kind) {
  const cloudinary = getCloudinary();
  if (!cloudinary) return null;

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: safeFolder(folder),
    resource_type: resourceTypeFor(kind),
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    provider: "cloudinary",
    width: result.width || null,
    height: result.height || null,
    duration: result.duration || null,
    size: result.bytes || file.size || file.buffer.length,
  };
}

async function uploadToSupabase(file, folder) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "amiyo-go";
  const publicId = publicIdFor(folder, fileExt(file));
  const { error } = await supabase.storage.from(bucket).upload(publicId, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(publicId);
  return {
    url: data.publicUrl,
    publicId,
    provider: "supabase",
    size: file.size || file.buffer.length,
  };
}

async function uploadToLocal(file, folder, req) {
  const publicId = publicIdFor(folder, fileExt(file));
  const diskPath = path.join(uploadsRoot, publicId);
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, file.buffer);
  return {
    url: localUrlFor(req, publicId),
    publicId,
    provider: "local",
    size: file.size || file.buffer.length,
  };
}

async function uploadFile(file, folder = "general", kind = "image", req = null) {
  if (!file?.buffer) throw new Error("File buffer is required");

  const cloudinaryResult = await uploadToCloudinary(file, folder, kind);
  if (cloudinaryResult) return cloudinaryResult;

  const supabaseResult = await uploadToSupabase(file, folder);
  if (supabaseResult) return supabaseResult;

  return uploadToLocal(file, folder, req);
}

const uploadImage = (file, folder = "images", req = null) => uploadFile(file, folder, "image", req);
const uploadDocument = (file, folder = "documents", req = null) => uploadFile(file, folder, "document", req);
const uploadVideo = (file, folder = "videos", req = null) => uploadFile(file, folder, "video", req);

async function deleteFile(publicId, provider = "local") {
  if (!publicId) return { success: false, error: "publicId is required" };
  if (provider === "cloudinary" && cloudinaryConfigured()) {
    const cloudinary = getCloudinary();
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    return { success: true, provider, raw: result };
  }

  if (provider === "supabase" && supabaseConfigured()) {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "amiyo-go";
    const { error } = await getSupabase().storage.from(bucket).remove([publicId]);
    if (error) throw new Error(error.message);
    return { success: true, provider };
  }

  const resolved = path.resolve(uploadsRoot, publicId);
  if (!resolved.startsWith(path.resolve(uploadsRoot))) {
    throw new Error("Invalid local file path");
  }
  await fs.unlink(resolved).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  return { success: true, provider: "local" };
}

function getFileUrl(publicId) {
  if (!publicId) return "";
  if (/^https?:\/\//i.test(publicId)) return publicId;
  return localUrlFor(null, publicId);
}

module.exports = {
  deleteFile,
  getFileUrl,
  uploadDocument,
  uploadImage,
  uploadVideo,
};
