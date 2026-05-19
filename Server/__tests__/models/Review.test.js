const { ObjectId } = require("mongodb");
const Review = require("../../models/Review");

class FakeCursor {
  constructor(collection) {
    this.collection = collection;
  }

  sort(value) {
    this.collection.lastSort = value;
    return this;
  }

  limit(value) {
    this.collection.lastLimit = value;
    return this;
  }

  skip(value) {
    this.collection.lastSkip = value;
    return this;
  }

  async toArray() {
    return [];
  }
}

class FakeCollection {
  constructor() {
    this.db = {};
  }

  async insertOne(doc) {
    this.lastInsert = doc;
    return { insertedId: new ObjectId() };
  }

  find(query) {
    this.lastFind = query;
    return new FakeCursor(this);
  }

  async countDocuments(query) {
    this.lastCount = query;
    return 3;
  }

  aggregate(pipeline) {
    this.lastAggregate = pipeline;
    return {
      toArray: async () => [
        {
          averageRating: 4.6,
          totalReviews: 4,
          ratingDistribution: [5, 5, 4, 4],
        },
      ],
    };
  }
}

const makeReviewModel = () => {
  const collection = new FakeCollection();
  const db = { collection: () => collection };
  return { review: new Review(db), collection };
};

describe("Review model", () => {
  test("persists verified purchase and video media metadata on create", async () => {
    const { review, collection } = makeReviewModel();
    const productId = new ObjectId().toString();

    await review.create({
      productId,
      userId: "user-1",
      rating: 5,
      comment: "Excellent product",
      images: ["https://cdn.example.com/review.jpg"],
      videos: ["https://cdn.example.com/review.mp4"],
      verified: true,
    });

    expect(collection.lastInsert).toMatchObject({
      productId: expect.any(ObjectId),
      userId: "user-1",
      rating: 5,
      images: ["https://cdn.example.com/review.jpg"],
      videos: ["https://cdn.example.com/review.mp4"],
      verified: true,
    });
  });

  test("filters product reviews by photos and sorts by helpful count", async () => {
    const { review, collection } = makeReviewModel();
    const productId = new ObjectId().toString();

    await review.findByProductId(productId, 20, 5, {
      filterBy: "photos",
      sortBy: "helpful",
    });

    expect(collection.lastFind).toMatchObject({
      productId: { $in: [productId, expect.any(ObjectId)] },
      $or: [
        { "images.0": { $exists: true } },
        { media: { $elemMatch: { type: "image" } } },
      ],
    });
    expect(collection.lastSort).toEqual({ helpful: -1, createdAt: -1 });
    expect(collection.lastLimit).toBe(20);
    expect(collection.lastSkip).toBe(5);
  });

  test("filters verified star reviews and counts media stats", async () => {
    const { review, collection } = makeReviewModel();
    const productId = new ObjectId().toString();

    await review.findByProductId(productId, 10, 0, {
      filterBy: "5",
      sortBy: "lowest",
    });

    expect(collection.lastFind).toMatchObject({
      productId: { $in: [productId, expect.any(ObjectId)] },
      rating: 5,
    });
    expect(collection.lastSort).toEqual({ rating: 1, createdAt: -1 });

    const total = await review.countByProductId(productId, { filterBy: "verified" });
    expect(total).toBe(3);
    expect(collection.lastCount).toMatchObject({
      productId: { $in: [productId, expect.any(ObjectId)] },
      verified: true,
    });

    const stats = await review.getProductRatingStats(productId);
    expect(stats).toMatchObject({
      averageRating: 4.6,
      totalReviews: 4,
      ratingDistribution: { 5: 2, 4: 2, 3: 0, 2: 0, 1: 0 },
      verifiedReviews: 3,
      photoReviews: 3,
      videoReviews: 3,
    });
  });
});
