const Campaign = require("../models/Campaign");
const CampaignAnalyticsService = require("./CampaignAnalyticsService");
const CampaignNotification = require("../models/CampaignNotification");
const CampaignAnalytics = require("../models/CampaignAnalytics");

class CampaignSchedulerService {
  /**
   * Process scheduled campaigns - activate those whose start date has arrived
   */
  async processScheduledCampaigns() {
    try {
      const now = new Date();

      // Find campaigns that should be activated
      const campaignsToActivate = await Campaign.find({
        status: "Scheduled",
        startDate: { $lte: now },
        endDate: { $gte: now },
      });

      for (const campaign of campaignsToActivate) {
        campaign.status = "Active";
        await campaign.save();

        // Send notification
        await this.createNotification(
          campaign._id,
          campaign.createdBy,
          "MILESTONE",
          `Campaign "${campaign.name}" is now active!`,
        );

        console.log(`Activated campaign: ${campaign.name}`);
      }

      return campaignsToActivate.length;
    } catch (error) {
      console.error("Error processing scheduled campaigns:", error);
    }
  }

  /**
   * Process expired campaigns - end those whose end date has passed
   */
  async processExpiredCampaigns() {
    try {
      const now = new Date();

      // Find campaigns that should be ended
      const campaignsToEnd = await Campaign.find({
        status: "Active",
        endDate: { $lt: now },
      });

      for (const campaign of campaignsToEnd) {
        campaign.status = "Ended";
        await campaign.save();

        // Send notification
        await this.createNotification(
          campaign._id,
          campaign.createdBy,
          "MILESTONE",
          `Campaign "${campaign.name}" has ended.`,
        );

        console.log(`Ended campaign: ${campaign.name}`);
      }

      return campaignsToEnd.length;
    } catch (error) {
      console.error("Error processing expired campaigns:", error);
    }
  }

