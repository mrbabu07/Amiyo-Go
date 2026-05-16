const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const { parse } = require("csv-parse/sync");
const { ObjectId } = require("mongodb");

let queue = null;
let worker = null;
let appRef = null;

const useRedisQueue = () => process.env.BULK_UPLOAD_USE_REDIS === "true" || Boolean(process.env.REDIS_URL);

const getConnection = () => {
  if (process.env.REDIS_URL) {
    return new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }

  return new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const getDeliveryMetaForCategory = (category = {}) => {
  const slug = String(category.slug || "").toLowerCase();
  if (["restaurant", "food", "meal"].some((pattern) => slug.includes(pattern))) {
    return { deliveryClass: "restaurant", isPerishable: true };
  }
  if (["fish", "seafood"].some((pattern) => slug.includes(pattern))) {
    return { deliveryClass: "fish", isPerishable: true };
  }
  if (["vegetable", "fruit", "fresh"].some((pattern) => slug.includes(pattern))) {
    return { deliveryClass: "vegetable", isPerishable: true };
  }
  if (["homemade", "pitha", "sweets"].some((pattern) => slug.includes(pattern))) {
    return { deliveryClass: "homemade", isPerishable: true };
  }
  return { deliveryClass: "", isPerishable: false };
};

const buildCategoryMap = async (Category, allowedCategoryIds = []) => {
  const allowedIds = new Set(allowedCategoryIds.map((id) => id.toString()));
  const objectIds = [...allowedIds]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const categories = allowedIds.size
    ? await Category.collection.find({ _id: { $in: objectIds } }).toArray()
    : [];
  const map = new Map();

  categories.forEach((category) => {
    [category._id, category.name, category.title, category.slug]
      .filter(Boolean)
      .forEach((key) => map.set(normalize(key), category));
  });

  return map;
};

const parseVariants = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("Variants must be valid JSON array");
  }
};

const parseBoolean = (value) =>
  ["1", "true", "yes", "y"].includes(String(value || "").trim().toLowerCase());

const parseOptionalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseKeywords = (value) =>
  String(value || "")
    .split(/[|,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 20);

const validateRow = (row, rowNumber, categoryMap) => {
  const errors = [];
  const price = Number(row.price);
  const stock = Number(row.stock);
  const category = categoryMap.get(normalize(row.category));

  if (!row.title) errors.push("Title is required");
  if (!row.price || Number.isNaN(price) || price <= 0) errors.push("Valid price is required");
  if (row.stock === undefined || row.stock === "" || Number.isNaN(stock) || stock < 0) {
    errors.push("Valid stock is required");
  }
  if (!row.category) errors.push("Category is required");
  if (row.category && !category) errors.push(`Category not allowed or not found: ${row.category}`);

  return {
    rowNumber,
    category,
    price,
    stock,
    errors,
  };
};

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const processJob = async (jobId) => {
  const app = appRef;
  const db = app.locals.db;
  const jobDoc = await db.collection("bulk_upload_jobs").findOne({ _id: new ObjectId(jobId) });
  if (!jobDoc) throw new Error("Bulk upload job not found");

  const Product = app.locals.models.Product;
  const Category = app.locals.models.Category;
  const Vendor = app.locals.models.Vendor;
  const vendor = await Vendor.findById(jobDoc.vendorId);
  if (!vendor) throw new Error("Vendor not found");

  await db.collection("bulk_upload_jobs").updateOne(
    { _id: jobDoc._id },
    { $set: { status: "processing", startedAt: new Date(), updatedAt: new Date() } },
  );

  const records = parse(jobDoc.csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  const categoryMap = await buildCategoryMap(Category, vendor.allowedCategoryIds || []);
  const report = [["row", "title", "status", "error", "productId"]];
  let imported = 0;
  let failed = 0;

  for (let index = 0; index < records.length; index += 1) {
    const row = records[index];
    const rowNumber = index + 2;
    const validation = validateRow(row, rowNumber, categoryMap);

    if (validation.errors.length) {
      failed += 1;
      report.push([rowNumber, row.title || "", "failed", validation.errors.join(" | "), ""]);
      continue;
    }

    try {
      const variants = parseVariants(row.variants);
      const deliveryMeta = getDeliveryMetaForCategory(validation.category);
      const productId = await Product.create({
        vendorId: vendor._id,
        categoryId: validation.category._id,
        title: row.title,
        description: row.description || "",
        price: validation.price,
        stock: validation.stock,
        sku: row.sku || "",
        images: row.images ? row.images.split("|").map((url) => url.trim()).filter(Boolean) : [],
        variants,
        seo: {
          metaTitle: row.metaTitle || "",
          metaDescription: row.metaDescription || "",
          searchKeywords: parseKeywords(row.searchKeywords),
        },
        lowStockThreshold: row.lowStockThreshold ? Number(row.lowStockThreshold) || 5 : 5,
        allowBackorder: parseBoolean(row.allowBackorder),
        restockDate: parseOptionalDate(row.restockDate),
        preorderEnabled: parseBoolean(row.preorderEnabled),
        expectedShipDate: parseOptionalDate(row.expectedShipDate),
        attributes: {
          ...(row.sku ? { sku: row.sku } : {}),
          ...(row.brand ? { brand: row.brand } : {}),
        },
        ...deliveryMeta,
        bulkUploadJobId: jobDoc._id.toString(),
      });
      imported += 1;
      report.push([rowNumber, row.title, "success", "", productId.toString()]);
    } catch (error) {
      failed += 1;
      report.push([rowNumber, row.title || "", "failed", error.message, ""]);
    }
  }

  const reportCsv = report.map((line) => line.map(csvEscape).join(",")).join("\n");
  await db.collection("bulk_upload_jobs").updateOne(
    { _id: jobDoc._id },
    {
      $set: {
        status: "completed",
        totalRows: records.length,
        imported,
        failed,
        reportCsv,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );
};

const initBulkUploadQueue = (app) => {
  appRef = app;
  if (!useRedisQueue() || queue) return;

  const connection = getConnection();
  queue = new Queue("vendor-bulk-upload", { connection });
  worker = new Worker(
    "vendor-bulk-upload",
    async (job) => processJob(job.data.jobId),
    { connection, concurrency: Number(process.env.BULK_UPLOAD_CONCURRENCY || 2) },
  );
  worker.on("failed", async (job, error) => {
    if (!job?.data?.jobId) return;
    await appRef.locals.db.collection("bulk_upload_jobs").updateOne(
      { _id: new ObjectId(job.data.jobId) },
      { $set: { status: "failed", error: error.message, updatedAt: new Date() } },
    );
  });
};

const enqueueBulkUpload = async ({ app, vendor, user, file }) => {
  appRef = app;
  const csvText = file.buffer.toString("utf8");
  const result = await app.locals.db.collection("bulk_upload_jobs").insertOne({
    vendorId: vendor._id.toString(),
    vendorName: vendor.shopName || "",
    uploadedBy: user?.uid || null,
    filename: file.originalname,
    status: "queued",
    csvText,
    totalRows: 0,
    imported: 0,
    failed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const jobId = result.insertedId.toString();
  if (queue) {
    await queue.add("import-products", { jobId }, { removeOnComplete: true, removeOnFail: 50 });
  } else {
    setImmediate(() => processJob(jobId).catch(async (error) => {
      await app.locals.db.collection("bulk_upload_jobs").updateOne(
        { _id: result.insertedId },
        { $set: { status: "failed", error: error.message, updatedAt: new Date() } },
      );
    }));
  }

  return { jobId };
};

module.exports = {
  initBulkUploadQueue,
  enqueueBulkUpload,
};
