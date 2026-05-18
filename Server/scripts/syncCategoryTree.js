const { MongoClient, ServerApiVersion } = require("mongodb");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { categoryTree } = require("./seedCategories");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "BazarBD";

function createMongoClient() {
  if (!uri) {
    throw new Error("MONGO_URI is required to sync categories.");
  }

  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
}

async function syncNodes(collection, nodes, parentId = null) {
  let created = 0;
  let updated = 0;

  for (const [index, node] of nodes.entries()) {
    const { children = [], ...category } = node;
    const now = new Date();
    const existing = await collection.findOne({ slug: category.slug });
    const payload = {
      ...category,
      parentId,
      isActive: category.isActive !== undefined ? category.isActive : true,
      commissionRate: category.commissionRate || 0,
      minimumCommissionRate: category.minimumCommissionRate || 0,
      attributes: category.attributes || [],
      description: category.description || `Shop ${category.name}`,
      displayOrder: category.displayOrder ?? index + 1,
      updatedAt: now,
    };

    let categoryId;

    if (existing) {
      categoryId = existing._id;
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: payload,
          $setOnInsert: { createdAt: now },
        },
      );
      updated++;
    } else {
      const result = await collection.insertOne({
        ...payload,
        createdAt: now,
      });
      categoryId = result.insertedId;
      created++;
    }

    const childResult = await syncNodes(collection, children, categoryId);
    created += childResult.created;
    updated += childResult.updated;
  }

  return { created, updated };
}

async function syncCategoryTree() {
  let client;

  try {
    client = createMongoClient();
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("categories");

    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ parentId: 1 });
    await collection.createIndex({ isActive: 1 });
    await collection.createIndex({ displayOrder: 1 });

    const result = await syncNodes(collection, categoryTree);
    const total = await collection.countDocuments();

    console.log("Category sync completed");
    console.log(`Created: ${result.created}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Total categories in DB: ${total}`);
  } catch (error) {
    console.error("Category sync failed:", error);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
  }
}

syncCategoryTree();
