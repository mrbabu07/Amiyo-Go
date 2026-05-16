import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  ImagePlus,
  MessageCircle,
  Package,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  createVendorMessageTemplate,
  createVendorQuickReply,
  getVendorChatConversations,
  getVendorConversationMessages,
  getVendorSupportTools,
  markVendorConversationRead,
  sendVendorChatMessage,
} from "../../services/api";

const numberFormat = new Intl.NumberFormat("en-US");

export default function VendorMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tools, setTools] = useState({ quickReplies: [], templates: [], responseMetrics: null });
  const [responseMetrics, setResponseMetrics] = useState(null);
  const [quickReplyDraft, setQuickReplyDraft] = useState({ title: "", message: "" });
  const [templateDraft, setTemplateDraft] = useState({ title: "", body: "" });
  const [savingTool, setSavingTool] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const loadPageData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchConversations(), fetchSupportTools()]);
      } catch (error) {
        console.error("Failed to load vendor messages:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [user]);

  useEffect(() => {
    if (!selected?._id) return;
    fetchMessages(selected._id);
    markAsRead(selected._id);
  }, [selected?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeMetrics = responseMetrics || tools.responseMetrics || {};
  const totalUnread = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
  const activeConversations = conversations.filter((conversation) => conversation.status !== "closed").length;

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      const customer = conversation.context?.customer || {};
      const order = conversation.context?.order || {};
      const product = conversation.context?.product || {};
      const haystack = [
        customer.name,
        customer.email,
        customer.tier,
        order.orderNumber,
        order.status,
        product.name,
        conversation.lastMessage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [conversations, searchQuery]);

  const fetchConversations = async () => {
    const response = await getVendorChatConversations();
    const rows = response.data.data || [];
    setConversations(rows);
    setResponseMetrics(response.data.meta?.responseMetrics || null);
    setSelected((previous) => rows.find((conversation) => conversation._id === previous?._id) || rows[0] || null);
  };

  const fetchSupportTools = async () => {
    const response = await getVendorSupportTools();
    setTools(response.data.data || { quickReplies: [], templates: [], responseMetrics: null });
  };

  const fetchMessages = async (conversationId) => {
    setMessagesLoading(true);
    try {
      const response = await getVendorConversationMessages(conversationId);
      setMessages(response.data.data || []);
    } finally {
      setMessagesLoading(false);
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      await markVendorConversationRead(conversationId);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation._id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      );
    } catch (error) {
      console.error("Failed to mark conversation as read:", error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelected(conversation);
    markAsRead(conversation._id);
  };

  const sendReply = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selected?._id) return;

    setSending(true);
    try {
      const image = selectedImage ? await convertToBase64(selectedImage) : null;
      await sendVendorChatMessage(selected._id, {
        message: newMessage.trim(),
        image,
      });

      setNewMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchMessages(selected._id);
      await fetchConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(error.response?.data?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendReply();
    }
  };

  const handleCreateQuickReply = async (event) => {
    event.preventDefault();
    if (!quickReplyDraft.title.trim() || !quickReplyDraft.message.trim()) return;

    setSavingTool("quick-reply");
    try {
      await createVendorQuickReply(quickReplyDraft);
      setQuickReplyDraft({ title: "", message: "" });
      await fetchSupportTools();
    } finally {
      setSavingTool("");
    }
  };

  const handleCreateTemplate = async (event) => {
    event.preventDefault();
    if (!templateDraft.title.trim() || !templateDraft.body.trim()) return;

    setSavingTool("template");
    try {
      await createVendorMessageTemplate({
        ...templateDraft,
        variables: extractVariables(templateDraft.body),
      });
      setTemplateDraft({ title: "", body: "" });
      await fetchSupportTools();
    } finally {
      setSavingTool("");
    }
  };

  const applyTemplate = (template) => {
    setNewMessage(renderTemplate(template.body, selected));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/vendor/dashboard"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                aria-label="Back to vendor dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Messages & Customer Support</h1>
                <p className="text-sm text-slate-500">Inbox with order context, response health, quick replies, and templates</p>
              </div>
            </div>
            <HealthBadge metrics={activeMetrics} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard label="Unread" value={totalUnread} icon={MessageCircle} />
          <MetricCard label="Active chats" value={activeConversations} icon={Ticket} />
          <MetricCard label="Avg reply" value={formatReplyTime(activeMetrics.averageReplyMinutes)} icon={Clock3} />
          <MetricCard label="Health score" value={`${activeMetrics.healthScore ?? 100}%`} icon={ShieldCheck} tone={activeMetrics.tone} />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
          <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer, order, product"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="max-h-[680px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <EmptyState title="No conversations" text="Customer messages will appear here." />
              ) : (
                filteredConversations.map((conversation) => (
                  <ConversationButton
                    key={conversation._id}
                    conversation={conversation}
                    active={selected?._id === conversation._id}
                    onClick={() => handleSelectConversation(conversation)}
                  />
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-[680px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            {selected ? (
              <>
                <ChatHeader conversation={selected} />
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
                  {messagesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyState title="No messages yet" text="Start the conversation from the composer below." />
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <MessageBubble key={message._id} message={message} />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                <Composer
                  value={newMessage}
                  onChange={setNewMessage}
                  onKeyDown={handleComposerKeyDown}
                  onSend={sendReply}
                  sending={sending}
                  imagePreview={imagePreview}
                  removeImage={removeImage}
                  onImageSelect={handleImageSelect}
                  fileInputRef={fileInputRef}
                  disabled={!selected}
                  hasImage={Boolean(selectedImage)}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState title="Select a conversation" text="Choose a customer from the inbox to reply." />
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <ContextPanel conversation={selected} />
            <QuickReplyPanel
              replies={tools.quickReplies || []}
              draft={quickReplyDraft}
              onDraftChange={setQuickReplyDraft}
              onSubmit={handleCreateQuickReply}
              saving={savingTool === "quick-reply"}
              onUse={(reply) => setNewMessage(reply.message)}
            />
            <TemplatePanel
              templates={tools.templates || []}
              draft={templateDraft}
              onDraftChange={setTemplateDraft}
              onSubmit={handleCreateTemplate}
              saving={savingTool === "template"}
              onUse={applyTemplate}
              selected={selected}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon, tone = "slate" }) {
  const CardIcon = icon;
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    yellow: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone] || tones.slate}`}>
          <CardIcon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function HealthBadge({ metrics = {} }) {
  const tone = metrics.tone || "green";
  const styles = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    yellow: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${styles[tone] || styles.green}`}>
      <ShieldCheck className="h-4 w-4" />
      Response health {metrics.healthScore ?? 100}%
    </div>
  );
}

function ConversationButton({ conversation, active, onClick }) {
  const customer = conversation.context?.customer || {};
  const order = conversation.context?.order || {};
  const product = conversation.context?.product || {};
  const name = customer.name || customer.email || "Customer";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-orange-50 ${
        active ? "bg-orange-50 shadow-[inset_4px_0_0_#f97316]" : "bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold text-slate-950">{name}</p>
            {conversation.unreadCount > 0 && (
              <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">
                {conversation.unreadCount}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <TierBadge tier={customer.tier || conversation.customerTier} />
            {order.orderNumber && <SmallPill>Order {order.orderNumber}</SmallPill>}
          </div>
          <p className="mt-2 truncate text-sm text-slate-500">{conversation.lastMessage || "No messages yet"}</p>
          {product.name && <p className="mt-1 truncate text-xs font-medium text-slate-500">{product.name}</p>}
        </div>
      </div>
    </button>
  );
}

function ChatHeader({ conversation }) {
  const customer = conversation.context?.customer || {};
  const order = conversation.context?.order || {};

  return (
    <div className="border-b border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-600 font-bold text-white">
            {(customer.name || customer.email || "C").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-950">{customer.name || customer.email || "Customer"}</p>
            <p className="text-xs text-slate-500">{customer.email || "No email on file"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TierBadge tier={customer.tier} />
          <SmallPill>{conversation.status === "closed" ? "Closed" : "Active"}</SmallPill>
          {order.status && <SmallPill>{order.status.replace(/_/g, " ")}</SmallPill>}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isVendor = message.senderType === "vendor";

  return (
    <div className={`flex ${isVendor ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-sm ${
          isVendor ? "bg-orange-600 text-white" : "border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {message.image && (
          <img
            src={message.image}
            alt="Attachment"
            className="mb-2 max-h-64 rounded-lg object-contain"
          />
        )}
        {message.message && <p className="whitespace-pre-wrap break-words">{message.message}</p>}
        <p className={`mt-2 text-xs ${isVendor ? "text-orange-100" : "text-slate-400"}`}>
          {new Date(message.createdAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onKeyDown,
  onSend,
  sending,
  imagePreview,
  removeImage,
  onImageSelect,
  fileInputRef,
  disabled,
  hasImage,
}) {
  return (
    <div className="border-t border-slate-200 bg-white p-4">
      {imagePreview && (
        <div className="mb-3 inline-flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2">
          <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-md object-cover" />
          <button
            type="button"
            onClick={removeImage}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-600 hover:text-rose-600"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onImageSelect} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          title="Attach image"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a reply..."
          rows={3}
          disabled={disabled || sending}
          className="min-h-[88px] flex-1 resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || sending || (!value.trim() && !hasImage)}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  );
}

function ContextPanel({ conversation }) {
  const context = conversation?.context || {};
  const customer = context.customer || {};
  const order = context.order || {};
  const product = context.product || {};

  return (
    <Panel title="Order Context" icon={Package}>
      {!conversation ? (
        <p className="text-sm text-slate-500">Select a conversation to see linked customer, order, and product details.</p>
      ) : (
        <div className="space-y-3">
          <ContextRow icon={UserRound} label="Customer" value={customer.name || "Customer"} subValue={customer.email} />
          <ContextRow icon={Star} label="Tier" value={customer.tier || "New"} subValue={`${customer.orderCount || 0} vendor orders`} />
          <ContextRow
            icon={Ticket}
            label="Order"
            value={order.orderNumber || "No linked order"}
            subValue={order.status ? `${order.status} - ${formatMoney(order.total || 0)}` : ""}
          />
          <ContextRow icon={Package} label="Product" value={product.name || order.productName || "No linked product"} subValue={product.sku} />
        </div>
      )}
    </Panel>
  );
}

function QuickReplyPanel({ replies, draft, onDraftChange, onSubmit, saving, onUse }) {
  return (
    <Panel title="Quick Replies" icon={MessageCircle}>
      <div className="space-y-2">
        {replies.map((reply) => (
          <button
            key={reply._id}
            type="button"
            onClick={() => onUse(reply)}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-sm transition hover:border-orange-200 hover:bg-orange-50"
          >
            <span className="font-bold text-slate-950">{reply.title}</span>
            <span className="mt-1 block line-clamp-2 text-xs text-slate-500">{reply.message}</span>
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-4 space-y-2 border-t border-slate-200 pt-4">
        <input
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          placeholder="Reply name"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <textarea
          value={draft.message}
          onChange={(event) => onDraftChange({ ...draft, message: event.target.value })}
          placeholder="Saved reply text"
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <button
          type="submit"
          disabled={saving || !draft.title.trim() || !draft.message.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Save quick reply
        </button>
      </form>
    </Panel>
  );
}

function TemplatePanel({ templates, draft, onDraftChange, onSubmit, saving, onUse, selected }) {
  return (
    <Panel title="Templates" icon={Sparkles}>
      <div className="space-y-2">
        {templates.map((template) => (
          <button
            key={template._id}
            type="button"
            onClick={() => onUse(template)}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-sm transition hover:border-orange-200 hover:bg-orange-50"
          >
            <span className="font-bold text-slate-950">{template.title}</span>
            <span className="mt-1 block line-clamp-2 text-xs text-slate-500">
              {selected ? renderTemplate(template.body, selected) : template.body}
            </span>
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-4 space-y-2 border-t border-slate-200 pt-4">
        <input
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          placeholder="Template name"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <textarea
          value={draft.body}
          onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
          placeholder="Hi {customer_name}, your order #{order_id}..."
          rows={4}
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <div className="flex flex-wrap gap-1.5">
          {["customer_name", "order_id", "order_number", "product_name"].map((variable) => (
            <span key={variable} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
              {`{${variable}}`}
            </span>
          ))}
        </div>
        <button
          type="submit"
          disabled={saving || !draft.title.trim() || !draft.body.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Save template
        </button>
      </form>
    </Panel>
  );
}

function Panel({ title, icon, children }) {
  const PanelIcon = icon;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <PanelIcon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ContextRow({ icon, label, value, subValue }) {
  const RowIcon = icon;
  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <RowIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-slate-950">{value}</p>
        {subValue && <p className="truncate text-xs text-slate-500">{subValue}</p>}
      </div>
    </div>
  );
}

function TierBadge({ tier = "New" }) {
  const tones = {
    VIP: "bg-violet-100 text-violet-700",
    Repeat: "bg-emerald-100 text-emerald-700",
    New: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tones[tier] || tones.New}`}>
      {tier}
    </span>
  );
}

function SmallPill({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
      {children}
    </span>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <MessageCircle className="h-6 w-6" />
      </div>
      <p className="font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function renderTemplate(body = "", conversation = {}) {
  const context = conversation?.context || {};
  const customer = context.customer || {};
  const order = context.order || {};
  const product = context.product || {};
  const replacements = {
    customer_name: customer.name || "Customer",
    order_id: order.orderId || order.orderNumber || "",
    order_number: order.orderNumber || order.orderId || "",
    product_name: product.name || order.productName || "your item",
    customer_tier: customer.tier || "New",
  };

  return body.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => replacements[key] || "");
}

function extractVariables(body = "") {
  return [...new Set([...body.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]))];
}

function formatReplyTime(minutes) {
  if (minutes === null || minutes === undefined) return "No data";
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  return `${(minutes / 60).toFixed(minutes >= 600 ? 0 : 1)}h`;
}

function formatMoney(value) {
  return `৳${numberFormat.format(Number(value) || 0)}`;
}

function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxWidth = 1200;
        const maxHeight = 1200;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = (height / width) * maxWidth;
            width = maxWidth;
          } else {
            width = (width / height) * maxHeight;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
