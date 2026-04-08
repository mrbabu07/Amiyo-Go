const CampaignProduct = require("../models/CampaignProduct");
const Campaign = require("../models/Campaign");
const CampaignAuditLog = require("../models/CampaignAuditLog");
const CampaignNotification = require("../models/CampaignNotification");

class ProductManagerService {
  /**
   * Add products to campaign
   * @param {string} campaignId - Campaign ID
   * @param {Array} productIds - Array of product IDs
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<Array>} Added campaign products
   */
  async addProductsToCampaign(campaignId, productIds, adminUserId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const addedProducts = [];

      for (const productId of productIds) {
        // Check if product already exists in campaign
        const existing = await CampaignProduct.findOne({
          campaign: campaignId,
          product: productId,
        });

        if (existing) {
          continue;
        }

        // Check vendor limit
        const vendorProductCount = await CampaignProduct.countDocuments({
          campaign: campaignId,
          vendor: productId, // This should be vendor ID, not product ID
        });

        if (vendorProductCount >= campaign.maxProductsPerVendor) {
          throw new Error(
            `Vendor has reached maximum products limit (${campaign.maxProductsPerVendor})`,
          );
        }

        // Create campaign product
        const campaignProduct = new CampaignProduct({
          campaign: campaignId,
          product: productId,
          vendor: productId, // This should be extracted from product
          basePrice: 0, // Should be fetched from product
          discountedPrice: 0, // Should be calculated
          addedBy: adminUserId,
        });

        await campaignProduct.save();
        addedProducts.push(campaignProduct);

        // Log addition
        await this.logAuditEvent(campaignId, "ADD_PRODUCT", adminUserId, {
          productId,
        });
      }

      return addedProducts;
    } catch (error) {
      throw new Error(`Failed to add products: ${error.message}`);
    }
  }

  /**
   * Remove product from campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} productId - Product ID
   * @param {string} adminUserId - Admin user ID
   */
  async removeProductFromCampaign(campaignId, productId, adminUserId) {
    try {
      const campaignProduct = await CampaignProduct.findOneAndDelete({
        campaign: campaignId,
        product: productId,
      });

      if (!campaignProduct) {
        throw new Error("Product not found in campaign");
      }

      // Log removal
      await this.logAuditEvent(campaignId, "DELETE_PRODUCT", adminUserId, {
        productId,
        removedAt: new Date(),
      });
    } catch (error) {
      throw new Error(`Failed to remove product: ${error.message}`);
    }
  }

  /**
   * Validate product eligibility
   * @param {string} campaignId - Campaign ID
   * @param {string} productId - Product ID
   * @param {string} categoryId - Product category ID
   * @returns {Promise<boolean>} True if product is eligible
   */
  async validateProductEligibility(campaignId, productId, categoryId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Check if category is in eligible categories
      const isEligible = campaign.eligibleCategories.some(
        (cat) => cat.toString() === categoryId.toString(),
      );

      return isEligible;
    } catch (error) {
      throw new Error(`Failed to validate product eligibility: ${error.message}`);
    }
  }

  /**
   * Check vendor product limit
   * @param {string} campaignId - Campaign ID
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} Vendor limit info
   */
  async checkVendorLimit(campaignId, vendorId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const productCount = await CampaignProduct.countDocuments({
        campaign: campaignId,
        vendor: vendorId,
      });

      return {
        vendorId,
        currentCount: productCount,
        maxLimit: campaign.maxProductsPerVendor,
        remainingSlots: campaign.maxProductsPerVendor - productCount,
        isAtLimit: productCount >= campaign.maxProductsPerVendor,
      };
    } catch (error) {
      throw new Error(`Failed to check vendor limit: ${error.message}`);
    }
  }

  /**
   * Get eligible products for campaign
   * @param {string} campaignId - Campaign ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated products
   */
  async getEligibleProducts(campaignId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const products = await CampaignProduct.find({ campaign: campaignId })
        .populate("product")
        .populate("vendor")
        .skip(skip)
        .limit(limit);

      const total = await CampaignProduct.countDocuments({ campaign: campaignId });

      return {
        products,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get eligible products: ${error.message}`);
    }
  }

  /**
   * Get vendor product count in campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<number>} Product count
   */
  async getVendorProductCount(campaignId, vendorId) {
    try {
      const count = await CampaignProduct.countDocuments({
        campaign: campaignId,
        vendor: vendorId,
      });

      return count;
    } catch (error) {
      throw new Error(`Failed to get vendor product count: ${error.message}`);
    }
  }

  /**
   * Export campaign products to CSV
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<string>} CSV data
   */
  async exportProducts(campaignId) {
    try {
      const products = await CampaignProduct.find({ campaign: campaignId })
        .populate("product", "name sku")
        .populate("vendor", "name");

      let csv = "Product Name,SKU,Base Price,Discounted Price,Vendor,Discount Amount\n";

      for (const cp of products) {
        const discountAmount = cp.basePrice - cp.discountedPrice;
        csv += `${cp.product.name},${cp.product.sku},${cp.basePrice},${cp.discountedPrice},${cp.vendor.name},${discountAmount}\n`;
      }

      return csv;
    } catch (error) {
      throw new Error(`Failed to export products: ${error.message}`);
    }
  }

  /**
   * Update product prices in campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} productId - Product ID
   * @param {number} basePrice - Base price
   * @param {number} discountedPrice - Discounted price
   */
  async updateProductPrices(campaignId, productId, basePrice, discountedPrice) {
    try {
      const campaignProduct = await CampaignProduct.findOneAndUpdate(
        { campaign: campaignId, product: productId },
        { basePrice, discountedPrice },
        { new: true },
      );

      if (!campaignProduct) {
        throw new Error("Product not found in campaign");
      }

      return campaignProduct;
    } catch (error) {
      throw new Error(`Failed to update product prices: ${error.message}`);
    }
  }

  /**
   * Get products by vendor in campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Array>} Vendor products
   */
  async getVendorProducts(campaignId, vendorId) {
    try {
      const products = await CampaignProduct.find({
        campaign: campaignId,
        vendor: vendorId,
      }).populate("product");

      return products;
    } catch (error) {
      throw new Error(`Failed to get vendor products: ${error.message}`);
    }
  }

  /**
   * Log audit event
   * @param {string} campaignId - Campaign ID
   * @param {string} action - Action type
   * @param {string} adminUserId - Admin user ID
   * @param {Object} details - Additional details
   */
  async logAuditEvent(campaignId, action, adminUserId, details) {
    try {
      const auditLog = new CampaignAuditLog({
        campaign: campaignId,
        action,
        adminUser: adminUserId,
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

module.exports = new ProductManagerService();
