const { ObjectId } = require("mongodb");

class Question {
  constructor(db) {
    this.collection = db.collection("questions");
  }

  async findByProductId(productId) {
    const pipeline = [
      { $match: { productId: new ObjectId(productId) } },
      {
        $lookup: {
          from: "users",
          localField: "askedBy",
          foreignField: "_id",
          as: "askedByUser",
        },
      },
      {
        $unwind: {
          path: "$askedByUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "askedByUser.verified": {
            $cond: {
              if: { $ifNull: ["$askedByUser.verified", false] },
              then: true,
              else: false,
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  async create(questionData) {
    const result = await this.collection.insertOne({
      ...questionData,
      productId: new ObjectId(questionData.productId),
      askedBy: questionData.askedBy,
      answers: [],
      helpful: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return result.insertedId;
  }

  async addAnswer(questionId, answerData) {
    const answer = {
      _id: new ObjectId().toString(),
      ...answerData,
      helpful: 0,
      createdAt: new Date(),
    };

    const result = await this.collection.updateOne(
      { _id: new ObjectId(questionId) },
      {
        $push: { answers: answer },
        $set: { updatedAt: new Date() },
      },
    );

    return result.modifiedCount > 0 ? answer : null;
  }

  async markHelpful(questionId, answerId = null) {
    if (answerId) {
      // Mark answer as helpful
      const result = await this.collection.updateOne(
        {
          _id: new ObjectId(questionId),
          "answers._id": answerId,
        },
        {
          $inc: { "answers.$.helpful": 1 },
          $set: { updatedAt: new Date() },
        },
      );
      return result.modifiedCount > 0;
    } else {
      // Mark question as helpful
      const result = await this.collection.updateOne(
        { _id: new ObjectId(questionId) },
        {
          $inc: { helpful: 1 },
          $set: { updatedAt: new Date() },
        },
      );
      return result.modifiedCount > 0;
    }
  }

  async findById(questionId) {
    return await this.collection.findOne({ _id: new ObjectId(questionId) });
  }

  async delete(questionId) {
    return await this.collection.deleteOne({ _id: new ObjectId(questionId) });
  }

  async deleteAnswer(questionId, answerId) {
    const result = await this.collection.updateOne(
      { _id: new ObjectId(questionId) },
      {
        $pull: { answers: { _id: answerId } },
        $set: { updatedAt: new Date() },
      },
    );
    return result.modifiedCount > 0;
  }
}

module.exports = Question;
