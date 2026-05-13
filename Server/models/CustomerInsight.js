const { ObjectId } = require("mongodb");

class CustomerInsight {
  constructor(db) {
    this.db = db;
    this.collection = db.collection("customerInsights");
    this.ordersCollection = db.collection("orders");
    this.productsCollection = db.collection("products");
    this.reviewsCollection = db.collection("reviews");
    this.supportTicketsCollection = db.collection("supportTickets");
    this.createIndexes();
  }

  async createIndexes() {
    try {
      await this.collection.createIndex({ userId: 1 });
      await this.collection.createIndex({ lastUpdated: -1 });
    } catch (error) {
      console.error("Error creating CustomerInsight indexes:", error);
    }
  }

  async generateInsight(userId) {
    const [orderHistory, reviewHistory, supportHistory, preferences] =
      await Promise.all([
        this.getOrderHistory(userId),
        this.getReviewHistory(userId),
        this.getSupportHistory(userId),
        this.getCustomerPreferences(userId),
      ]);

    const insight = {
      userId,
      orderHistory,
      reviewHistory,
      supportHistory,
      preferences,
      analytics: await this.calculateAnalytics(userId, orderHistory),
      lastUpdated: new Date(),
    };

    await this.collection.replaceOne({ userId }, insight, { upsert: true });

    return insight;
  }

  getOrderItems(order) {
    const products = Array.isArray(order?.products) ? order.products : [];
    return products.map((product) => ({
      productId: product.productId || product._id || null,
      quantity: Number(product.quantity || 0),
      price: Number(product.price || 0),
      category:
        product.categoryName ||
        product.category ||
        product.categorySlug ||
        product.categoryId ||
        null,
      brand: product.brand || null,
      title: product.title || product.name || "Product",
    }));
  }

