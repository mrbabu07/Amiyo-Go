import { useState } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const mockQAs = [
  {
    id: 1,
    customer: "Rakib M.",
    product: "Men's Casual Shirt",
    question: "Is this shirt true to size? I usually wear a size L but sometimes XL in local brands.",
    date: "2026-03-02",
    answer: null,
    votes: 5,
  },
  {
    id: 2,
    customer: "Samia K.",
    product: "Women's Kurti Set",
    question: "What material is this made of? Is it suitable for summer?",
    date: "2026-03-01",
    answer: "This kurti is made of 100% cotton, making it perfect for warm Bangladeshi summers!",
    votes: 11,
  },
  {
    id: 3,
    customer: "Tawfiq A.",
    product: "Leather Handbag",
    question: "Is this genuine leather or synthetic?",
    date: "2026-02-28",
    answer: null,
    votes: 14,
  },
  {
    id: 4,
    customer: "Roshni B.",
    product: "Sports Cap",
    question: "Is this adjustable? What is the one-size-fits-all measurement?",
    date: "2026-02-27",
    answer: "Yes! The cap is fully adjustable with a snapback closure. It fits head circumferences from 56–61cm.",
    votes: 7,
  },
  {
    id: 5,
    customer: "Omar F.",
    product: "Kids Sneakers",
    question: "Do you have size 32 available?",
    date: "2026-02-25",
    answer: null,
    votes: 3,
  },
];

export default function VendorQA() {
  const [qas, setQAs] = useState(mockQAs);
  const [filter, setFilter] = useState("all");
  const [answeringId, setAnsweringId] = useState(null);
  const [answerText, setAnswerText] = useState("");

  const filtered = filter === "all" ? qas
    : filter === "pending" ? qas.filter(q => !q.answer)
    : qas.filter(q => !!q.answer);

  const submitAnswer = (id) => {
    if (!answerText.trim()) { toast.error("Please enter your answer"); return; }
    setQAs(prev => prev.map(q => q.id === id ? { ...q, answer: answerText } : q));
    toast.success("Answer published!");
    setAnsweringId(null);
    setAnswerText("");
  };

  const pending = qas.filter(q => !q.answer).length;

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
          {filtered.map((q) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-5">
                {/* Question */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-sm">Q</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900 leading-relaxed">{q.question}</p>
                      {!q.answer && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">Needs Answer</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>👤 {q.customer}</span>
                      <span>📦 {q.product}</span>
                      <span>📅 {new Date(q.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span>👍 {q.votes} votes</span>
                    </div>
                  </div>
                </div>

                {/* Existing Answer */}
                {q.answer && (
                  <div className="flex items-start gap-3 mb-4 pl-3 border-l-2 border-orange-300">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold text-sm">A</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-orange-700 mb-1">🏪 Your Answer</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{q.answer}</p>
                    </div>
                  </div>
                )}

                {/* Answer form */}
                {answeringId === q.id ? (
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
                      <button onClick={() => submitAnswer(q.id)} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
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
                      onClick={() => { setAnsweringId(q.id); setAnswerText(q.answer || ""); }}
                      className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      {q.answer ? "Edit Answer" : "Answer this question"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

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
