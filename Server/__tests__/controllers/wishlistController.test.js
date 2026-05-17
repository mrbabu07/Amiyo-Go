const wishlistController = require("../../controllers/wishlistController");

const buildResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

const buildRequest = ({ Wishlist, body = {}, params = {} }) => ({
  body,
  params,
  user: { uid: "customer-1" },
  app: { locals: { models: { Wishlist } } },
});

describe("wishlistController collections and alerts", () => {
  test("createWishlistCollection creates a named collection for the user", async () => {
    const Wishlist = {
      createCollection: jest.fn().mockResolvedValue({
        id: "wl_gifts",
        name: "Birthday Gifts",
        products: [],
        isPublic: false,
      }),
    };
    const req = buildRequest({ Wishlist, body: { name: "Birthday Gifts" } });
    const res = buildResponse();

    await wishlistController.createWishlistCollection(req, res);

    expect(Wishlist.createCollection).toHaveBeenCalledWith("customer-1", "Birthday Gifts");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ id: "wl_gifts", name: "Birthday Gifts" }),
      message: "Wishlist collection created",
    });
  });

  test("addWishlistCollectionItem stores a product in a selected collection", async () => {
    const Wishlist = {
      addProduct: jest.fn().mockResolvedValue({
        success: true,
        message: "Product added to collection",
      }),
    };
    const req = buildRequest({
      Wishlist,
      params: { collectionId: "wl_gifts" },
      body: { productId: "64f000000000000000000001" },
    });
    const res = buildResponse();

    await wishlistController.addWishlistCollectionItem(req, res);

    expect(Wishlist.addProduct).toHaveBeenCalledWith(
      "customer-1",
      "64f000000000000000000001",
      "wl_gifts",
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Product added to collection",
    });
  });

  test("shareWishlistCollection exposes a collection share id", async () => {
    const Wishlist = {
      setCollectionPublic: jest.fn().mockResolvedValue({
        success: true,
        collection: {
          id: "wl_gifts",
          name: "Birthday Gifts",
          isPublic: true,
          shareId: "share-123",
        },
      }),
    };
    const req = buildRequest({
      Wishlist,
      params: { collectionId: "wl_gifts" },
      body: { isPublic: true },
    });
    const res = buildResponse();

    await wishlistController.shareWishlistCollection(req, res);

    expect(Wishlist.setCollectionPublic).toHaveBeenCalledWith("customer-1", "wl_gifts", true);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ shareId: "share-123" }),
      isPublic: true,
      shareId: "share-123",
      message: "Wishlist collection is now public",
    });
  });

  test("updateWishlistAlert saves price, stock, and flash-sale alert preferences", async () => {
    const alert = {
      productId: "64f000000000000000000001",
      collectionId: "wl_gifts",
      priceDrop: { enabled: true, targetPrice: 500 },
      backInStock: { enabled: true },
      flashSale: { enabled: true },
    };
    const Wishlist = {
      setProductAlert: jest.fn().mockResolvedValue(alert),
    };
    const req = buildRequest({
      Wishlist,
      params: { productId: "64f000000000000000000001" },
      body: {
        collectionId: "wl_gifts",
        priceDrop: { enabled: true, targetPrice: 500 },
        backInStock: { enabled: true },
        flashSale: { enabled: true },
      },
    });
    const res = buildResponse();

    await wishlistController.updateWishlistAlert(req, res);

    expect(Wishlist.setProductAlert).toHaveBeenCalledWith(
      "customer-1",
      "64f000000000000000000001",
      req.body,
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: alert,
      message: "Wishlist alert updated",
    });
  });
});
