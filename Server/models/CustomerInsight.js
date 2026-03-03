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

  async getOrderHistory(userId) {
    const orders = await this.ordersCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return {
      totalOrders: orders.length,
      orders: orders.map((order) => ({
        orderId: order.orderId,
        total: order.total,
        status: order.status,
        items: order.items.length,
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
    // Analyze purchase patterns to determine preferences
    const orders = await this.ordersCollection.find({ userId }).toArray();

    const categoryPreferences = {};
    const brandPreferences = {};
    const priceRanges = [];

    for (const order of orders) {
      for (const item of order.items) {
        // Get product details
        const product = await this.productsCollection.findOne({
          _id: new ObjectId(item.productId),
        });

        if (product) {
          // Category preferences
          const category = product.category;
          categoryPreferences[category] =
            (categoryPreferences[category] || 0) + item.quantity;

          // Brand preferences
          const brand = product.brand;
          if (brand) {
            brandPreferences[brand] =
              (brandPreferences[brand] || 0) + item.quantity;
          }

          // Price range analysis
          priceRanges.push(product.price);
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

    if (orders.length === 0) {
      return {
        totalSpent: 0,
        averageOrderValue: 0,
        orderFrequency: 0,
        customerLifetimeValue: 0,
        lastOrderDate: null,
        customerSegment: "new",
      };
    }

    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalSpent / orders.length;

    // Calculate order frequency (orders per month)
    const firstOrder = new Date(orders[orders.length - 1].createdAt);
    const lastOrder = new Date(orders[0].createdAt);
    const monthsDiff = Math.max(
      1,
      (lastOrder - firstOrder) / (1000 * 60 * 60 * 24 * 30),
    );
    const orderFrequency = orders.length / monthsDiff;

    // Simple customer segmentation
    let customerSegment = "new";
    if (totalSpent > 1000 && orders.length > 5) {
      customerSegment = "vip";
    } else if (totalSpent > 500 || orders.length > 3) {
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
}

module.exports = CustomerInsight;
