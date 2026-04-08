const DiscountCalculatorService = require("../../services/DiscountCalculatorService");

describe("DiscountCalculatorService", () => {
  describe("calculateDiscountedPrice", () => {
    it("should calculate discounted price correctly", () => {
      const basePrice = 100;
      const discountPercentage = 20;

      const result = DiscountCalculatorService.calculateDiscountedPrice(basePrice, discountPercentage);

      expect(result).toBe(80);
    });

    it("should handle decimal prices", () => {
      const basePrice = 99.99;
      const discountPercentage = 10;

      const result = DiscountCalculatorService.calculateDiscountedPrice(basePrice, discountPercentage);

      expect(result).toBe(89.99);
    });

    it("should handle 5% minimum discount", () => {
      const basePrice = 100;
      const discountPercentage = 5;

      const result = DiscountCalculatorService.calculateDiscountedPrice(basePrice, discountPercentage);

      expect(result).toBe(95);
    });

    it("should handle 100% discount", () => {
      const basePrice = 100;
      const discountPercentage = 100;

      const result = DiscountCalculatorService.calculateDiscountedPrice(basePrice, discountPercentage);

      expect(result).toBe(0);
    });

    it("should reject invalid discount percentage", () => {
      const basePrice = 100;
      const discountPercentage = 150;

      expect(() => {
        DiscountCalculatorService.calculateDiscountedPrice(basePrice, discountPercentage);
      }).toThrow("Discount percentage must be between 0 and 100");
    });

    it("should round to 2 decimal places", () => {
      const basePrice = 100;
      const discountPercentage = 33;

      const result = DiscountCalculatorService.calculateDiscountedPrice(basePrice, discountPercentage);

      expect(result).toBe(67);
    });
  });

  describe("getHighestDiscount", () => {
    it("should return campaign with highest discount", () => {
      const campaigns = [
        { _id: "1", name: "Campaign 1", discountPercentage: 10 },
        { _id: "2", name: "Campaign 2", discountPercentage: 25 },
        { _id: "3", name: "Campaign 3", discountPercentage: 15 },
      ];

      const result = DiscountCalculatorService.getHighestDiscount(campaigns);

      expect(result._id).toBe("2");
      expect(result.discountPercentage).toBe(25);
    });

    it("should return null for empty array", () => {
      const result = DiscountCalculatorService.getHighestDiscount([]);

      expect(result).toBeNull();
    });

    it("should return null for null input", () => {
      const result = DiscountCalculatorService.getHighestDiscount(null);

      expect(result).toBeNull();
    });
  });

  describe("calculateOrderDiscount", () => {
    it("should calculate total discount for order", () => {
      const orderItems = [
        { price: 100, quantity: 2 },
        { price: 50, quantity: 1 },
      ];
      const discountPercentage = 10;

      const result = DiscountCalculatorService.calculateOrderDiscount(orderItems, discountPercentage);

      expect(result.subtotal).toBe(250);
      expect(result.discountAmount).toBe(25);
      expect(result.finalTotal).toBe(225);
    });

    it("should handle zero discount", () => {
      const orderItems = [{ price: 100, quantity: 1 }];
      const discountPercentage = 0;

      const result = DiscountCalculatorService.calculateOrderDiscount(orderItems, discountPercentage);

      expect(result.subtotal).toBe(100);
      expect(result.discountAmount).toBe(0);
      expect(result.finalTotal).toBe(100);
    });

    it("should handle 100% discount", () => {
      const orderItems = [{ price: 100, quantity: 1 }];
      const discountPercentage = 100;

      const result = DiscountCalculatorService.calculateOrderDiscount(orderItems, discountPercentage);

      expect(result.subtotal).toBe(100);
      expect(result.discountAmount).toBe(100);
      expect(result.finalTotal).toBe(0);
    });
  });

  describe("validateDiscountFloor", () => {
    it("should validate discount does not reduce price below cost", () => {
      const basePrice = 100;
      const cost = 50;
      const discountPercentage = 40;

      const result = DiscountCalculatorService.validateDiscountFloor(basePrice, cost, discountPercentage);

      expect(result).toBe(true);
    });

    it("should reject discount that reduces price below cost", () => {
      const basePrice = 100;
      const cost = 70;
      const discountPercentage = 40;

      const result = DiscountCalculatorService.validateDiscountFloor(basePrice, cost, discountPercentage);

      expect(result).toBe(false);
    });

    it("should allow discount that equals cost", () => {
      const basePrice = 100;
      const cost = 60;
      const discountPercentage = 40;

      const result = DiscountCalculatorService.validateDiscountFloor(basePrice, cost, discountPercentage);

      expect(result).toBe(true);
    });
  });

  describe("getDiscountSummary", () => {
    it("should return discount summary for multiple campaigns", () => {
      const campaigns = [
        { _id: "1", name: "Campaign 1", discountPercentage: 10 },
        { _id: "2", name: "Campaign 2", discountPercentage: 25 },
        { _id: "3", name: "Campaign 3", discountPercentage: 15 },
      ];

      const result = DiscountCalculatorService.getDiscountSummary(campaigns);

      expect(result.applicableCampaigns).toBe(3);
      expect(result.highestDiscount).toBe(25);
      expect(result.campaigns[0].discountPercentage).toBe(25);
    });

    it("should return empty summary for no campaigns", () => {
      const result = DiscountCalculatorService.getDiscountSummary([]);

      expect(result.applicableCampaigns).toBe(0);
      expect(result.highestDiscount).toBe(0);
      expect(result.campaigns).toEqual([]);
    });
  });
});
