const Campaign = require("../models/Campaign");

class DiscountCalculatorService {
  /**
   * Calculate discounted price
   * @param {number} basePrice - Base price
   * @param {number} discountPercentage - Discount percentage
   * @returns {number} Discounted price
   */
  calculateDiscountedPrice(basePrice, discountPercentage) {
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error("Discount percentage must be between 0 and 100");
    }

    const discountAmount = basePrice * (discountPercentage / 100);
    const discountedPrice = basePrice - discountAmount;

    // Round to 2 decimal places
    return Math.round(discountedPrice * 100) / 100;
  }

  /**
   * Get applicable campaigns for a product at a specific time
   * @param {string} productId - Product ID
   * @param {Date} timestamp - Timestamp to check
   * @returns {Promise<Array>} Applicable campaigns
   */
  async getApplicableCampaigns(productId, timestamp = new Date()) {
    try {
      const campaigns = await Campaign.find({
        status: "Active",
        startDate: { $lte: timestamp },
        endDate: { $gte: timestamp },
      }).populate("eligibleCategories");

      // Filter campaigns where product's category is eligible
      const applicableCampaigns = campaigns.filter((campaign) => {
        // This would need to check if the product belongs to any eligible category
        // For now, return all active campaigns
        return true;
      });

      return applicableCampaigns;
    } catch (error) {
      throw new Error(`Failed to get applicable campaigns: ${error.message}`);
    }
  }

  /**
   * Get the highest discount from multiple campaigns
   * @param {Array} campaigns - Array of campaign objects
   * @returns {Object} Campaign with highest discount
   */
  getHighestDiscount(campaigns) {
    if (!campaigns || campaigns.length === 0) {
      return null;
    }

    return campaigns.reduce((highest, current) => {
      return current.discountPercentage > highest.discountPercentage ? current : highest;
    });
  }

  /**
   * Apply discount to order items
   * @param {Array} orderItems - Array of order items
   * @param {Array} campaigns - Array of applicable campaigns
   * @returns {Array} Order items with discounts applied
   */
  applyDiscount(orderItems, campaigns) {
    if (!campaigns || campaigns.length === 0) {
      return orderItems;
    }

    const highestCampaign = this.getHighestDiscount(campaigns);

    if (!highestCampaign) {
      return orderItems;
    }

    return orderItems.map((item) => {
      const discountedPrice = this.calculateDiscountedPrice(
        item.price,
        highestCampaign.discountPercentage,
      );

      return {
        ...item,
        originalPrice: item.price,
        discountedPrice,
        discountPercentage: highestCampaign.discountPercentage,
        campaignId: highestCampaign._id,
        discountAmount: item.price - discountedPrice,
      };
    });
  }

  /**
   * Calculate total discount for an order
   * @param {Array} orderItems - Array of order items with prices
   * @param {number} discountPercentage - Discount percentage
   * @returns {Object} Discount calculation details
   */
  calculateOrderDiscount(orderItems, discountPercentage) {
    let subtotal = 0;
    let totalDiscount = 0;

    for (const item of orderItems) {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      const itemDiscount = itemTotal * (discountPercentage / 100);
      totalDiscount += itemDiscount;
    }

    const finalTotal = subtotal - totalDiscount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(totalDiscount * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      discountPercentage,
    };
  }

  /**
   * Validate discount doesn't reduce price below cost
   * @param {number} basePrice - Base price
   * @param {number} cost - Product cost
   * @param {number} discountPercentage - Discount percentage
   * @returns {boolean} True if discount is valid
   */
  validateDiscountFloor(basePrice, cost, discountPercentage) {
    const discountedPrice = this.calculateDiscountedPrice(basePrice, discountPercentage);
    return discountedPrice >= cost;
  }

  /**
   * Get discount summary for multiple campaigns
   * @param {Array} campaigns - Array of campaigns
   * @returns {Object} Discount summary
   */
  getDiscountSummary(campaigns) {
    if (!campaigns || campaigns.length === 0) {
      return {
        applicableCampaigns: 0,
        highestDiscount: 0,
        campaigns: [],
      };
    }

    const sorted = campaigns.sort((a, b) => b.discountPercentage - a.discountPercentage);

    return {
      applicableCampaigns: campaigns.length,
      highestDiscount: sorted[0].discountPercentage,
      campaigns: sorted.map((c) => ({
        id: c._id,
        name: c.name,
        discountPercentage: c.discountPercentage,
      })),
    };
  }
}

module.exports = new DiscountCalculatorService();
