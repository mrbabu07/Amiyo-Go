const CampaignView = require("../models/CampaignView");
const CampaignOrder = require("../models/CampaignOrder");
const CampaignAnalytics = require("../models/CampaignAnalytics");
const CampaignProduct = require("../models/CampaignProduct");

class CampaignAnalyticsService {
  /**
   * Record a campaign view
   * @param {string} campaignId - Campaign ID
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (optional)
   * @param {string} ipAddress - IP address (optional)
   */
  async recordView(campaignId, sessionId, userId = null, ipAddress = null) {
    try {
      const view = new CampaignView({
        campaign: campaignId,
        sessionId,
        user: userId,
        ipAddress,
        viewedAt: new Date(),
      });

      await view.save();
    } catch (error) {
      console.error("Failed to record view:", error);
    }
  }

  /**
   * Record a campaign order
   * @param {string} campaignId - Campaign ID
   * @param {string} orderId - Order ID
   * @param {number} totalRevenue - Total revenue
   * @param {number} discountAmount - Discount amount
   * @param {string} orderStatus - Order status
   */
  async recordOrder(campaignId, orderId, totalRevenue, discountAmount, orderStatus = null) {
    try {
      const campaignOrder = new CampaignOrder({
        campaign: campaignId,
        order: orderId,
        totalRevenue,
        discountAmount,
        orderDate: new Date(),
        orderStatus,
      });

      await campaignOrder.save();
    } catch (error) {
      console.error("Failed to record order:", error);
    }
  }

