const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  getProductQuestions,
  createQuestion,
  addAnswer,
  markHelpful,
  deleteQuestion,
  deleteAnswer,
} = require("../controllers/questionController");

// Public routes
router.get("/products/:productId/questions", getProductQuestions);

// Protected routes
router.post("/products/:productId/questions", verifyToken, createQuestion);
router.post("/questions/:questionId/answers", verifyToken, addAnswer);
router.post("/questions/:questionId/helpful", verifyToken, markHelpful);
router.delete("/questions/:questionId", verifyToken, deleteQuestion);
router.delete(
  "/questions/:questionId/answers/:answerId",
  verifyToken,
  deleteAnswer,
);

module.exports = router;
