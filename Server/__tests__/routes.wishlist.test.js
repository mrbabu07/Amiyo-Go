const express = require("express");
const request = require("supertest");

jest.mock("../middleware/auth", () => ({
  verifyToken: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "No token provided" });
    }
    req.user = { uid: "customer-1" };
    return next();
  },
}));

const buildApp = (Wishlist) => {
  const app = express();
  app.use(express.json());
  app.locals.models = { Wishlist };
  app.use("/api/wishlist", require("../routes/wishlistRoutes"));
  return app;
};

describe("wishlist routes black-box behavior", () => {
  test("creates a wishlist collection through the authenticated API", async () => {
    const Wishlist = {
      createCollection: jest.fn().mockResolvedValue({
        id: "wl_gifts",
        name: "Birthday Gifts",
        products: [],
        isPublic: false,
      }),
    };
    const app = buildApp(Wishlist);

    const response = await request(app)
      .post("/api/wishlist/collections")
      .set("Authorization", "Bearer test")
      .send({ name: "Birthday Gifts" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({ id: "wl_gifts", name: "Birthday Gifts" }),
      message: "Wishlist collection created",
    });
    expect(Wishlist.createCollection).toHaveBeenCalledWith("customer-1", "Birthday Gifts");
  });

  test("updates item alerts through the authenticated API", async () => {
    const Wishlist = {
      setProductAlert: jest.fn().mockResolvedValue({
        productId: "64f000000000000000000001",
        collectionId: "wl_gifts",
        priceDrop: { enabled: true, targetPrice: 500 },
        backInStock: { enabled: true },
        flashSale: { enabled: true },
      }),
    };
    const app = buildApp(Wishlist);

    const response = await request(app)
      .patch("/api/wishlist/alerts/64f000000000000000000001")
      .set("Authorization", "Bearer test")
      .send({
        collectionId: "wl_gifts",
        priceDrop: { enabled: true, targetPrice: 500 },
        backInStock: { enabled: true },
        flashSale: { enabled: true },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        collectionId: "wl_gifts",
        priceDrop: { enabled: true, targetPrice: 500 },
      }),
      message: "Wishlist alert updated",
    });
  });

  test("serves a shared wishlist collection without auth", async () => {
    const Wishlist = {
      getSharedWishlistWithProducts: jest.fn().mockResolvedValue({
        shareId: "share-123",
        collection: {
          id: "wl_gifts",
          name: "Tech Wants",
          productDetails: [{ _id: "p1", title: "Phone", price: 1000 }],
        },
        productDetails: [{ _id: "p1", title: "Phone", price: 1000 }],
        userDetails: [{ name: "Customer One" }],
      }),
    };
    const app = buildApp(Wishlist);

    const response = await request(app).get("/api/wishlist/shared/share-123");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        shareId: "share-123",
        collection: expect.objectContaining({ name: "Tech Wants" }),
      }),
    });
    expect(Wishlist.getSharedWishlistWithProducts).toHaveBeenCalledWith("share-123");
  });
});
