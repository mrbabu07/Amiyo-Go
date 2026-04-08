const Campaign = require("../models/Campaign");
const CampaignAuditLog = require("../models/CampaignAuditLog");
const CampaignProduct = require("../models/CampaignProduct");
const CampaignNotification = require("../models/CampaignNotification");

class CampaignService {
  /**
   * Create a new campaign
   * @param {Object} campaignData - Campaign data
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<Object>} Created campaign
   */
  async createCampaign(campaignData, adminUserId) {
    try {
      // Generate slug if not provided
      if (!campaignData.slug) {
        campaignData.slug = this.generateSlug(campaignData.name);
      }

      // Check for duplicate slug
      const existingCampaign = await Campaign.findOne({ slug: campaignData.slug });
      if (existingCampaign) {
        throw new Error("Campaign slug already exists");
      }

      // Validate image
      if (!campaignData.bannerImageUrl) {
        throw new Error("Banner image is required");
      }

      // Create campaign
      const campaign = new Campaign({
        ...campaignData,
        createdBy: adminUserId,
        updatedBy: adminUserId,
        status: "Draft",
      });

      await campaign.save();

      // Log creation
      await this.logAuditEvent(campaign._id, "CREATE", adminUserId, null, null, null, {
        campaignName: campaign.name,
      });

      return campaign;
    } catch (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  /**
   * Get campaign by ID
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign
   */
  async getCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId)
        .populate("eligibleCategories")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return campaign;
    } catch (error) {
      throw new Error(`Failed to get campaign: ${error.message}`);
    }
  }

  /**
   * Get campaign by slug
   * @param {string} slug - Campaign slug
   * @returns {Promise<Object>} Campaign
   */
  async getCampaignBySlug(slug) {
    try {
      const campaign = await Campaign.findOne({ slug })
        .populate("eligibleCategories")
        .populate("createdBy", "name email");

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return campaign;
    } catch (error) {
      throw new Error(`Failed to get campaign: ${error.message}`);
    }
  }

  /**
   * Update campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} updates - Updates to apply
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<Object>} Updated campaign
   */
  async updateCampaign(campaignId, updates, adminUserId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Only allow updates to Draft campaigns
      if (campaign.status !== "Draft") {
        throw new Error("Only Draft campaigns can be updated");
      }

      // Track changes for audit log
      const changes = [];
      for (const [key, value] of Object.entries(updates)) {
        if (campaign[key] !== value) {
          changes.push({
            field: key,
            oldValue: campaign[key],
            newValue: value,
          });
        }
      }

      // Update campaign
      Object.assign(campaign, updates);
      campaign.updatedBy = adminUserId;
      await campaign.save();

      // Log modifications
      for (const change of changes) {
        await this.logAuditEvent(
          campaignId,
          "UPDATE",
          adminUserId,
          change.field,
          String(change.oldValue),
          String(change.newValue),
        );
      }

      return campaign;
    } catch (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }
  }

  /**
   * Publish campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<Object>} Published campaign
   */
  async publishCampaign(campaignId, adminUserId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      if (campaign.status !== "Draft") {
        throw new Error("Only Draft campaigns can be published");
      }

      // Validate required fields
      if (!campaign.name || !campaign.slug || !campaign.discountPercentage) {
        throw new Error("Missing required campaign fields");
      }

      if (campaign.eligibleCategories.length === 0) {
        throw new Error("At least one eligible category is required");
      }

      // Determine status based on current time
      const now = new Date();
      if (now < campaign.startDate) {
        campaign.status = "Scheduled";
      } else if (now >= campaign.startDate && now <= campaign.endDate) {
        campaign.status = "Active";
      } else {
        throw new Error("Campaign dates are in the past");
      }

      campaign.updatedBy = adminUserId;
      await campaign.save();

      // Log publication
      await this.logAuditEvent(campaignId, "PUBLISH", adminUserId, null, null, null, {
        newStatus: campaign.status,
      });

      // Send notification
      await this.createNotification(
        campaignId,
        adminUserId,
        "MILESTONE",
        `Campaign "${campaign.name}" has been published and is now ${campaign.status}`,
      );

      return campaign;
    } catch (error) {
      throw new Error(`Failed to publish campaign: ${error.message}`);
    }
  }

  /**
   * End campaign manually
   * @param {string} campaignId - Campaign ID
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<Object>} Ended campaign
   */
  async endCampaign(campaignId, adminUserId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      if (campaign.status === "Ended" || campaign.status === "Archived") {
        throw new Error("Campaign is already ended or archived");
      }

      campaign.status = "Ended";
      campaign.updatedBy = adminUserId;
      await campaign.save();

      // Log end
      await this.logAuditEvent(campaignId, "END", adminUserId, null, null, null, {
        endedAt: new Date(),
      });

      // Send notification
      await this.createNotification(
        campaignId,
        adminUserId,
        "MILESTONE",
        `Campaign "${campaign.name}" has ended`,
      );

      return campaign;
    } catch (error) {
      throw new Error(`Failed to end campaign: ${error.message}`);
    }
  }

  /**
   * Archive campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<Object>} Archived campaign
   */
  async archiveCampaign(campaignId, adminUserId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      if (campaign.status !== "Ended") {
        throw new Error("Only Ended campaigns can be archived");
      }

      campaign.status = "Archived";
      campaign.updatedBy = adminUserId;
      await campaign.save();

      // Log archival
      await this.logAuditEvent(campaignId, "ARCHIVE", adminUserId, null, null, null, {
        archivedAt: new Date(),
      });

      return campaign;
    } catch (error) {
      throw new Error(`Failed to archive campaign: ${error.message}`);
    }
  }

  /**
   * List campaigns with filters
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated campaigns
   */
  async listCampaigns(filters = {}, page = 1, limit = 10) {
    try {
      const query = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: "i" } },
          { slug: { $regex: filters.search, $options: "i" } },
        ];
      }

      if (filters.startDateFrom && filters.startDateTo) {
        query.startDate = {
          $gte: new Date(filters.startDateFrom),
          $lte: new Date(filters.startDateTo),
        };
      }

      const skip = (page - 1) * limit;
      const sortBy = filters.sortBy || "-createdAt";

      const campaigns = await Campaign.find(query)
        .populate("eligibleCategories")
        .populate("createdBy", "name email")
        .sort(sortBy)
        .skip(skip)
        .limit(limit);

      const total = await Campaign.countDocuments(query);

      return {
        campaigns,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to list campaigns: ${error.message}`);
    }
  }

  /**
   * Validate campaign business rules
   * @param {Object} campaign - Campaign object
   * @returns {Object} Validation result
   */
  validateCampaignRules(campaign) {
    const errors = [];

    // Check duration
    const durationMs = campaign.endDate - campaign.startDate;
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    if (durationDays < 1 || durationDays > 365) {
      errors.push("Campaign duration must be between 1 day and 365 days");
    }

    // Check discount percentage
    if (campaign.discountPercentage < 5 || campaign.discountPercentage > 100) {
      errors.push("Discount percentage must be between 5% and 100%");
    }

    // Check eligible categories
    if (!campaign.eligibleCategories || campaign.eligibleCategories.length === 0) {
      errors.push("At least one eligible category is required");
    }

    // Check vendor limit
    if (campaign.maxProductsPerVendor < 1 || campaign.maxProductsPerVendor > 1000) {
      errors.push("Max products per vendor must be between 1 and 1000");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate URL-friendly slug from name
   * @param {string} name - Campaign name
   * @returns {string} Generated slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /**
   * Log audit event
   * @param {string} campaignId - Campaign ID
   * @param {string} action - Action type
   * @param {string} adminUserId - Admin user ID
   * @param {string} fieldName - Field name (for UPDATE)
   * @param {string} oldValue - Old value (for UPDATE)
   * @param {string} newValue - New value (for UPDATE)
   * @param {Object} details - Additional details
   */
  async logAuditEvent(campaignId, action, adminUserId, fieldName, oldValue, newValue, details) {
    try {
      const auditLog = new CampaignAuditLog({
        campaign: campaignId,
        action,
        adminUser: adminUserId,
        fieldName,
        oldValue,
        newValue,
        details,
      });

      await auditLog.save();
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  }

  /**
   * Create notification
   * @param {string} campaignId - Campaign ID
   * @param {string} recipientId - Recipient user ID
   * @param {string} type - Notification type
   * @param {string} message - Notification message
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
}

module.exports = new CampaignService();
