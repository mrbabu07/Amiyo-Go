import { useState, useEffect } from "react";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Filter,
  Search,
  Send,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { getCurrentUserToken } from "../../utils/auth";
import Loading from "../../components/Loading";

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    assignedTo: "",
    page: 1,
    limit: 20,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [staffUsers, setStaffUsers] = useState([]);

  const statuses = [
    {
      value: "open",
      label: "Open",
      color: "bg-red-100 text-red-800",
      icon: AlertCircle,
    },
    {
      value: "in_progress",
      label: "In Progress",
      color: "bg-yellow-100 text-yellow-800",
      icon: Clock,
    },
    {
      value: "resolved",
      label: "Resolved",
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
    },
    {
      value: "closed",
      label: "Closed",
      color: "bg-gray-100 text-gray-800",
      icon: CheckCircle,
    },
  ];

  const priorities = [
    { value: "low", label: "Low", color: "bg-blue-100 text-blue-800" },
    {
      value: "medium",
      label: "Medium",
      color: "bg-yellow-100 text-yellow-800",
    },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
    { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
  ];

  useEffect(() => {
    fetchTickets();
    fetchStats();
    fetchStaffUsers();
  }, [filters]);

  const fetchTickets = async () => {
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

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch support tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
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
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchStaffUsers = async () => {
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
        setStaffUsers(data.staff);
      }
    } catch (error) {
      console.error("Error fetching staff users:", error);
    }
  };

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

      if (response.ok) {
        toast.success("Ticket status updated successfully");
        fetchTickets();
        if (selectedTicket && selectedTicket._id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status });
        }
      } else {
        toast.error("Failed to update ticket status");
      }
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

      if (response.ok) {
        toast.success("Ticket assigned successfully");
        fetchTickets();
      } else {
        toast.error("Failed to assign ticket");
      }
    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast.error("Failed to assign ticket");
    }
  };

  const addMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/support/tickets/${selectedTicket._id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getCurrentUserToken()}`,
          },
          body: JSON.stringify({ message: newMessage }),
        },
      );

      if (response.ok) {
        toast.success("Message sent successfully");
        setNewMessage("");
        // Refresh ticket details
        const updatedTicket = tickets.find((t) => t._id === selectedTicket._id);
        if (updatedTicket) {
          setSelectedTicket(updatedTicket);
        }
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const getStatusInfo = (status) => {
    return statuses.find((s) => s.value === status) || statuses[0];
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorities.find((p) => p.value === priority);
    return priorityObj?.color || "bg-gray-100 text-gray-800";
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

  if (loading && tickets.length === 0) {
    return <Loading />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Support Management
        </h1>
        <p className="text-gray-600">
          Manage customer support tickets and inquiries
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.statusStats?.map((stat) => {
          const statusInfo = getStatusInfo(stat._id);
          const StatusIcon = statusInfo.icon;
          return (
            <div key={stat._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <StatusIcon className="h-8 w-8 text-gray-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 capitalize">
                    {statusInfo.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.count}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search tickets..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
                className="pl-10"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value, page: 1 })
              }
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value, page: 1 })
              }
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>

            <select
              value={filters.assignedTo}
              onChange={(e) =>
                setFilters({ ...filters, assignedTo: e.target.value, page: 1 })
              }
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Agents</option>
              {staffUsers.map((user) => (
                <option key={user._id} value={user.firebaseUid}>
                  {user.profile?.firstName} {user.profile?.lastName}
                </option>
              ))}
            </select>

            <Button
              onClick={() =>
                setFilters({
                  search: "",
                  status: "",
                  priority: "",
                  assignedTo: "",
                  page: 1,
                  limit: 20,
                })
              }
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => {
                const statusInfo = getStatusInfo(ticket.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <tr key={ticket._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.ticketId}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {ticket.subject}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ticket.customerInfo?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {ticket.customerInfo?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.assignedTo ? (
                        <span>
                          {staffUsers.find(
                            (u) => u.firebaseUid === ticket.assignedTo,
                          )?.profile?.firstName || "Unknown"}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(ticket.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowTicketModal(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              onClick={() =>
                setFilters({ ...filters, page: Math.max(1, filters.page - 1) })
              }
              disabled={filters.page === 1}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                setFilters({
                  ...filters,
                  page: Math.min(totalPages, filters.page + 1),
                })
              }
              disabled={filters.page === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{filters.page}</span>{" "}
                of <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <Button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      page: Math.max(1, filters.page - 1),
                    })
                  }
                  disabled={filters.page === 1}
                  variant="outline"
                  className="rounded-l-md"
                >
                  Previous
                </Button>
                <Button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      page: Math.min(totalPages, filters.page + 1),
                    })
                  }
                  disabled={filters.page === totalPages}
                  variant="outline"
                  className="rounded-r-md"
                >
                  Next
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Details Modal */}
      <Modal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title={`Ticket ${selectedTicket?.ticketId}`}
        size="lg"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedTicket.subject}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTicket.description}
                </p>
              </div>
              <div className="flex space-x-2">
                <select
                  value={selectedTicket.status}
                  onChange={(e) =>
                    updateTicketStatus(selectedTicket._id, e.target.value)
                  }
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedTicket.assignedTo || ""}
                  onChange={(e) =>
                    assignTicket(selectedTicket._id, e.target.value)
                  }
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map((user) => (
                    <option key={user._id} value={user.firebaseUid}>
                      {user.profile?.firstName} {user.profile?.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                Customer Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>{" "}
                  {selectedTicket.customerInfo?.name}
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>{" "}
                  {selectedTicket.customerInfo?.email}
                </div>
                <div>
                  <span className="text-gray-600">Priority:</span>
                  <span
                    className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}
                  >
                    {selectedTicket.priority}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>{" "}
                  {formatDate(selectedTicket.createdAt)}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Conversation</h4>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedTicket.messages?.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.senderType === "customer" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderType === "customer"
                          ? "bg-gray-100 text-gray-900"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">
                        {message.senderName} ({message.senderType})
                      </div>
                      <div className="text-sm">{message.message}</div>
                      <div className="text-xs mt-1 opacity-75">
                        {formatDate(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Reply</h4>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addMessage()}
                  className="flex-1"
                />
                <Button onClick={addMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminSupport;
