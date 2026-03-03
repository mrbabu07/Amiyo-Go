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
    const { questionId } = req.params;
    const { answer } = req.body;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Answer text is required",
      });
    }

    const answerData = {
      answer: answer.trim(),
      answeredBy: req.user.uid,
      answeredByName: req.user.name || req.user.email,
      role: req.user.role || "user",
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

module.exports = {
  getProductQuestions,
  createQuestion,
  addAnswer,
  markHelpful,
  deleteQuestion,
  deleteAnswer,
};
