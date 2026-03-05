require("dotenv").config();
const { MongoClient } = require("mongodb");

async function fixRootAdmin() {
  const client = new MongoClient(process.env.MONGO_URI);

  const ROOT_ADMIN_EMAIL = "admin@bazarbd.com";
  const ROOT_ADMIN_UID = "ZCJRCBBWlaWCeWme4cBu06DIT3Q2";
  const DB_NAME = process.env.DB_NAME || "HnilaBazar";

  const adminPermissions = {
    orders: ["read", "create", "update", "delete"],
    users: ["read", "create", "update", "delete"],
    products: ["read", "create", "update", "delete"],
    categories: ["read", "create", "update", "delete"],
    coupons: ["read", "create", "update", "delete"],
    reviews: ["read", "create", "update", "delete"],
    support: ["read", "create", "update", "delete"],
    chat: ["read", "create", "update", "delete"],
    tickets: ["read", "create", "update", "delete"],
    analytics: ["read", "create", "update", "delete"],
    system: ["read", "create", "update", "delete"],
  };

  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB (db: ${DB_NAME})\n`);

    const db = client.db(DB_NAME);
    const users = db.collection("users");

    const before = await users.find({ email: ROOT_ADMIN_EMAIL }).toArray();
    console.log(
      `🔍 Found ${before.length} user(s) with email: ${ROOT_ADMIN_EMAIL}`,
    );
    before.forEach((u, i) => {
      console.log(
        `  ${i + 1}. _id=${u._id} role=${u.role} firebaseUid=${u.firebaseUid}`,
      );
    });
    console.log("");

    // 1) Ensure the root admin UID doc is admin with admin permissions
    const promoteResult = await users.updateOne(
      { email: ROOT_ADMIN_EMAIL, firebaseUid: ROOT_ADMIN_UID },
      {
        $set: {
          role: "admin",
          permissions: adminPermissions,
          status: "active",
          updatedAt: new Date(),
        },
      },
    );

    if (promoteResult.matchedCount === 0) {
      console.log(
        "❌ Root admin document not found by (email + firebaseUid). Nothing promoted.",
      );
    } else {
      console.log(
        `✅ Promoted root admin. modified=${promoteResult.modifiedCount}`,
      );
    }

    // 2) Delete duplicates for the same email but different UID
    const deleteResult = await users.deleteMany({
      email: ROOT_ADMIN_EMAIL,
      firebaseUid: { $ne: ROOT_ADMIN_UID },
    });
    console.log(`✅ Deleted duplicate admin-email docs: ${deleteResult.deletedCount}`);

    // 3) Verify final state
    const finalDoc = await users.findOne({ firebaseUid: ROOT_ADMIN_UID });
    console.log("\n✅ Final root admin doc:");
    console.log({
      _id: finalDoc?._id?.toString(),
      email: finalDoc?.email,
      role: finalDoc?.role,
      firebaseUid: finalDoc?.firebaseUid,
    });
  } catch (err) {
    console.error("❌ fixRootAdmin failed:", err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

fixRootAdmin();

