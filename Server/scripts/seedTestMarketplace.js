require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const admin = require("firebase-admin");
const { categoryTree } = require("./seedCategories");

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "BazarBD";
const seedTag = "test-marketplace-2026-05";
const testPassword = "123456";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const testAccounts = [
  {
    email: "admin@gmail.com",
    role: "admin",
    firstName: "Admin",
    lastName: "User",
    phone: "01700000000",
  },
  {
    email: "user@gmail.com",
    role: "customer",
    firstName: "Test",
    lastName: "Customer",
    phone: "01700000001",
  },
  {
    email: "seller@gmail.com",
    role: "vendor",
    firstName: "All",
    lastName: "Seller",
    phone: "01700000002",
    shopName: "Hnila All Category Store",
    rootSlugs: "all",
  },
  {
    email: "seller2@gmail.com",
    role: "vendor",
    firstName: "Style",
    lastName: "Seller",
    phone: "01700000003",
    shopName: "Style & Stationery BD",
    rootSlugs: [
      "mens-fashion",
      "womens-fashion",
      "beauty-health",
      "stationery-office",
    ],
  },
  {
    email: "seller3@gmail.com",
    role: "vendor",
    firstName: "Fresh",
    lastName: "Seller",
    phone: "01700000004",
    shopName: "Fresh Local Market",
    rootSlugs: [
      "groceries",
      "fresh-fish-seafood",
      "fresh-vegetables",
      "homemade-products",
      "restaurants-food-ordering",
    ],
  },
  {
    email: "seller4@gmail.com",
    role: "vendor",
    firstName: "Tech",
    lastName: "Seller",
    phone: "01700000005",
    shopName: "Tech Pharmacy Resell",
    rootSlugs: ["electronics", "pharmacy", "resell-market", "home-lifestyle"],
  },
];

const imageByRoot = {
  "mens-fashion":
    "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=700&h=700&fit=crop",
  "womens-fashion":
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&h=700&fit=crop",
  electronics:
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&h=700&fit=crop",
  "home-lifestyle":
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&h=700&fit=crop",
  "beauty-health":
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&h=700&fit=crop",
  groceries:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&h=700&fit=crop",
  "homemade-products":
    "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=700&h=700&fit=crop",
  "restaurants-food-ordering":
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&h=700&fit=crop",
  "resell-market":
    "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=700&h=700&fit=crop",
  "fresh-fish-seafood":
    "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=700&h=700&fit=crop",
  "fresh-vegetables":
    "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=700&h=700&fit=crop",
  "stationery-office":
    "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=700&h=700&fit=crop",
  pharmacy:
    "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=700&h=700&fit=crop",
};

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin env is missing. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to Server/.env.",
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

async function upsertFirebaseUser(account) {
  try {
    const user = await admin.auth().getUserByEmail(account.email);
    await admin.auth().updateUser(user.uid, {
      password: testPassword,
      displayName: `${account.firstName} ${account.lastName}`,
      disabled: false,
      emailVerified: true,
    });
    return user.uid;
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    const user = await admin.auth().createUser({
      email: account.email,
      password: testPassword,
      displayName: `${account.firstName} ${account.lastName}`,
      disabled: false,
      emailVerified: true,
    });
    return user.uid;
  }
}

async function syncCategoryNodes(collection, nodes, parentId = null, level = 0) {
  let created = 0;
  let updated = 0;

  for (const [index, node] of nodes.entries()) {
    const { children = [], ...category } = node;
    const now = new Date();
    const payload = {
      ...category,
      parentId,
      level,
      isActive: category.isActive !== undefined ? category.isActive : true,
      commissionRate: category.commissionRate || 0,
      minimumCommissionRate: category.minimumCommissionRate || 0,
      attributes: category.attributes || [],
      description: category.description || `Shop ${category.name}`,
      displayOrder: category.displayOrder ?? index + 1,
      updatedAt: now,
    };

    const existing = await collection.findOne({ slug: category.slug });
    let categoryId;

    if (existing) {
      categoryId = existing._id;
      await collection.updateOne({ _id: existing._id }, { $set: payload });
      updated++;
    } else {
      const result = await collection.insertOne({ ...payload, createdAt: now });
      categoryId = result.insertedId;
      created++;
    }

    const childResult = await syncCategoryNodes(
      collection,
      children,
      categoryId,
      level + 1,
    );
    created += childResult.created;
    updated += childResult.updated;
  }

  return { created, updated };
}

