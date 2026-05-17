import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import Modal from "../components/Modal";
import Loading from "../components/Loading";
import BackButton from "../components/BackButton";
import {
  askSupportBot,
  getSupportContactOptions,
  getSupportFaqs,
} from "../services/api";

const Support = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [faqQuery, setFaqQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [faqArticles, setFaqArticles] = useState([]);
  const [faqTopics, setFaqTopics] = useState([]);
  const [botQuestion, setBotQuestion] = useState("");
  const [botAnswer, setBotAnswer] = useState(null);
  const [contactOptions, setContactOptions] = useState([]);
  const [createForm, setCreateForm] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "general",
    orderId: "",
    issueType: "general",
    returnId: "",
    escalationReason: "",
    contactPreference: "in_app",
    evidenceUrls: "",
  });

  const categories = [
    { value: "general", label: "General Inquiry" },
    { value: "order", label: "Order Issue" },
    { value: "payment", label: "Payment Problem" },
    { value: "product", label: "Product Question" },
    { value: "shipping", label: "Shipping Issue" },
    { value: "return", label: "Return/Refund" },
    { value: "technical", label: "Technical Support" },
  ];

  const priorities = [
    {
      value: "low",
      label: "Low",
      color:
        "bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-400",
    },
    {
      value: "medium",
      label: "Medium",
      color:
        "bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400",
    },
    {
      value: "high",
      label: "High",
      color:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    },
    {
      value: "urgent",
      label: "Urgent",
      color:
        "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400",
    },
  ];

  const statuses = [
    {
      value: "open",
      label: "Open",
      color:
        "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400",
    },
    {
      value: "in_progress",
      label: "In Progress",
      color:
        "bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-400",
    },
    {
      value: "resolved",
      label: "Resolved",
      color:
        "bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400",
    },
    {
      value: "closed",
      label: "Closed",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    },
  ];

  useEffect(() => {
    fetchHelpResources();
    if (user) {
      fetchTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const supportTicket = location.state?.supportTicket;
    if (!user || !supportTicket) return;

    setCreateForm((current) => ({
      ...current,
      ...supportTicket,
      priority: supportTicket.priority || current.priority || "medium",
      category: supportTicket.category || current.category || "general",
      issueType: supportTicket.issueType || current.issueType || "general",
      contactPreference:
        supportTicket.contactPreference || current.contactPreference || "in_app",
      evidenceUrls: supportTicket.evidenceUrls || current.evidenceUrls || "",
    }));
    setShowCreateModal(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFaqArticles();
    }, 250);
    return () => clearTimeout(timer);
  }, [faqQuery, selectedTopic]);

  const fetchHelpResources = async () => {
    try {
      const [faqResponse, contactResponse] = await Promise.all([
        getSupportFaqs(),
        getSupportContactOptions(),
      ]);
      setFaqArticles(faqResponse.data?.data || []);
      setFaqTopics(faqResponse.data?.topics || []);
      setContactOptions(contactResponse.data?.data || []);
    } catch (err) {
      console.error("Error fetching support resources:", err);
    }
  };

  const fetchFaqArticles = async () => {
    try {
      const response = await getSupportFaqs({
        q: faqQuery,
        topic: selectedTopic,
      });
      setFaqArticles(response.data?.data || []);
      setFaqTopics(response.data?.topics || []);
    } catch (err) {
      console.error("Error fetching FAQ articles:", err);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets/my-tickets`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const nextTickets = data.tickets || [];
        setTickets(nextTickets);
        return nextTickets;
      }
      return [];
    } catch (err) {
      console.error("Error fetching tickets:", err);
      error("Failed to fetch support tickets");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!createForm.subject.trim() || !createForm.description.trim()) {
      error("Please fill in all required fields");
      return;
    }

    try {
      const token = await user.getIdToken();
      const evidenceUrls = createForm.evidenceUrls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => ({ url, type: "evidence_link" }));
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...createForm,
            attachments: evidenceUrls,
            evidenceFiles: evidenceUrls,
          }),
        },
      );

      if (response.ok) {
        success("Support ticket created successfully");
        setShowCreateModal(false);
        setCreateForm({
          subject: "",
          description: "",
          priority: "medium",
          category: "general",
          orderId: "",
          issueType: "general",
          returnId: "",
          escalationReason: "",
          contactPreference: "in_app",
          evidenceUrls: "",
        });
        fetchTickets();
      } else {
        const data = await response.json().catch(() => ({}));
        error(data.error || "Failed to create support ticket");
      }
    } catch (err) {
      console.error("Error creating ticket:", err);
      error("Failed to create support ticket");
    }
  };

  const askBot = async () => {
    if (!botQuestion.trim()) return;

    try {
      const response = await askSupportBot(botQuestion);
      setBotAnswer(response.data?.data || null);
    } catch (err) {
      console.error("Error asking support bot:", err);
      error("Support helper could not answer right now");
    }
  };

  const addMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets/${selectedTicket._id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: newMessage }),
        },
      );

      if (response.ok) {
        success("Message sent successfully");
        setNewMessage("");
        const nextTickets = await fetchTickets();
        const updatedTicket = nextTickets.find(
          (t) => t._id === selectedTicket._id,
        );
        if (updatedTicket) {
          setSelectedTicket(updatedTicket);
        }
      } else {
        error("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      error("Failed to send message");
    }
  };

  const getStatusInfo = (status) => {
    return statuses.find((s) => s.value === status) || statuses[0];
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorities.find((p) => p.value === priority);
    return (
      priorityObj?.color ||
      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderHelpCenter = () => (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={faqQuery}
            onChange={(event) => setFaqQuery(event.target.value)}
            placeholder="Search orders, returns, payments, account"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={selectedTopic}
            onChange={(event) => setSelectedTopic(event.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All topics</option>
            {faqTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {faqArticles.slice(0, 6).map((article) => (
            <div key={article.id} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/60">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
                {article.topic}
              </div>
              <h3 className="mb-2 font-bold text-gray-900 dark:text-white">{article.title}</h3>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{article.answer}</p>
            </div>
          ))}
          {faqArticles.length === 0 && (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              No article found. Try another search or create a support ticket.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">Quick Help Bot</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={botQuestion}
              onChange={(event) => setBotQuestion(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && askBot()}
              placeholder="Where is my order?"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={askBot}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
            >
              Ask
            </button>
          </div>
          {botAnswer && (
            <div className="mt-4 rounded-lg bg-primary-50 p-3 text-sm text-primary-900 dark:bg-primary-900/20 dark:text-primary-200">
              <p>{botAnswer.answer}</p>
              {botAnswer.escalate && user && (
                <button
                  onClick={() => {
                    setCreateForm((current) => ({
                      ...current,
                      category: botAnswer.suggestedCategory || "general",
                      subject: current.subject || botQuestion,
                      description: current.description || botAnswer.answer,
                    }));
                    setShowCreateModal(true);
                  }}
                  className="mt-3 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  Create Ticket
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">Contact Options</h3>
          <div className="space-y-3">
            {contactOptions.map((option) => (
              <div key={option.channel} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/60">
                <div className="font-semibold text-gray-900 dark:text-white">{option.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{option.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{option.availability}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <BackButton />
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Center</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Search help articles or sign in to manage tickets.</p>
          </div>
          {renderHelpCenter()}
          <div className="mx-auto max-w-md rounded-2xl bg-white p-10 text-center shadow-lg dark:bg-gray-800">
          <svg
            className="w-16 h-16 text-primary-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please Sign In
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be signed in to access support tickets.
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Support Center
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Get help with your orders and account
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Ticket
            </button>
          </div>
        </div>

        {renderHelpCenter()}

        {/* Tickets List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
          {tickets.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-primary-600 dark:text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No support tickets yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Create your first support ticket to get help from our team.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                Create Support Ticket
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {tickets.map((ticket) => {
                    const statusInfo = getStatusInfo(ticket.status);
                    return (
                      <tr
                        key={ticket._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {ticket.ticketId}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                              {ticket.subject}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {formatDate(ticket.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {formatDate(ticket.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowTicketModal(true);
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Ticket Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Support Ticket"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                placeholder="Brief description of your issue"
                value={createForm.subject}
                onChange={(e) =>
                  setCreateForm({ ...createForm, subject: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={createForm.category}
                onChange={(e) =>
                  setCreateForm({ ...createForm, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order ID
                </label>
                <input
                  type="text"
                  placeholder="Optional order ID"
                  value={createForm.orderId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, orderId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Issue Type
                </label>
                <select
                  value={createForm.issueType}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, issueType: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="general">General issue</option>
                  <option value="return_dispute">Return dispute escalation</option>
                  <option value="payment_failed">Payment failed</option>
                  <option value="delivery_issue">Delivery issue</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={createForm.priority}
                onChange={(e) =>
                  setCreateForm({ ...createForm, priority: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            {(createForm.category === "return" || createForm.issueType === "return_dispute") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Return ID
                  </label>
                  <input
                    type="text"
                    placeholder="Optional return request ID"
                    value={createForm.returnId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, returnId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Preference
                  </label>
                  <select
                    value={createForm.contactPreference}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, contactPreference: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="in_app">In-app ticket</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                rows={4}
                placeholder="Please provide detailed information about your issue"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>

            {(createForm.category === "return" || createForm.issueType === "return_dispute") && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Escalation Reason
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Why should platform support review this return?"
                    value={createForm.escalationReason}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        escalationReason: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Evidence Links
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Paste one image or document URL per line"
                    value={createForm.evidenceUrls}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, evidenceUrls: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTicket}
                className="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </Modal>

        {/* Ticket Details Modal */}
        <Modal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          title={`Ticket ${selectedTicket?.ticketId}`}
        >
          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Header */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedTicket.subject}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {selectedTicket.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getStatusInfo(selectedTicket.status).color}`}
                  >
                    {getStatusInfo(selectedTicket.status).label}
                  </span>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}
                  >
                    {selectedTicket.priority} priority
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Created {formatDate(selectedTicket.createdAt)}
                  </span>
                </div>
                {(selectedTicket.orderId || selectedTicket.returnId || selectedTicket.escalation) && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {selectedTicket.orderId && <div>Order: {selectedTicket.orderId}</div>}
                    {selectedTicket.returnId && <div>Return: {selectedTicket.returnId}</div>}
                    {selectedTicket.escalation?.status && (
                      <div>Escalation: {selectedTicket.escalation.status}</div>
                    )}
                  </div>
                )}
              </div>

              {selectedTicket.statusTimeline?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Status Tracker
                  </h4>
                  <div className="space-y-2">
                    {selectedTicket.statusTimeline.map((item, index) => (
                      <div key={`${item.status}-${index}`} className="flex items-start gap-3">
                        <div className="mt-1 h-3 w-3 rounded-full bg-primary-500" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {item.label || item.status}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Conversation
                </h4>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedTicket.messages?.length > 0 ? (
                    selectedTicket.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.senderType === "customer" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                            message.senderType === "customer"
                              ? "bg-primary-500 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                          }`}
                        >
                          <div className="text-xs font-semibold mb-1 opacity-90">
                            {message.senderName} (
                            {message.senderType === "customer"
                              ? "You"
                              : "Support"}
                            )
                          </div>
                          <div className="text-sm">{message.message}</div>
                          <div className="text-xs mt-2 opacity-75">
                            {formatDate(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                </div>
              </div>

              {/* Reply (only if ticket is not closed) */}
              {selectedTicket.status !== "closed" && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Add Message
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addMessage()}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={addMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default Support;
