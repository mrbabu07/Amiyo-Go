import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useAuth from "../hooks/useAuth";
import axios from "axios";
import { auth } from "../firebase/firebase.config";

export default function ProductQA({ productId }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAskForm, setShowAskForm] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, [productId]);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/products/${productId}/questions`,
      );

      if (response.data.success) {
        setQuestions(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!questionText.trim()) return;

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Please login to ask a question");
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/products/${productId}/questions`,
        { question: questionText },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setQuestionText("");
        setShowAskForm(false);
        fetchQuestions(); // Refresh questions
      }
    } catch (error) {
      console.error("Failed to ask question:", error);
      if (error.response?.status === 401) {
        alert("Your session has expired. Please login again.");
      } else {
        alert("Failed to post question. Please try again.");
      }
    }
  };

  const handleAnswerQuestion = async (questionId) => {
    if (!answerText.trim()) return;

    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Please login to answer questions");
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/questions/${questionId}/answers`,
        { answer: answerText },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setAnswerText("");
        setAnsweringQuestionId(null);
        fetchQuestions(); // Refresh questions
      }
    } catch (error) {
      console.error("Failed to answer question:", error);
      if (error.response?.status === 401) {
        alert("Please login to answer questions");
      } else {
        alert("Failed to post answer. Please try again.");
      }
    }
  };

  const handleMarkHelpful = async (questionId, answerId = null) => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Please login to vote");
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/questions/${questionId}/helpful`,
        { answerId },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        fetchQuestions(); // Refresh questions
      }
    } catch (error) {
      console.error("Failed to mark helpful:", error);
      if (error.response?.status === 401) {
        alert("Please login to vote");
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Questions & Answers
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowAskForm(!showAskForm)}
            className="btn-primary text-sm"
          >
            {showAskForm ? "Cancel" : "Ask Question"}
          </button>
        )}
      </div>

      {/* Ask Question Form */}
      <AnimatePresence>
        {showAskForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What would you like to know about this product?"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAskQuestion}
                  className="btn-primary text-sm"
                >
                  Submit Question
                </button>
                <button
                  onClick={() => {
                    setShowAskForm(false);
                    setQuestionText("");
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No questions yet. Be the first to ask!
          </p>
          {user && (
            <button
              onClick={() => setShowAskForm(true)}
              className="btn-primary"
            >
              Ask a Question
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question) => (
            <div
              key={question._id}
              className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0"
            >
              {/* Question */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-primary-600 dark:text-primary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white font-medium mb-2">
                    {question.question}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      {question.askedByUser?.name || "Anonymous"}
                      {question.askedByUser?.verified && (
                        <svg
                          className="w-4 h-4 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                    <span>
                      {new Date(question.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleMarkHelpful(question._id)}
                      className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      Helpful ({question.helpful})
                    </button>
                  </div>

                  {/* Answers */}
                  {question.answers.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {question.answers.map((answer) => (
                        <div
                          key={answer._id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-green-600 dark:text-green-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-900 dark:text-white mb-2">
                                {answer.answer}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  {answer.answeredByName || "Anonymous"}
                                  {answer.role === "admin" && (
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                                      Admin
                                    </span>
                                  )}
                                </span>
                                <span>
                                  {new Date(
                                    answer.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                                <button
                                  onClick={() =>
                                    handleMarkHelpful(question._id, answer._id)
                                  }
                                  className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                    />
                                  </svg>
                                  {answer.helpful}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer Form */}
                  {user && (
                    <div className="mt-4">
                      {answeringQuestionId === question._id ? (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="Write your answer..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows="2"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAnswerQuestion(question._id)}
                              className="btn-primary text-xs"
                            >
                              Submit Answer
                            </button>
                            <button
                              onClick={() => {
                                setAnsweringQuestionId(null);
                                setAnswerText("");
                              }}
                              className="btn-secondary text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAnsweringQuestionId(question._id)}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                        >
                          Answer this question
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