  /**
   * Aggregate analytics for all campaigns
   */
  async aggregateAnalytics() {
    try {
      const campaigns = await Campaign.find({ status: { $in: ["Active", "Ended"] } });

      for (const campaign of campaigns) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        await CampaignAnalyticsService.aggregateAnalyticsForDate(campaign._id, yesterday);
      }

      console.log(`Aggregated analytics for ${campaigns.length} campaigns`);
      return campaigns.length;
    } catch (error) {
      console.error("Error aggregating analytics:", error);
    }
  }

  /**
   * Check performance thresholds and send alerts
   */
  async checkPerformanceThresholds() {
    try {
      const campaigns = await Campaign.find({
        status: "Active",
        $or: [
          { minViewsThreshold: { $exists: true, $ne: null } },
          { minOrdersThreshold: { $exists: true, $ne: null } },
          { minRevenueThreshold: { $exists: true, $ne: null } },
        ],
      });

      for (const campaign of campaigns) {
        const now = new Date();
        const campaignDuration = campaign.endDate - campaign.startDate;
        const elapsedTime = now - campaign.startDate;
        const percentageElapsed = (elapsedTime / campaignDuration) * 100;

        // Check thresholds only after 50% of campaign duration
        if (percentageElapsed >= 50) {
          const analytics = await CampaignAnalytics.findOne({
            campaign: campaign._id,
          }).sort({ analyticsDate: -1 });

          if (analytics) {
            let alertMessage = null;

            if (
              campaign.minViewsThreshold &&
              analytics.totalViews < campaign.minViewsThreshold
            ) {
              alertMessage = `Campaign "${campaign.name}" is at risk: Views (${analytics.totalViews}) below threshold (${campaign.minViewsThreshold})`;
            }

            if (
              campaign.minOrdersThreshold &&
              analytics.totalOrders < campaign.minOrdersThreshold
            ) {
              alertMessage = `Campaign "${campaign.name}" is at risk: Orders (${analytics.totalOrders}) below threshold (${campaign.minOrdersThreshold})`;
            }

            if (
              campaign.minRevenueThreshold &&
              analytics.totalRevenue < campaign.minRevenueThreshold
            ) {
              alertMessage = `Campaign "${campaign.name}" is at risk: Revenue (${analytics.totalRevenue}) below threshold (${campaign.minRevenueThreshold})`;
            }

            if (alertMessage) {
              await this.createNotification(
                campaign._id,
                campaign.createdBy,
                "ALERT",
                alertMessage,
              );
            }
          }
        }
      }

      console.log(`Checked performance thresholds for ${campaigns.length} campaigns`);
      return campaigns.length;
    } catch (error) {
      console.error("Error checking performance thresholds:", error);
    }
  }

  /**
   * Send pending notifications
   */
  async sendNotifications() {
    try {
      const pendingNotifications = await CampaignNotification.find({
        isRead: false,
      })
        .populate("campaign")
        .populate("recipient");

      for (const notification of pendingNotifications) {
        // In a real application, you would send email/push notifications here
        // For now, we'll just mark them as read after processing
        console.log(
          `Notification for ${notification.recipient.email}: ${notification.message}`,
        );
      }

      console.log(`Processed ${pendingNotifications.length} notifications`);
      return pendingNotifications.length;
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
  }

  /**
   * Check for campaigns ending soon (80% duration) and send alerts
   */
  async checkCampaignsEndingSoon() {
    try {
      const campaigns = await Campaign.find({ status: "Active" });

      for (const campaign of campaigns) {
        const now = new Date();
        const campaignDuration = campaign.endDate - campaign.startDate;
        const elapsedTime = now - campaign.startDate;
        const percentageElapsed = (elapsedTime / campaignDuration) * 100;

        // Send notification when 80% of campaign duration has elapsed
        if (percentageElapsed >= 80 && percentageElapsed < 85) {
          const existingNotification = await CampaignNotification.findOne({
            campaign: campaign._id,
            type: "ENDING_SOON",
          });

          if (!existingNotification) {
            await this.createNotification(
              campaign._id,
              campaign.createdBy,
              "ENDING_SOON",
              `Campaign "${campaign.name}" is ending soon. Only ${Math.ceil((campaign.endDate - now) / (1000 * 60 * 60))} hours remaining.`,
            );
          }
        }
      }

      console.log(`Checked ${campaigns.length} campaigns for ending soon alerts`);
      return campaigns.length;
    } catch (error) {
      console.error("Error checking campaigns ending soon:", error);
    }
  }

  /**
   * Check for campaigns with zero views after 24 hours
   */
  async checkZeroViewCampaigns() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const campaigns = await Campaign.find({
        status: "Active",
        startDate: { $lte: oneDayAgo },
      });

      for (const campaign of campaigns) {
        const analytics = await CampaignAnalytics.findOne({
          campaign: campaign._id,
        }).sort({ analyticsDate: -1 });

        if (!analytics || analytics.totalViews === 0) {
          const existingNotification = await CampaignNotification.findOne({
            campaign: campaign._id,
            type: "ALERT",
            message: { $regex: "zero views" },
          });

          if (!existingNotification) {
            await this.createNotification(
              campaign._id,
              campaign.createdBy,
              "ALERT",
              `Campaign "${campaign.name}" has zero views after 24 hours. Consider reviewing the campaign.`,
            );
          }
        }
      }

      console.log(`Checked ${campaigns.length} campaigns for zero views`);
      return campaigns.length;
    } catch (error) {
      console.error("Error checking zero view campaigns:", error);
    }
  }

  /**
   * Create notification
   */
  async createNotification(campaignId, recipientId, type, message) {
    try {
      const notification = new CampaignNotification({
        campaign: campaignId,
        recipient: recipientId,
        type,
        message,
      });

      await notification.save();
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  }

  /**
   * Run all scheduler tasks
   */
  async runAllTasks() {
    console.log("Running campaign scheduler tasks...");

    const results = {
      scheduledActivated: await this.processScheduledCampaigns(),
      expiredEnded: await this.processExpiredCampaigns(),
      analyticsAggregated: await this.aggregateAnalytics(),
      thresholdsChecked: await this.checkPerformanceThresholds(),
      endingSoonChecked: await this.checkCampaignsEndingSoon(),
      zeroViewsChecked: await this.checkZeroViewCampaigns(),
      notificationsSent: await this.sendNotifications(),
    };

    console.log("Campaign scheduler tasks completed:", results);
    return results;
  }
}

module.exports = new CampaignSchedulerService();
