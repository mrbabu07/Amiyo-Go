import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { auth } from "../../firebase/firebase.config";
import Loading from "../../components/Loading";

export default function AdminQA() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unanswered, answered
  const [answerText, setAnswerText] = useState("");
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);

  useEffect(() => {
    fetchAllQuestions();
  }, []);

  const fetchAllQuestions = async () => {
    try {
      // Fetch all products and their questions
      const productsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/products`,
      );
      const products = productsResponse.data.data;

      // Fetch questions for each product
      const allQuestions = [];
      for (const product of products) {
        try {
          const questionsResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/products/${product._id}/questions`,
          );
          const productQuestions = questionsResponse.data.data.map((q) => ({
            ...q,
            productId: product._id,
            productTitle: product.title,
            productImage: product.image,
          }));
          allQuestions.push(...productQuestions);
        } catch (error) {
          console.error(`Failed to fetch questions for ${product._id}:`, error);
        }
      }

      // Sort by date (newest first)
      allQuestions.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
      setQuestions(allQuestions);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerQuestion = async (questionId) => {
    if (!answerText.trim()) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please login");
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
        fetchAllQuestions(); // Refresh
        alert("Answer posted successfully!");
      }
    } catch (error) {
      console.error("Failed to answer question:", error);
      alert("Failed to post answer. Please try again.");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();

      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/questions/${questionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        fetchAllQuestions(); // Refresh
        alert("Question deleted successfully!");
      }
    } catch (error) {
      console.error("Failed to delete question:", error);
      alert("Failed to delete question.");
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filter === "unanswered") return q.answers.length === 0;
    if (filter === "answered") return q.answers.length > 0;
    return true;
  });

  const stats = {
    total: questions.length,
    unanswered: questions.filter((q) => q.answers.length === 0).length,
    answered: questions.filter((q) => q.answers.length > 0).length,
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Product Q&A Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage customer questions and answers
              </p>
            </div>
            <Link
              to="/admin"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Questions
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Unanswered
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {stats.unanswered}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Answered
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats.answered}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
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
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter("unanswered")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "unanswered"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Unanswered ({stats.unanswered})
              </button>
              <button
                onClick={() => setFilter("answered")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "answered"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Answered ({stats.answered})
              </button>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
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
            <p className="text-gray-600 dark:text-gray-400">
              No questions found
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredQuestions.map((question) => (
              <div
                key={question._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
              >
                {/* Product Info */}
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <img
                    src={question.productImage}
                    alt={question.productTitle}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <Link
                      to={`/product/${question.productId}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      {question.productTitle}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(question.createdAt).toLocaleDateString()} •{" "}
                      {question.askedByUser?.name || "Anonymous"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteQuestion(question._id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Question"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Question */}
                <div className="mb-4">
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Q: {question.question}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>👍 {question.helpful} helpful</span>
                    <span>
                      {question.answers.length}{" "}
                      {question.answers.length === 1 ? "answer" : "answers"}
                    </span>
                  </div>
                </div>

                {/* Existing Answers */}
                {question.answers.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {question.answers.map((answer) => (
                      <div
                        key={answer._id}
                        className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
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
                          <div className="flex-1">
                            <p className="text-gray-900 dark:text-white mb-2">
                              {answer.answer}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                              <span>
                                {answer.answeredByName || "Anonymous"}
                                {answer.role === "admin" && (
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                                    Admin
                                  </span>
                                )}
                              </span>
                              <span>
                                {new Date(
                                  answer.createdAt,
                                ).toLocaleDateString()}
                              </span>
                              <span>👍 {answer.helpful}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Answer Form */}
                {answeringQuestionId === question._id ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Write your answer as admin..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows="3"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAnswerQuestion(question._id)}
                        className="btn-primary text-sm"
                      >
                        Post Answer
                      </button>
                      <button
                        onClick={() => {
                          setAnsweringQuestionId(null);
                          setAnswerText("");
                        }}
                        className="btn-secondary text-sm"
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
                    + Answer this question
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
