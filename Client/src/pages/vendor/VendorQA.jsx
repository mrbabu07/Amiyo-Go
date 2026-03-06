import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";

export default function VendorQA() {
  const { user } = useAuth();
  const [qas, setQAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [answeringId, setAnsweringId] = useState(null);
  const [answerText, setAnswerText] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/vendor/my-questions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setQAs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (questionId) => {
    if (!answerText.trim()) {
      toast.error("Please enter your answer");
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/questions/${questionId}/answers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ answer: answerText }),
        }
      );

      if (res.ok) {
        toast.success("Answer published!");
        setAnsweringId(null);
        setAnswerText("");
        fetchQuestions();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit answer');
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast.error('Failed to submit answer');
    }
  };

  const hasVendorAnswer = (question) => {
    return question.answers?.some(a => a.role === 'vendor');
  };

  const getVendorAnswer = (question) => {
    return question.answers?.find(a => a.role === 'vendor');
  };

  const filtered = filter === "all" ? qas
    : filter === "pending" ? qas.filter(q => !hasVendorAnswer(q))
    : qas.filter(q => hasVendorAnswer(q));

  const pending = qas.filter(q => !hasVendorAnswer(q)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 2500, style: { background: "#363636", color: "#fff" } }} />

      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/vendor/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Q&amp;A Management
                {pending > 0 && <span className="ml-2 bg-orange-500 text-white text-sm px-2 py-0.5 rounded-full">{pending}</span>}
              </h1>
              <p className="text-sm text-gray-500">Answer customer questions to boost buyer confidence</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Questions", value: qas.length, color: "text-gray-900" },
            { label: "Unanswered", value: pending, color: "text-orange-600" },
            { label: "Answered", value: qas.length - pending, color: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tips banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <p className="font-medium text-blue-900 text-sm">Tip: Answering questions quickly improves conversion!</p>
            <p className="text-xs text-blue-600 mt-0.5">Questions with answers get 3× more purchase intent from new buyers.</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-6 flex gap-2">
          {[
            { key: "all", label: "All Questions" },
            { key: "pending", label: `⏳ Unanswered (${pending})` },
            { key: "answered", label: "✅ Answered" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f.key ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Q&A list */}
        <div className="space-y-4">
          {filtered.map((q) => {
            const vendorAnswer = getVendorAnswer(q);
            return (
              <div key={q._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-5">
                  {/* Question */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 font-bold text-sm">Q</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-gray-900 leading-relaxed">{q.question}</p>
                        {!vendorAnswer && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">Needs Answer</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>📦 {q.product?.title || 'Product'}</span>
                        <span>📅 {new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span>👍 {q.helpful || 0} helpful</span>
                      </div>
                    </div>
                  </div>

                  {/* Existing Answer */}
                  {vendorAnswer && (
                    <div className="flex items-start gap-3 mb-4 pl-3 border-l-2 border-orange-300">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-600 font-bold text-sm">A</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-orange-700 mb-1">🏪 Your Answer</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{vendorAnswer.answer}</p>
                      </div>
                    </div>
                  )}

                  {/* Answer form */}
                  {answeringId === q._id ? (
                    <div className="pl-11">
                      <textarea
                        rows={3}
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Write a clear, helpful answer for this customer..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => submitAnswer(q._id)} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
                          Publish Answer
                        </button>
                        <button onClick={() => setAnsweringId(null)} className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-11">
                      <button
                        onClick={() => { setAnsweringId(q._id); setAnswerText(vendorAnswer?.answer || ""); }}
                        className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {vendorAnswer ? "Edit Answer" : "Answer this question"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">❓</div>
              <p className="font-medium text-gray-600">No questions here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
