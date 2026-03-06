const { ObjectId } = require("mongodb");

const getProductQuestions = async (req, res) => {
  try {
    const Question = req.app.locals.models.Question;
    const { productId } = req.params;

    const questions = await Question.findByProductId(productId);

    res.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createQuestion = async (req, res) => {
  try {
    const Question = req.app.locals.models.Question;
    const { productId } = req.params;
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Question text is required",
      });
    }

    const questionId = await Question.create({
      productId,
      question: question.trim(),
      askedBy: req.user.uid,
    });

    res.status(201).json({
      success: true,
      data: { questionId },
      message: "Question posted successfully",
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const addAnswer = async (req, res) => {
  try {
    const Question = req.app.locals.models.Question;
    const Product = req.app.locals.models.Product;
    const { questionId } = req.params;
    const { answer } = req.body;
    const userId = req.user.uid;
    const vendorId = req.user.vendorId;
    const userRole = req.user.role;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Answer text is required",
      });
    }

    // Determine answerer type and name
    let answererType = "user";
    let answererName = req.user.name || req.user.email;

    if (userRole === "admin") {
      answererType = "admin";
    } else if (vendorId) {
      answererType = "vendor";
      answererName = req.vendor?.shopName || "Vendor";

      // Verify vendor owns the product
      const question = await Question.findById(questionId);
      if (question) {
        const product = await Product.findById(question.productId);
        if (product && product.vendorId.toString() !== vendorId.toString()) {
          return res.status(403).json({
            success: false,
            error: "You can only answer questions for your own products",
          });
        }
      }
    }

    const answerData = {
      answer: answer.trim(),
      answeredBy: vendorId ? vendorId.toString() : userId,
      answeredByName: answererName,
      role: answererType,
    };

    const newAnswer = await Question.addAnswer(questionId, answerData);

    if (!newAnswer) {
      return res.status(404).json({
        success: false,
        error: "Question not found",
      });
    }

    res.json({
      success: true,
      data: newAnswer,
      message: "Answer posted successfully",
    });
  } catch (error) {
    console.error("Error adding answer:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const markHelpful = async (req, res) => {
  try {
    const Question = req.app.locals.models.Question;
    const { questionId } = req.params;
    const { answerId } = req.body;

    const success = await Question.markHelpful(questionId, answerId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Question or answer not found",
      });
    }

    res.json({
      success: true,
      message: "Marked as helpful",
    });
  } catch (error) {
    console.error("Error marking helpful:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const Question = req.app.locals.models.Question;
    const { questionId } = req.params;

    // Check if user is admin or question owner
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        error: "Question not found",
      });
    }

    if (question.askedBy !== req.user.uid && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this question",
      });
    }

    const result = await Question.delete(questionId);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Question not found",
      });
    }

    res.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteAnswer = async (req, res) => {
  try {
    const Question = req.app.locals.models.Question;
    const { questionId, answerId } = req.params;

    // Check if user is admin or answer owner
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        error: "Question not found",
      });
    }

    const answer = question.answers.find((a) => a._id === answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        error: "Answer not found",
      });
    }

    if (answer.answeredBy !== req.user.uid && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this answer",
      });
    }

    const success = await Question.deleteAnswer(questionId, answerId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Answer not found",
      });
    }

    res.json({
      success: true,
      message: "Answer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting answer:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getVendorQuestions = async (req, res) => {
  try {
    const Question = req.app.locals.models.Question;
    const Product = req.app.locals.models.Product;
    const vendorId = req.user.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: "Vendor access required",
      });
    }

    // Get all vendor's products
    const products = await Product.collection
      .find({ vendorId: new ObjectId(vendorId) })
      .toArray();

    const productIds = products.map((p) => p._id);

    // Get all questions for vendor's products
    const questions = await Question.collection
      .find({ productId: { $in: productIds } })
      .sort({ createdAt: -1 })
      .toArray();

    // Attach product info to each question
    const questionsWithProduct = questions.map((question) => {
      const product = products.find(
        (p) => p._id.toString() === question.productId.toString()
      );
      return {
        ...question,
        product: product
          ? {
              _id: product._id,
              title: product.title,
              image: product.image,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: questionsWithProduct,
    });
  } catch (error) {
    console.error("Error fetching vendor questions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getProductQuestions,
  createQuestion,
  addAnswer,
  markHelpful,
  deleteQuestion,
  deleteAnswer,
  getVendorQuestions,
};
