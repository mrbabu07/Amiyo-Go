const CampaignService = require("../../services/CampaignService");
const Campaign = require("../../models/Campaign");
const CampaignAuditLog = require("../../models/CampaignAuditLog");

jest.mock("../../models/Campaign");
jest.mock("../../models/CampaignAuditLog");

describe("CampaignService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCampaign", () => {
    it("should create a campaign with Draft status", async () => {
      const campaignData = {
        name: "Summer Sale",
        slug: "summer-sale",
        description: "Summer sale campaign",
        bannerImageUrl: "https://example.com/banner.jpg",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-30"),
        discountPercentage: 20,
        eligibleCategories: ["cat1", "cat2"],
        maxProductsPerVendor: 100,
      };

      const mockCampaign = {
        ...campaignData,
        status: "Draft",
        _id: "campaign1",
        save: jest.fn().mockResolvedValue(true),
      };

      Campaign.mockImplementation(() => mockCampaign);
      Campaign.findOne = jest.fn().mockResolvedValue(null);

      const result = await CampaignService.createCampaign(campaignData, "admin1");

      expect(result.status).toBe("Draft");
      expect(mockCampaign.save).toHaveBeenCalled();
    });

    it("should reject duplicate slug", async () => {
      const campaignData = {
        name: "Summer Sale",
        slug: "summer-sale",
        bannerImageUrl: "https://example.com/banner.jpg",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-30"),
        discountPercentage: 20,
        eligibleCategories: ["cat1"],
      };

      Campaign.findOne = jest.fn().mockResolvedValue({ _id: "existing" });

      await expect(CampaignService.createCampaign(campaignData, "admin1")).rejects.toThrow(
        "Campaign slug already exists",
      );
    });

    it("should generate slug if not provided", async () => {
      const campaignData = {
        name: "Summer Sale 2024",
        bannerImageUrl: "https://example.com/banner.jpg",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-30"),
        discountPercentage: 20,
        eligibleCategories: ["cat1"],
      };

      const mockCampaign = {
        ...campaignData,
        slug: "summer-sale-2024",
        status: "Draft",
        save: jest.fn().mockResolvedValue(true),
      };

      Campaign.mockImplementation(() => mockCampaign);
      Campaign.findOne = jest.fn().mockResolvedValue(null);

      const result = await CampaignService.createCampaign(campaignData, "admin1");

      expect(result.slug).toBe("summer-sale-2024");
    });
  });

  describe("publishCampaign", () => {
    it("should publish a Draft campaign to Active if current time is within dates", async () => {
      const now = new Date();
      const mockCampaign = {
        _id: "campaign1",
        status: "Draft",
        name: "Summer Sale",
        slug: "summer-sale",
        discountPercentage: 20,
        eligibleCategories: ["cat1"],
        startDate: new Date(now.getTime() - 1000),
        endDate: new Date(now.getTime() + 1000000),
        save: jest.fn().mockResolvedValue(true),
      };

      Campaign.findById = jest.fn().mockResolvedValue(mockCampaign);

      const result = await CampaignService.publishCampaign("campaign1", "admin1");

      expect(result.status).toBe("Active");
      expect(mockCampaign.save).toHaveBeenCalled();
    });

    it("should publish a Draft campaign to Scheduled if start date is in future", async () => {
      const now = new Date();
      const mockCampaign = {
        _id: "campaign1",
        status: "Draft",
        name: "Summer Sale",
        slug: "summer-sale",
        discountPercentage: 20,
        eligibleCategories: ["cat1"],
        startDate: new Date(now.getTime() + 1000000),
        endDate: new Date(now.getTime() + 2000000),
        save: jest.fn().mockResolvedValue(true),
      };

      Campaign.findById = jest.fn().mockResolvedValue(mockCampaign);

      const result = await CampaignService.publishCampaign("campaign1", "admin1");

      expect(result.status).toBe("Scheduled");
    });

    it("should reject publishing non-Draft campaigns", async () => {
      const mockCampaign = {
        _id: "campaign1",
        status: "Active",
      };

      Campaign.findById = jest.fn().mockResolvedValue(mockCampaign);

      await expect(CampaignService.publishCampaign("campaign1", "admin1")).rejects.toThrow(
        "Only Draft campaigns can be published",
      );
    });
  });

  describe("validateCampaignRules", () => {
    it("should validate campaign duration", () => {
      const campaign = {
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-02"),
        discountPercentage: 20,
        eligibleCategories: ["cat1"],
        maxProductsPerVendor: 100,
      };

      const result = CampaignService.validateCampaignRules(campaign);

      expect(result.isValid).toBe(true);
    });

    it("should reject campaign with duration < 1 day", () => {
      const campaign = {
        startDate: new Date("2024-06-01T10:00:00"),
        endDate: new Date("2024-06-01T11:00:00"),
        discountPercentage: 20,
        eligibleCategories: ["cat1"],
        maxProductsPerVendor: 100,
      };

      const result = CampaignService.validateCampaignRules(campaign);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Campaign duration must be between 1 day and 365 days");
    });

    it("should reject campaign with duration > 365 days", () => {
      const campaign = {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2025-12-31"),
        discountPercentage: 20,
        eligibleCategories: ["cat1"],
        maxProductsPerVendor: 100,
      };

      const result = CampaignService.validateCampaignRules(campaign);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Campaign duration must be between 1 day and 365 days");
    });

    it("should reject invalid discount percentage", () => {
      const campaign = {
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-30"),
        discountPercentage: 3,
        eligibleCategories: ["cat1"],
        maxProductsPerVendor: 100,
      };

      const result = CampaignService.validateCampaignRules(campaign);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Discount percentage must be between 5% and 100%");
    });

    it("should reject campaign with no eligible categories", () => {
      const campaign = {
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-30"),
        discountPercentage: 20,
        eligibleCategories: [],
        maxProductsPerVendor: 100,
      };

      const result = CampaignService.validateCampaignRules(campaign);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("At least one eligible category is required");
    });
  });

  describe("generateSlug", () => {
    it("should generate URL-friendly slug", () => {
      const slug = CampaignService.generateSlug("Summer Sale 2024!");

      expect(slug).toBe("summer-sale-2024");
    });

    it("should handle multiple spaces", () => {
      const slug = CampaignService.generateSlug("Summer   Sale   2024");

      expect(slug).toBe("summer-sale-2024");
    });

    it("should remove special characters", () => {
      const slug = CampaignService.generateSlug("Summer@Sale#2024$");

      expect(slug).toBe("summersale2024");
    });
  });
});
