import { useCallback, useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "react-hot-toast";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Inbox,
  Link as LinkIcon,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  User,
  UserCheck,
} from "lucide-react";
import { Badge, Button } from "../../components/ui/foundation";
import { Input, Select } from "../../components/ui/forms";
import { Drawer } from "../../components/ui/overlays";
import { EmptyState, Skeleton } from "../../components/ui/feedback";
import { Pagination } from "../../components/ui/data";
import { getCurrentUserToken } from "../../utils/auth";
import {
  filterSupportTickets,
  formatSupportLabel,
  getSupportPriorityMeta,
  getSupportStats,
  getSupportStatusMeta,
  getTicketSlaState,
  supportPriorities,
  supportStatuses,
} from "../../utils/supportQueue";

const defaultFilters = {
  search: "",
  status: "",
  priority: "",
  assignedTo: "",
  page: 1,
  limit: 20,
};

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStaffName = (staffUsers, firebaseUid) => {
  const staff = staffUsers.find((user) => user.firebaseUid === firebaseUid);
  return [staff?.profile?.firstName, staff?.profile?.lastName].filter(Boolean).join(" ") || "Unknown agent";
};

function StatCard({ label, value, icon: Icon, tone = "slate", helper }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    green: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
        </div>
        <span className={`rounded-lg p-2.5 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function TicketBadge({ type, value }) {
  const meta = type === "priority" ? getSupportPriorityMeta(value) : getSupportStatusMeta(value);
  return (
    <Badge variant={meta.tone} size="sm">
      {meta.label}
    </Badge>
  );
}

function SlaBadge({ ticket }) {
  const sla = getTicketSlaState(ticket);
  const tone = {
    breached: "danger",
    at_risk: "warning",
    healthy: "success",
    complete: "neutral",
  }[sla.state];

  return (
    <Badge variant={tone} size="sm">
      {sla.label}
    </Badge>
  );
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [totalPages, setTotalPages] = useState(1);
  const [staffUsers, setStaffUsers] = useState([]);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch support tickets");

      const data = await response.json();
      setTickets(data.tickets || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch support tickets");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets/stats`,
        {
          headers: {
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error("Error fetching support stats:", error);
    }
  }, []);

  const fetchStaffUsers = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/users/staff`,
        {
          headers: {
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setStaffUsers(data.staff || []);
      }
    } catch (error) {
      console.error("Error fetching staff users:", error);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchStats();
    fetchStaffUsers();
  }, [fetchStats, fetchStaffUsers]);

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets/${ticketId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) throw new Error("Failed to update ticket status");

      toast.success("Ticket status updated");
      setSelectedTicket((current) =>
        current?._id === ticketId ? { ...current, status } : current,
      );
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("Failed to update ticket status");
    }
  };

  const assignTicket = async (ticketId, assignedTo) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets/${ticketId}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
          body: JSON.stringify({ assignedTo }),
        },
      );

      if (!response.ok) throw new Error("Failed to assign ticket");

      toast.success(assignedTo ? "Ticket assigned" : "Ticket unassigned");
      setSelectedTicket((current) =>
        current?._id === ticketId ? { ...current, assignedTo } : current,
      );
      fetchTickets();
    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast.error("Failed to assign ticket");
    }
  };

  const addMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const messageText = newMessage.trim();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets/${selectedTicket._id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
          body: JSON.stringify({ message: messageText }),
        },
      );

      if (!response.ok) throw new Error("Failed to send message");

      toast.success("Reply sent");
      setNewMessage("");
      setSelectedTicket((current) =>
        current
          ? {
              ...current,
              messages: [
                ...(current.messages || []),
                {
                  message: messageText,
                  senderName: "Admin",
                  senderType: "admin",
                  timestamp: new Date().toISOString(),
                },
              ],
              status: current.status === "open" ? "in_progress" : current.status,
            }
          : current,
      );
      fetchTickets();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const updateFilters = (patch) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page || 1,
    }));
  };

  const statusOptions = [
    { value: "", label: "All statuses" },
    ...supportStatuses.map((status) => ({ value: status.value, label: status.label })),
  ];
  const priorityOptions = [
    { value: "", label: "All priorities" },
    ...supportPriorities.map((priority) => ({ value: priority.value, label: priority.label })),
  ];
  const agentOptions = [
    { value: "", label: "All agents" },
    ...staffUsers.map((staff) => ({
      value: staff.firebaseUid,
      label: [staff.profile?.firstName, staff.profile?.lastName].filter(Boolean).join(" ") || staff.email || "Staff",
    })),
  ];

  const localStats = useMemo(() => getSupportStats(tickets), [tickets]);
  const visibleTickets = useMemo(
    () => filterSupportTickets(tickets, { search: filters.search }),
    [filters.search, tickets],
  );
  const statusStats = stats.statusStats || [];
  const getStatusCount = (status) =>
    statusStats.find((item) => item._id === status)?.count ||
    tickets.filter((ticket) => ticket.status === status).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <MessageSquare className="h-3.5 w-3.5" />
                Support operations
              </div>
              <h1 className="mt-3 text-2xl font-black text-slate-950 lg:text-3xl">
                Support Queue
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Triage customer tickets with SLA risk, assignment, linked resources, and conversation history in one queue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={() => {
                  fetchTickets();
                  fetchStats();
                }}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Filter className="h-4 w-4" />}
                onClick={() => setFilters(defaultFilters)}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Open" value={getStatusCount("open") || localStats.open} icon={AlertCircle} tone="red" />
          <StatCard label="In progress" value={getStatusCount("in_progress") || localStats.inProgress} icon={Clock} tone="amber" />
          <StatCard label="Urgent" value={localStats.urgent} icon={ShieldAlert} tone="red" helper="Priority urgent" />
          <StatCard label="Unassigned" value={localStats.unassigned} icon={UserCheck} tone="blue" />
          <StatCard label="SLA risk" value={localStats.slaRisk} icon={Calendar} tone={localStats.slaRisk ? "red" : "green"} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => updateFilters({ status: "" })}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold ${
                !filters.status
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {localStats.total}
              </span>
            </button>
            {supportStatuses.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => updateFilters({ status: status.value })}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold ${
                  filters.status === status.value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {status.label}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {getStatusCount(status.value)}
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_220px]">
            <Input
              value={filters.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
              placeholder="Search tickets, customers, order IDs"
              prefix={<Search className="h-4 w-4" />}
              clearable
            />
            <Select
              options={statusOptions}
              value={filters.status}
              onChange={(value) => updateFilters({ status: value })}
            />
            <Select
              options={priorityOptions}
              value={filters.priority}
              onChange={(value) => updateFilters({ priority: value })}
            />
            <Select
              searchable
              options={agentOptions}
              value={filters.assignedTo}
              onChange={(value) => updateFilters({ assignedTo: value })}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left text-xs font-extrabold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Linked</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && tickets.length === 0
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td colSpan={8} className="px-4 py-3">
                          <Skeleton variant="table-row" />
                        </td>
                      </tr>
                    ))
                  : visibleTickets.map((ticket) => (
                      <tr key={ticket._id} className="align-top hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <p className="font-mono text-xs font-bold text-slate-500">
                            {ticket.ticketId || ticket._id?.slice?.(-8)}
                          </p>
                          <p className="mt-1 max-w-xs truncate font-bold text-slate-950">
                            {ticket.subject}
                          </p>
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {ticket.description || "No description"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <User className="mt-0.5 h-4 w-4 text-slate-400" />
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {ticket.customerInfo?.name || "Customer"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {ticket.customerInfo?.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <TicketBadge value={ticket.status} />
                        </td>
                        <td className="px-4 py-4">
                          <TicketBadge type="priority" value={ticket.priority} />
                        </td>
                        <td className="px-4 py-4">
                          <SlaBadge ticket={ticket} />
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(ticket.updatedAt || ticket.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {ticket.assignedTo ? getStaffName(staffUsers, ticket.assignedTo) : "Unassigned"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1 text-xs text-slate-500">
                            {ticket.orderId ? <p>Order {ticket.orderId}</p> : null}
                            {ticket.vendorId ? <p>Vendor {ticket.vendorId}</p> : null}
                            {ticket.productId ? <p>Product {ticket.productId}</p> : null}
                            {!ticket.orderId && !ticket.vendorId && !ticket.productId ? <p>No linked resource</p> : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<MessageSquare className="h-4 w-4" />}
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!loading && visibleTickets.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Inbox}
                title="No support tickets found"
                description="Adjust filters or wait for a customer, vendor, or admin support request."
                actionLabel="Clear filters"
                onAction={() => setFilters(defaultFilters)}
              />
            </div>
          ) : null}

          <div className="border-t border-slate-200 p-3">
            <Pagination
              page={filters.page}
              pageSize={filters.limit}
              total={Math.max(totalPages * filters.limit, tickets.length)}
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
              onPageSizeChange={(limit) => setFilters((current) => ({ ...current, limit, page: 1 }))}
            />
          </div>
        </section>
      </div>

      <Drawer
        open={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `Ticket ${selectedTicket.ticketId || selectedTicket._id?.slice?.(-8)}` : "Ticket"}
        description={selectedTicket?.subject}
        footer={
          selectedTicket ? (
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder="Write a reply..."
                className="min-w-0"
              />
              <Button
                disabled={!newMessage.trim()}
                leftIcon={<Send className="h-4 w-4" />}
                onClick={addMessage}
              >
                Send
              </Button>
            </div>
          ) : null
        }
      >
        {selectedTicket ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Status"
                options={supportStatuses.map((status) => ({ value: status.value, label: status.label }))}
                value={selectedTicket.status}
                onChange={(value) => updateTicketStatus(selectedTicket._id, value)}
              />
              <Select
                label="Assigned agent"
                searchable
                options={agentOptions}
                value={selectedTicket.assignedTo || ""}
                onChange={(value) => assignTicket(selectedTicket._id, value)}
              />
            </div>

            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-950">Customer and resource</h3>
              <div className="mt-3 grid gap-3 text-sm">
                <p>
                  <span className="font-bold text-slate-700">Customer:</span>{" "}
                  {selectedTicket.customerInfo?.name || "Customer"} ({selectedTicket.customerInfo?.email || "No email"})
                </p>
                <p>
                  <span className="font-bold text-slate-700">Priority:</span>{" "}
                  <TicketBadge type="priority" value={selectedTicket.priority} />
                </p>
                <div className="flex flex-wrap gap-2">
                  {[selectedTicket.orderId, selectedTicket.vendorId, selectedTicket.productId]
                    .filter(Boolean)
                    .map((item) => (
                      <Badge key={item} variant="info" size="sm">
                        <LinkIcon className="h-3.5 w-3.5" />
                        {item}
                      </Badge>
                    ))}
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-slate-950">Conversation</h3>
              <div className="mt-3 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {(selectedTicket.messages || []).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No conversation messages yet.
                  </p>
                ) : (
                  selectedTicket.messages.map((message, index) => {
                    const isCustomer = message.senderType === "customer";
                    return (
                      <div key={`${message.timestamp || message.createdAt || index}-${index}`} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-3 ${
                            isCustomer
                              ? "bg-slate-100 text-slate-900"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          <p className="text-xs font-bold opacity-80">
                            {message.senderName || formatSupportLabel(message.senderType || "admin")}
                          </p>
                          <p className="mt-1 text-sm leading-6">{message.message}</p>
                          <p className="mt-2 text-[11px] opacity-70">
                            {formatDate(message.timestamp || message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
