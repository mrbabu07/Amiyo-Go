import { useState } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const mockConversations = [
  {
    id: 1,
    customer: "Rahul Ahmed",
    avatar: "R",
    lastMessage: "Is this available in size L?",
    time: "2m ago",
    unread: 2,
    product: "Men's Casual Shirt",
    messages: [
      { from: "customer", text: "Hi! I wanted to ask about the shirt.", time: "10:30 AM" },
      { from: "customer", text: "Is this available in size L?", time: "10:31 AM" },
    ],
  },
  {
    id: 2,
    customer: "Fatima Islam",
    avatar: "F",
    lastMessage: "Thank you! I received my order.",
    time: "1h ago",
    unread: 0,
    product: "Women's Kurti Set",
    messages: [
      { from: "customer", text: "When will my order arrive?", time: "9:00 AM" },
      { from: "vendor", text: "It has been shipped and will arrive in 2-3 days!", time: "9:05 AM" },
      { from: "customer", text: "Thank you! I received my order.", time: "11:00 AM" },
    ],
  },
  {
    id: 3,
    customer: "Karim Hossain",
    avatar: "K",
    lastMessage: "Can I get a refund?",
    time: "3h ago",
    unread: 1,
    product: "Leather Handbag",
    messages: [
      { from: "customer", text: "The color is slightly different from the photo.", time: "8:00 AM" },
      { from: "customer", text: "Can I get a refund?", time: "8:02 AM" },
    ],
  },
  {
    id: 4,
    customer: "Nila Sultana",
    avatar: "N",
    lastMessage: "Great quality! Will order again.",
    time: "1d ago",
    unread: 0,
    product: "Sports Cap",
    messages: [
      { from: "customer", text: "Just got my order!", time: "Yesterday" },
      { from: "customer", text: "Great quality! Will order again.", time: "Yesterday" },
      { from: "vendor", text: "Thank you so much! We appreciate your support 😊", time: "Yesterday" },
    ],
  },
];

export default function VendorMessages() {
  const [selected, setSelected] = useState(mockConversations[0]);
  const [conversations, setConversations] = useState(mockConversations);
  const [reply, setReply] = useState("");

  const sendReply = () => {
    if (!reply.trim()) return;
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setConversations(prev =>
      prev.map(c =>
        c.id === selected.id
          ? { ...c, lastMessage: reply, time: "Just now", unread: 0, messages: [...c.messages, { from: "vendor", text: reply, time: now }] }
          : c
      )
    );
    setSelected(prev => ({
      ...prev,
      lastMessage: reply,
      messages: [...prev.messages, { from: "vendor", text: reply, time: now }],
    }));
    setReply("");
    toast.success("Message sent!");
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 2000, style: { background: "#363636", color: "#fff" } }} />

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
                Customer Messages
                {totalUnread > 0 && (
                  <span className="ml-2 bg-orange-500 text-white text-sm px-2 py-0.5 rounded-full">{totalUnread}</span>
                )}
              </h1>
              <p className="text-sm text-gray-500">Reply to customer inquiries</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden flex" style={{ height: "70vh" }}>
          {/* Sidebar — Conversation List */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search customers…"
                  className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelected(conv);
                    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
                  }}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-orange-50 transition flex items-start gap-3 ${selected?.id === conv.id ? "bg-orange-50 border-l-2 border-l-orange-500" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                      {conv.avatar}
                    </div>
                    {conv.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {conv.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium truncate ${conv.unread > 0 ? "text-gray-900" : "text-gray-700"}`}>{conv.customer}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{conv.time}</span>
                    </div>
                    <p className="text-xs text-orange-600 truncate">{conv.product}</p>
                    <p className={`text-xs mt-0.5 truncate ${conv.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>{conv.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          {selected ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                  {selected.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selected.customer}</p>
                  <p className="text-xs text-orange-600">Re: {selected.product}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {selected.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === "vendor" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      msg.from === "vendor"
                        ? "bg-orange-500 text-white rounded-br-sm"
                        : "bg-white text-gray-800 rounded-bl-sm border border-gray-200"
                    }`}>
                      <p>{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.from === "vendor" ? "text-orange-200" : "text-gray-400"}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    placeholder="Type your reply…"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    onClick={sendReply}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl transition flex items-center gap-2 font-medium text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-3">💬</div>
                <p>Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