  /**
   * Get campaign analytics summary
   * @param {string} campaignId - Campaign ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(campaignId, startDate = null, endDate = null) {
    try {
      const query = { campaign: campaignId };

      if (startDate && endDate) {
        query.analyticsDate = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      const analytics = await CampaignAnalytics.find(query).sort({ analyticsDate: 1 });

      // Aggregate totals
      const totals = {
        totalViews: 0,
        uniqueVisitors: 0,
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
      };

      for (const day of analytics) {
        totals.totalViews += day.totalViews;
        totals.uniqueVisitors += day.uniqueVisitors;
        totals.totalOrders += day.totalOrders;
        totals.totalRevenue += day.totalRevenue;
      }

      if (totals.totalOrders > 0) {
        totals.averageOrderValue = totals.totalRevenue / totals.totalOrders;
      }

      if (totals.totalViews > 0) {
        totals.conversionRate = (totals.totalOrders / totals.totalViews) * 100;
      }

      return {
        summary: totals,
        dailyBreakdown: analytics,
      };
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }

  /**
   * Get view metrics and trends
   * @param {string} campaignId - Campaign ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} View metrics
   */
  async getViewMetrics(campaignId, startDate = null, endDate = null) {
    try {
      const query = { campaign: campaignId };

      if (startDate && endDate) {
        query.viewedAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      // Total views
      const totalViews = await CampaignView.countDocuments(query);

      // Unique visitors (distinct sessions)
      const uniqueVisitors = await CampaignView.distinct("sessionId", query);

      // Daily breakdown
      const dailyViews = await CampaignView.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$viewedAt" },
            },
            views: { $sum: 1 },
            uniqueSessions: { $addToSet: "$sessionId" },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: "$_id",
            views: 1,
            uniqueVisitors: { $size: "$uniqueSessions" },
            _id: 0,
          },
        },
      ]);

      return {
        totalViews,
        uniqueVisitors: uniqueVisitors.length,
        dailyBreakdown: dailyViews,
      };
    } catch (error) {
      throw new Error(`Failed to get view metrics: ${error.message}`);
    }
  }

  /**
   * Get order metrics
   * @param {string} campaignId - Campaign ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Order metrics
   */
  async getOrderMetrics(campaignId, startDate = null, endDate = null) {
    try {
      const query = { campaign: campaignId };

      if (startDate && endDate) {
        query.orderDate = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      // Total orders
      const totalOrders = await CampaignOrder.countDocuments(query);

      // Total revenue
      const revenueData = await CampaignOrder.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalRevenue" },
            totalDiscount: { $sum: "$discountAmount" },
          },
        },
      ]);

      const totalRevenue = revenueData[0]?.totalRevenue || 0;
      const totalDiscount = revenueData[0]?.totalDiscount || 0;

      // Average order value
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Daily breakdown
      const dailyOrders = await CampaignOrder.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$orderDate" },
            },
            orders: { $sum: 1 },
            revenue: { $sum: "$totalRevenue" },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: "$_id",
            orders: 1,
            revenue: 1,
            _id: 0,
          },
        },
      ]);

      return {
        totalOrders,
        totalRevenue,
        totalDiscount,
        averageOrderValue,
        dailyBreakdown: dailyOrders,
      };
    } catch (error) {
      throw new Error(`Failed to get order metrics: ${error.message}`);
    }
  }

  /**
   * Get top products by views or revenue
   * @param {string} campaignId - Campaign ID
   * @param {string} metric - Metric to sort by ('views' or 'revenue')
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Top products
   */
  async getTopProducts(campaignId, metric = "views", limit = 10) {
    try {
      let pipeline = [
        { $match: { campaign: campaignId } },
        {
          $lookup: {
            from: "campaignviews",
            let: { productId: "$product" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$campaign", campaignId] },
                },
              },
            ],
            as: "views",
          },
        },
        {
          $lookup: {
            from: "campaignorders",
            let: { campaignId: campaignId },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$campaign", campaignId] },
                },
              },
            ],
            as: "orders",
          },
        },
      ];

      if (metric === "revenue") {
        pipeline.push(
          {
            $group: {
              _id: "$product",
              productName: { $first: "$product" },
              revenue: { $sum: { $arrayElemAt: ["$orders.totalRevenue", 0] } },
              viewCount: { $sum: { $size: "$views" } },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: limit },
        );
      } else {
        pipeline.push(
          {
            $group: {
              _id: "$product",
              productName: { $first: "$product" },
              viewCount: { $sum: { $size: "$views" } },
              revenue: { $sum: { $arrayElemAt: ["$orders.totalRevenue", 0] } },
            },
          },
          { $sort: { viewCount: -1 } },
          { $limit: limit },
        );
      }

      const topProducts = await CampaignProduct.aggregate(pipeline);

      return topProducts;
    } catch (error) {
      throw new Error(`Failed to get top products: ${error.message}`);
    }
  }

  /**
   * Get conversion rate
   * @param {string} campaignId - Campaign ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Conversion rate percentage
   */
  async getConversionRate(campaignId, startDate = null, endDate = null) {
    try {
      const viewQuery = { campaign: campaignId };
      const orderQuery = { campaign: campaignId };

      if (startDate && endDate) {
        viewQuery.viewedAt = { $gte: startDate, $lte: endDate };
        orderQuery.orderDate = { $gte: startDate, $lte: endDate };
      }

      const totalViews = await CampaignView.countDocuments(viewQuery);
      const totalOrders = await CampaignOrder.countDocuments(orderQuery);

      if (totalViews === 0) return 0;

      return (totalOrders / totalViews) * 100;
    } catch (error) {
      throw new Error(`Failed to get conversion rate: ${error.message}`);
    }
  }

  /**
   * Aggregate analytics for a specific date
   * @param {string} campaignId - Campaign ID
   * @param {Date} date - Date to aggregate for
   */
  async aggregateAnalyticsForDate(campaignId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get view metrics
      const viewMetrics = await this.getViewMetrics(campaignId, startOfDay, endOfDay);

      // Get order metrics
      const orderMetrics = await this.getOrderMetrics(campaignId, startOfDay, endOfDay);

      // Calculate conversion rate
      const conversionRate =
        viewMetrics.totalViews > 0
          ? (orderMetrics.totalOrders / viewMetrics.totalViews) * 100
          : 0;

      // Calculate average order value
      const averageOrderValue =
        orderMetrics.totalOrders > 0 ? orderMetrics.totalRevenue / orderMetrics.totalOrders : 0;

      // Update or create analytics record
      const analyticsDate = new Date(date);
      analyticsDate.setHours(0, 0, 0, 0);

      const analytics = await CampaignAnalytics.findOneAndUpdate(
        { campaign: campaignId, analyticsDate },
        {
          totalViews: viewMetrics.totalViews,
          uniqueVisitors: viewMetrics.uniqueVisitors,
          totalOrders: orderMetrics.totalOrders,
          totalRevenue: orderMetrics.totalRevenue,
          averageOrderValue,
          conversionRate,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true },
      );

      return analytics;
    } catch (error) {
      console.error("Failed to aggregate analytics:", error);
    }
  }

  /**
   * Export analytics to CSV format
   * @param {string} campaignId - Campaign ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<string>} CSV data
   */
  async exportAnalytics(campaignId, startDate = null, endDate = null) {
    try {
      const analytics = await this.getAnalytics(campaignId, startDate, endDate);

      let csv = "Date,Total Views,Unique Visitors,Total Orders,Total Revenue,Avg Order Value,Conversion Rate\n";

      for (const day of analytics.dailyBreakdown) {
        csv += `${day.analyticsDate},${day.totalViews},${day.uniqueVisitors},${day.totalOrders},${day.totalRevenue},${day.averageOrderValue || 0},${day.conversionRate || 0}%\n`;
      }

      // Add summary row
      csv += `\nSummary\n`;
      csv += `Total Views,${analytics.summary.totalViews}\n`;
      csv += `Unique Visitors,${analytics.summary.uniqueVisitors}\n`;
      csv += `Total Orders,${analytics.summary.totalOrders}\n`;
      csv += `Total Revenue,${analytics.summary.totalRevenue}\n`;
      csv += `Average Order Value,${analytics.summary.averageOrderValue}\n`;
      csv += `Conversion Rate,${analytics.summary.conversionRate}%\n`;

      return csv;
    } catch (error) {
      throw new Error(`Failed to export analytics: ${error.message}`);
    }
  }
}

module.exports = new CampaignAnalyticsService();
