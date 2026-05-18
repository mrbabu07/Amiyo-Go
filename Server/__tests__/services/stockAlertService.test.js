const mockProductModel = {
  find: jest.fn(),
};

const mockStockAlert = {
  find: jest.fn(),
};

jest.mock("mongoose", () => ({
  Schema: jest.fn(),
  models: {},
  model: jest.fn(() => mockProductModel),
}));

jest.mock("../../models/StockAlert", () => mockStockAlert);

jest.mock("../../services/emailService", () => ({
  sendEmail: jest.fn(),
  sendStockAlert: jest.fn(),
}));

jest.mock("../../services/notificationService", () => ({
  sendBackInStockNotification: jest.fn(),
  sendStockAlertNotification: jest.fn(),
}));

const emailService = require("../../services/emailService");
const NotificationService = require("../../services/notificationService");
const stockAlertService = require("../../services/stockAlertService");

describe("stockAlertService workflow hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = "https://amiyo.example";
  });

  test("sends low-stock customer email and push notification through the real workflow", async () => {
    emailService.sendEmail.mockResolvedValue({ success: true });
    NotificationService.sendStockAlertNotification.mockResolvedValue({ success: true });

    const product = {
      _id: "product-1",
      title: "Premium Rice",
      stock: 3,
      toObject: () => ({ _id: "product-1", stock: 3 }),
    };
    const models = { NotificationSubscription: {} };

    const sent = await stockAlertService.sendLowStockEmail(
      { email: "buyer@example.com", userId: "user-1", productId: product },
      models,
    );

    expect(sent).toBe(true);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "buyer@example.com",
      "Hurry! Only 3 left: Premium Rice",
      expect.stringContaining("https://amiyo.example/products/product-1"),
    );
    expect(NotificationService.sendStockAlertNotification).toHaveBeenCalledWith(
      "low_stock",
      expect.objectContaining({ _id: "product-1", title: "Premium Rice" }),
      ["user-1"],
      models,
    );
  });

  test("sends price-drop push as price_drop and passes notification models", async () => {
    emailService.sendEmail.mockResolvedValue({ success: true });
    NotificationService.sendStockAlertNotification.mockResolvedValue({ success: true });

    const models = { NotificationSubscription: {} };
    const sent = await stockAlertService.sendPriceDropEmail(
      {
        email: "buyer@example.com",
        userId: "user-1",
        priceThreshold: 100,
        productId: {
          _id: "product-2",
          name: "Mustard Oil",
          price: 80,
          toObject: () => ({ _id: "product-2", price: 80 }),
        },
      },
      models,
    );

    expect(sent).toBe(true);
    expect(NotificationService.sendStockAlertNotification).toHaveBeenCalledWith(
      "price_drop",
      expect.objectContaining({ _id: "product-2", title: "Mustard Oil" }),
      ["user-1"],
      models,
    );
  });

  test("low-stock checker marks only successfully delivered alerts as notified", async () => {
    const successfulAlert = {
      email: "one@example.com",
      productId: { _id: "product-3", title: "Lentils", stock: 2 },
      save: jest.fn().mockResolvedValue(true),
    };
    const failedAlert = {
      email: "two@example.com",
      productId: { _id: "product-3", title: "Lentils", stock: 2 },
      save: jest.fn().mockResolvedValue(true),
    };

    mockProductModel.find.mockResolvedValue([{ _id: "product-3" }]);
    mockStockAlert.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([successfulAlert, failedAlert]),
    });
    emailService.sendEmail
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false });

    const sentCount = await stockAlertService.checkLowStockAlerts();

    expect(sentCount).toBe(1);
    expect(successfulAlert.notified).toBe(true);
    expect(successfulAlert.notifiedAt).toBeInstanceOf(Date);
    expect(successfulAlert.save).toHaveBeenCalledTimes(1);
    expect(failedAlert.notified).toBeUndefined();
    expect(failedAlert.save).not.toHaveBeenCalled();
  });
});