function getDefaultPermissions(role) {
  const permissions = {
    customer: {
      orders: ["read"],
      profile: ["read", "update"],
      wishlist: ["read", "create", "update", "delete"],
      reviews: ["read", "create", "update", "delete"],
      support: ["create", "read"],
    },
    vendor: {
      orders: ["read", "update"],
      profile: ["read", "update"],
      products: ["read", "create", "update", "delete"],
      inventory: ["read", "update"],
      reviews: ["read"],
      support: ["create", "read"],
      vendor: ["read", "update"],
      analytics: ["read"],
    },
    admin: {
      orders: ["read", "create", "update", "delete"],
      users: ["read", "create", "update", "delete"],
      vendors: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      categories: ["read", "create", "update", "delete"],
      coupons: ["read", "create", "update", "delete"],
      reviews: ["read", "create", "update", "delete"],
      support: ["read", "create", "update", "delete"],
      chat: ["read", "create", "update", "delete"],
      tickets: ["read", "create", "update", "delete"],
      analytics: ["read", "create", "update", "delete"],
      system: ["read", "create", "update", "delete"],
    },
  };

  return permissions[role] || permissions.customer;
}

async function upsertDbUser(users, account, firebaseUid) {
  const now = new Date();
  const payload = {
    firebaseUid,
    email: account.email,
    role: account.role,
    permissions: getDefaultPermissions(account.role),
    status: "active",
    seedTag,
    updatedAt: now,
    lastLogin: now,
    profile: {
      firstName: account.firstName,
      lastName: account.lastName,
      phone: account.phone,
      avatar: "",
      preferences: {
        notifications: true,
        marketing: false,
        theme: "light",
      },
    },
  };

  await users.updateOne(
    { email: account.email },
    { $set: payload, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );

  return users.findOne({ email: account.email });
}

function createSlug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getCategoryPath(category, categoryById) {
  const pathItems = [category];
  let parentId = category.parentId ? category.parentId.toString() : null;

  while (parentId && categoryById.has(parentId)) {
    const parent = categoryById.get(parentId);
    pathItems.unshift(parent);
    parentId = parent.parentId ? parent.parentId.toString() : null;
  }

  return pathItems;
}

function getDeliveryClassForRoot(rootSlug) {
  if (rootSlug === "restaurants-food-ordering") return "restaurant";
  if (rootSlug === "fresh-fish-seafood") return "fish";
  if (rootSlug === "fresh-vegetables") return "vegetable";
  if (rootSlug === "homemade-products") return "homemade";
  return "";
}

async function upsertVendors(db, categories, usersByEmail) {
  const vendors = db.collection("vendors");
  const rootCategories = categories.filter((category) => !category.parentId);
  const rootBySlug = new Map(rootCategories.map((category) => [category.slug, category]));
  const allRootIds = rootCategories.map((category) => category._id);
  const vendorDocs = [];
  const vendorAccounts = testAccounts.filter((item) => item.role === "vendor");
  const ownerUserIds = vendorAccounts
    .map((account) => usersByEmail.get(account.email)?._id)
    .filter(Boolean);
  const shopNames = vendorAccounts.map((account) => account.shopName);
  const emails = vendorAccounts.map((account) => account.email);

  await vendors.deleteMany({
    $or: [
      { seedTag },
      { ownerUserId: { $in: ownerUserIds } },
      { shopName: { $in: shopNames } },
      { email: { $in: emails } },
    ],
  });

  for (const account of vendorAccounts) {
    const user = usersByEmail.get(account.email);
    const allowedCategoryIds =
      account.rootSlugs === "all"
        ? allRootIds
        : account.rootSlugs
            .map((slug) => rootBySlug.get(slug)?._id)
            .filter(Boolean);

    const vendor = {
      ownerUserId: user._id,
      shopName: account.shopName,
      slug: createSlug(account.shopName),
      email: account.email,
      phone: account.phone,
      description: `${account.shopName} test vendor account.`,
      logo: "",
      banner: "",
      allowedCategoryIds,
      status: "approved",
      verificationLevel: "verified",
      isShopOpen: true,
      vacationMode: { enabled: false },
      payoutMethod: {
        type: "bank",
        accountName: account.shopName,
        accountNumber: "TEST-123456",
        bankName: "Test Bank",
      },
      address: {
        division: "Chattogram",
        district: "Coxsbazar",
        upazila: "Teknaf",
        union: "Hnila",
        wardNo: "7",
        area: "Hnila Bazar",
        details: "Hnila Bazar, Teknaf, Coxsbazar",
      },
      deliverySettings: {
        selfDeliveryEnabled: true,
        pickupEnabled: true,
        sameUnionFee: 30,
        sameUpazilaFee: 50,
        sameDistrictFee: 80,
        outsideDistrictFee: 120,
        freeDeliveryThreshold: 0,
        perishableFee: 20,
        handlingFee: 0,
        preparationTime: "Same day in Hnila",
      },
      seedTag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await vendors.insertOne(vendor);
    vendorDocs.push({ ...vendor, _id: result.insertedId });
  }

  return vendorDocs;
}

function getVendorForCategory(rootSlug, vendors) {
  const matchingVendor = vendors.find((vendor) => {
    if (vendor.shopName === "Hnila All Category Store") return false;
    return vendor.allowedRootSlugs?.includes(rootSlug);
  });

  return matchingVendor || vendors[0];
}

async function seedProducts(db, categories, vendorDocs) {
  const products = db.collection("products");
  await products.deleteMany({ seedTag });

  const categoryById = new Map(
    categories.map((category) => [category._id.toString(), category]),
  );
  const childrenByParentId = new Map();
  for (const category of categories) {
    const parentKey = category.parentId ? category.parentId.toString() : "root";
    if (!childrenByParentId.has(parentKey)) childrenByParentId.set(parentKey, []);
    childrenByParentId.get(parentKey).push(category);
  }

  const leafCategories = categories.filter(
    (category) => !childrenByParentId.has(category._id.toString()),
  );

  const rootAccessByVendor = vendorDocs.map((vendor) => ({
    ...vendor,
    allowedRootSlugs: vendor.allowedCategoryIds
      .map((id) => categoryById.get(id.toString())?.slug)
      .filter(Boolean),
  }));

  const docs = leafCategories.map((category, index) => {
    const pathItems = getCategoryPath(category, categoryById);
    const root = pathItems[0];
    const vendor = getVendorForCategory(root.slug, rootAccessByVendor);
    const title = `${category.name} Test Item`;
    const image = imageByRoot[root.slug] || imageByRoot.groceries;
    const price = 120 + ((index % 24) + 1) * 35;
    const deliveryClass = getDeliveryClassForRoot(root.slug);

    return {
      title,
      description: `Seed product for ${pathItems.map((item) => item.name).join(" > ")}. Use this item to test category browsing, vendor products, cart, checkout, invoice, and admin approval workflows.`,
      price,
      originalPrice: Math.round(price * 1.15),
      discount: index % 4 === 0 ? 10 : 0,
      image,
      images: [image],
      categoryId: category._id,
      vendorId: vendor._id,
      stock: 25 + (index % 40),
      sku: `TEST-${category.slug.toUpperCase().slice(0, 18)}-${index + 1}`,
      brand: root.name,
      sizes: root.slug.includes("fashion") ? ["S", "M", "L", "XL"] : [],
      colors: root.slug.includes("fashion")
        ? [
            { name: "Black", value: "#111827" },
            { name: "Blue", value: "#2563eb" },
          ]
        : [],
      attributes: {
        mainCategory: root.name,
        categoryPath: pathItems.map((item) => item.name).join(" > "),
        condition: root.slug === "resell-market" ? "Good" : "New",
      },
      deliveryClass,
      isPerishable: Boolean(deliveryClass),
      approvalStatus: "approved",
      isActive: true,
      approvedBy: "seed-script",
      approvedAt: new Date(),
      lastSubmittedAt: new Date(),
      lastModeratedAt: new Date(),
      rejectionReason: null,
      rating: 4 + (index % 10) / 10,
      reviewCount: index % 18,
      views: 25 + index,
      soldCount: index % 12,
      seedTag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  if (docs.length > 0) {
    await products.insertMany(docs);
  }

  return docs.length;
}

async function seedAddressAndOrder(db, usersByEmail, products) {
  const addresses = db.collection("addresses");
  const orders = db.collection("orders");
  const vendorOrders = db.collection("vendorOrders");
  const vendors = db.collection("vendors");
  const user = usersByEmail.get("user@gmail.com");

  await addresses.deleteMany({ seedTag });
  await orders.deleteMany({ seedTag });
  await vendorOrders.deleteMany({ seedTag });

  await addresses.insertOne({
    userId: user.firebaseUid,
    name: "Test Customer",
    phone: "01700000001",
    email: "user@gmail.com",
    division: "Chattogram",
    divisionId: "1",
    district: "Coxsbazar",
    districtId: "9",
    city: "Coxsbazar",
    upazila: "Teknaf",
    upazilaId: "87",
    union: "Hnila",
    unionId: "880",
    wardNo: "7",
    area: "Hnila Bazar",
    address: "House 12, Hnila Bazar",
    isDefault: true,
    seedTag,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const sampleProducts = products.slice(0, 3);
  if (sampleProducts.length === 0) return 0;

  const sampleVendorIds = [
    ...new Set(sampleProducts.map((product) => product.vendorId.toString())),
  ];
  const vendorDocs = await vendors
    .find({ _id: { $in: sampleVendorIds.map((id) => new ObjectId(id)) } })
    .toArray();
  const vendorById = new Map(
    vendorDocs.map((vendor) => [vendor._id.toString(), vendor]),
  );

  const orderProducts = sampleProducts.map((product) => {
    const vendor = vendorById.get(product.vendorId.toString());
    const itemSubtotal = product.price;
    const commissionRateSnapshot = 5;
    const adminCommissionAmount = Math.round(itemSubtotal * 0.05);

    return {
      productId: product._id.toString(),
      title: product.title,
      image: product.image,
      price: product.price,
      quantity: 1,
      vendorId: product.vendorId.toString(),
      vendorName: vendor?.shopName || "HnilaBazar",
      shopName: vendor?.shopName || "HnilaBazar",
      vendorPhone: vendor?.phone || "",
      vendorEmail: vendor?.email || "",
      categoryId: product.categoryId.toString(),
      commissionRateSnapshot,
      adminCommissionAmount,
      vendorEarningAmount: itemSubtotal - adminCommissionAmount,
      itemStatus: "pending",
      trackingNumber: null,
    };
  });

  const subtotal = orderProducts.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0,
  );

  const deliveryCharge = 30;

  const orderResult = await orders.insertOne({
    userId: user.firebaseUid,
    products: orderProducts,
    subtotal,
    deliveryCharge,
    deliveryBreakdown: [
      {
        vendorId: sampleVendorIds[0] || null,
        vendorName: vendorDocs[0]?.shopName || "HnilaBazar",
        deliveryMethod: "vendor_delivery",
        zoneType: "sameUnion",
        zoneLabel: "Same union",
        subtotal,
        baseFee: deliveryCharge,
        deliveryFee: deliveryCharge,
        freeDeliveryApplied: false,
        freeDeliveryThreshold: 0,
        perishableFee: 0,
        heavyFee: 0,
        expressFee: 0,
        remoteAreaFee: 0,
        handlingFee: 0,
        itemCount: orderProducts.reduce((sum, product) => sum + product.quantity, 0),
      },
    ],
    total: subtotal + deliveryCharge,
    totalAmount: subtotal + deliveryCharge,
    status: "pending",
    paymentMethod: "cod",
    paymentStatus: "pending",
    shippingInfo: {
      name: "Test Customer",
      email: "user@gmail.com",
      phone: "01700000001",
      division: "Chattogram",
      district: "Coxsbazar",
      city: "Coxsbazar",
      upazila: "Teknaf",
      union: "Hnila",
      wardNo: "7",
      area: "Hnila Bazar",
      address: "House 12, Hnila Bazar",
    },
    seedTag,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const groupedProducts = orderProducts.reduce((groups, product) => {
    const vendorId = product.vendorId || "platform";
    if (!groups[vendorId]) groups[vendorId] = [];
    groups[vendorId].push(product);
    return groups;
  }, {});

  const vendorOrderDocs = Object.entries(groupedProducts).map(
    ([vendorId, vendorProducts]) => {
      const vendorSubtotal = vendorProducts.reduce(
        (sum, product) => sum + product.price * product.quantity,
        0,
      );

      return {
        vendorId: vendorId === "platform" ? null : vendorId,
        parentOrderId: orderResult.insertedId.toString(),
        userId: user.firebaseUid,
        products: vendorProducts,
        subtotal: vendorSubtotal,
        deliveryCharge: Math.round((vendorSubtotal / subtotal) * deliveryCharge),
        totalAmount:
          vendorSubtotal + Math.round((vendorSubtotal / subtotal) * deliveryCharge),
        shippingInfo: {
          name: "Test Customer",
          email: "user@gmail.com",
          phone: "01700000001",
          division: "Chattogram",
          district: "Coxsbazar",
          city: "Coxsbazar",
          upazila: "Teknaf",
          union: "Hnila",
          wardNo: "7",
          area: "Hnila Bazar",
          address: "House 12, Hnila Bazar",
        },
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "pending",
        seedTag,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
  );

  if (vendorOrderDocs.length > 0) {
    const vendorOrderResult = await vendorOrders.insertMany(vendorOrderDocs);
    await orders.updateOne(
      { _id: orderResult.insertedId },
      {
        $set: {
          vendorOrderIds: Object.values(vendorOrderResult.insertedIds).map((id) =>
            id.toString(),
          ),
        },
      },
    );
  }

  return 1;
}

async function upsertDeliverySettings(db) {
  const now = new Date();
  await db.collection("deliverysettings").updateOne(
    {},
    {
      $set: {
        freeDeliveryThreshold: 1000,
        standardDeliveryCharge: 100,
        expressDeliveryCharge: 80,
        expressDeliveryEnabled: false,
        freeDeliveryEnabled: true,
        platformBaseLocation: {
          division: "Chattogram",
          district: "Coxsbazar",
          upazila: "Teknaf",
          union: "Hnila",
        },
        zoneFees: {
          sameUnion: 30,
          sameUpazila: 50,
          sameDistrict: 80,
          outsideDistrict: 120,
        },
        remoteAreaFee: 0,
        perishableFee: 20,
        heavyItemThresholdKg: 5,
        heavyItemFeePerKg: 10,
        codCharge: 0,
        estimatedDeliveryDays: { min: 1, max: 5 },
        updatedAt: now,
      },
      $setOnInsert: {
        deliveryAreas: [],
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

async function run() {
  if (!uri) {
    throw new Error("MONGO_URI is missing from Server/.env");
  }

  initFirebaseAdmin();
  await client.connect();

  try {
    const db = client.db(dbName);
    const categories = db.collection("categories");
    const users = db.collection("users");

    await categories.createIndex({ slug: 1 }, { unique: true });
    await categories.createIndex({ parentId: 1 });
    await users.createIndex({ firebaseUid: 1 }, { unique: true });
    await users.createIndex({ email: 1 });

    console.log(`Connected to MongoDB database: ${dbName}`);
    console.log("Syncing full category tree...");
    const categoryResult = await syncCategoryNodes(categories, categoryTree);
    const allCategories = await categories.find({ isActive: true }).toArray();
    console.log(
      `Categories ready. Created ${categoryResult.created}, updated ${categoryResult.updated}, total active ${allCategories.length}.`,
    );

    console.log("Setting Hnila as the main delivery service area...");
    await upsertDeliverySettings(db);

    console.log("Creating/updating Firebase and database users...");
    const usersByEmail = new Map();
    for (const account of testAccounts) {
      const firebaseUid = await upsertFirebaseUser(account);
      const dbUser = await upsertDbUser(users, account, firebaseUid);
      usersByEmail.set(account.email, dbUser);
    }

    console.log("Creating approved vendors with category access...");
    const vendors = await upsertVendors(db, allCategories, usersByEmail);

    console.log("Creating one approved product for every leaf category...");
    const productCount = await seedProducts(db, allCategories, vendors);
    const seededProducts = await db
      .collection("products")
      .find({ seedTag })
      .toArray();

    console.log("Creating default address and a sample customer order...");
    const orderCount = await seedAddressAndOrder(db, usersByEmail, seededProducts);

    console.log("\nTEST MARKETPLACE SEED COMPLETE");
    console.log("--------------------------------");
    console.log(`Categories active: ${allCategories.length}`);
    console.log(`Vendors created: ${vendors.length}`);
    console.log(`Products created: ${productCount}`);
    console.log(`Orders created: ${orderCount}`);
    console.log("\nLogin credentials:");
    console.log("Admin:   admin@gmail.com / 123456");
    console.log("User:    user@gmail.com / 123456");
    console.log("Vendor:  seller@gmail.com / 123456  (all categories)");
    console.log("Vendor:  seller2@gmail.com / 123456 (fashion/beauty/stationery)");
    console.log("Vendor:  seller3@gmail.com / 123456 (grocery/fish/vegetable/homemade)");
    console.log("Vendor:  seller4@gmail.com / 123456 (electronics/pharmacy/resell/home)");
    console.log("\nTest URLs:");
    console.log("Vendor add product: http://localhost:5173/vendor/products/add");
    console.log("Admin categories:   http://localhost:5173/admin/categories");
    console.log("Admin vendors:      http://localhost:5173/admin/vendors");
    console.log("Admin orders:       http://localhost:5173/admin/orders");
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Test marketplace seeding failed:", error);
  process.exitCode = 1;
});