  async getOrderHistory(userId) {
    const orders = await this.ordersCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return {
      totalOrders: orders.length,
      orders: orders.map((order) => ({
        orderId: order.orderId || order._id?.toString?.() || null,
        total: Number(order.total || 0),
        status: order.status || "pending",
        items: this.getOrderItems(order).reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        ),
        createdAt: order.createdAt,
      })),
    };
  }

  async getReviewHistory(userId) {
    const reviews = await this.reviewsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    return {
      totalReviews: reviews.length,
      averageRating: Math.round(avgRating * 10) / 10,
      reviews: reviews.map((review) => ({
        productId: review.productId,
        rating: review.rating,
        comment: review.comment?.substring(0, 100),
        createdAt: review.createdAt,
      })),
    };
  }

  async getSupportHistory(userId) {
    const tickets = await this.supportTicketsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return {
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) => t.status === "open").length,
      tickets: tickets.map((ticket) => ({
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      })),
    };
  }

  async getCustomerPreferences(userId) {
    const orders = await this.ordersCollection.find({ userId }).toArray();

    const categoryPreferences = {};
    const brandPreferences = {};
    const priceRanges = [];
    const productIds = [
      ...new Set(
        orders.flatMap((order) =>
          this.getOrderItems(order)
            .map((item) => item.productId?.toString?.() || item.productId)
            .filter(Boolean),
        ),
      ),
    ];

    const validProductIds = productIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const products = validProductIds.length
      ? await this.productsCollection
          .find({ _id: { $in: validProductIds } })
          .toArray()
      : [];
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    for (const order of orders) {
      for (const item of this.getOrderItems(order)) {
        const product = item.productId ? productMap.get(item.productId.toString()) : null;
        const quantity = Number(item.quantity || 0) || 1;
        const category =
          product?.categoryName ||
          product?.category ||
          item.category?.toString?.() ||
          item.category ||
          "Uncategorized";
        const brand = product?.brand || item.brand || null;
        const price = Number(product?.price ?? item.price ?? 0);

        categoryPreferences[category] =
          (categoryPreferences[category] || 0) + quantity;

        if (brand) {
          brandPreferences[brand] =
            (brandPreferences[brand] || 0) + quantity;
        }

        if (price > 0) {
          priceRanges.push(price);
        }
      }
    }

    // Calculate preferred price range
    const avgPrice =
      priceRanges.length > 0
        ? priceRanges.reduce((sum, price) => sum + price, 0) /
          priceRanges.length
        : 0;

    return {
      favoriteCategories: Object.entries(categoryPreferences)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, purchaseCount: count })),
      favoriteBrands: Object.entries(brandPreferences)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([brand, count]) => ({ brand, purchaseCount: count })),
      averageOrderValue: avgPrice,
      priceRange: {
        min: Math.min(...priceRanges) || 0,
        max: Math.max(...priceRanges) || 0,
        average: avgPrice,
      },
    };
  }

  async calculateAnalytics(userId, orderHistory) {
    const orders = orderHistory.orders;
    const successfulOrders = orders.filter(
      (order) => !["cancelled", "failed"].includes(order.status),
    );

    if (successfulOrders.length === 0) {
      return {
        totalSpent: 0,
        averageOrderValue: 0,
        orderFrequency: 0,
        customerLifetimeValue: 0,
        lastOrderDate: null,
        customerSegment: "new",
      };
    }

    const totalSpent = successfulOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );
    const averageOrderValue = totalSpent / successfulOrders.length;

    // Calculate order frequency (orders per month)
    const firstOrder = new Date(successfulOrders[successfulOrders.length - 1].createdAt);
    const lastOrder = new Date(successfulOrders[0].createdAt);
    const monthsDiff = Math.max(
      1,
      (lastOrder - firstOrder) / (1000 * 60 * 60 * 24 * 30),
    );
    const orderFrequency = successfulOrders.length / monthsDiff;

    // Simple customer segmentation
    let customerSegment = "new";
    if (totalSpent > 1000 && successfulOrders.length > 5) {
      customerSegment = "vip";
    } else if (totalSpent > 500 || successfulOrders.length > 3) {
      customerSegment = "regular";
    }

    return {
      totalSpent: Math.round(totalSpent * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      orderFrequency: Math.round(orderFrequency * 100) / 100,
      customerLifetimeValue: Math.round(totalSpent * 100) / 100, // Simplified CLV
      lastOrderDate: lastOrder,
      customerSegment,
    };
  }

  async getInsight(userId) {
    let insight = await this.collection.findOne({ userId });

    // If no insight exists or it's older than 24 hours, generate new one
    if (!insight || new Date() - insight.lastUpdated > 24 * 60 * 60 * 1000) {
      insight = await this.generateInsight(userId);
    }

    return insight;
  }

  async getAllCustomerInsights(options = {}) {
    const { page = 1, limit = 20, segment, sortBy = "lastUpdated" } = options;
    const query = {};

    await this.ensureInsightCoverage();

    if (segment) {
      query["analytics.customerSegment"] = segment;
    }

    const insights = await this.collection
      .find(query)
      .sort({ [sortBy]: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await this.collection.countDocuments(query);

    return {
      insights,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCustomerSegmentStats() {
    await this.ensureInsightCoverage();

    const stats = await this.collection
      .aggregate([
        {
          $group: {
            _id: "$analytics.customerSegment",
            count: { $sum: 1 },
            totalSpent: { $sum: "$analytics.totalSpent" },
            avgOrderValue: { $avg: "$analytics.averageOrderValue" },
          },
        },
      ])
      .toArray();

    return stats;
  }

  async ensureInsightCoverage(limit = 50) {
    const existingCount = await this.collection.countDocuments();
    if (existingCount > 0) return;

    const recentUserIds = await this.ordersCollection.distinct("userId", {
      userId: { $exists: true, $ne: null },
    });

    for (const userId of recentUserIds.slice(0, limit)) {
      await this.generateInsight(userId);
    }
  }
}

module.exports = CustomerInsight;
