import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  Shield,
  Activity,
  Search,
  Eye,
  Edit,
  Ban,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Loading from "../../components/Loading";
import { Pagination } from "../../components/ui/data";
import { getCurrentUserToken } from "../../utils/auth";

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    page: 1,
    limit: 20,
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const roles = [
    {
      value: "customer",
      label: "Customer",
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: "support",
      label: "Support",
      color: "bg-green-100 text-green-800",
    },
    {
      value: "moderator",
      label: "Moderator",
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      value: "manager",
      label: "Manager",
      color: "bg-purple-100 text-purple-800",
    },
    { value: "admin", label: "Admin", color: "bg-red-100 text-red-800" },
  ];

  const statuses = [
    { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
    {
      value: "inactive",
      label: "Inactive",
      color: "bg-gray-100 text-gray-800",
    },
    {
      value: "suspended",
      label: "Suspended",
      color: "bg-red-100 text-red-800",
    },
  ];

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const token = await getCurrentUserToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/users?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const nextUsers = data.users || [];
        const nextTotalPages = data.totalPages || 1;
        setUsers(nextUsers);
        setTotalPages(nextTotalPages);
        setTotalUsers(
          data.total ||
            data.totalUsers ||
            data.pagination?.total ||
            Math.max(nextUsers.length, (nextTotalPages - 1) * filters.limit + nextUsers.length),
        );
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await getCurrentUserToken();
      if (!token) return;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/users/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
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

  const getRoleColor = (role) => {
    const roleObj = roles.find((r) => r.value === role);
    return roleObj?.color || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status) => {
    const statusObj = statuses.find((s) => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800";
  };

  if (loading && users.length === 0) {
    return <Loading />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/admin"
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Management
          </h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalUsers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeUsers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Staff Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.roleStats
                  ?.filter((r) =>
                    ["admin", "manager", "support", "moderator"].includes(
                      r._id,
                    ),
                  )
                  .reduce((sum, r) => sum + r.count, 0) || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                New This Month
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.newUsersThisMonth || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Users List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>

          {loading ? (
            <div className="text-center py-8">
              <Loading />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.profile?.firstName?.[0] ||
                          user.email?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.profile?.firstName} {user.profile?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}
                    >
                      {user.role}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}
                    >
                      {user.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalUsers > 0 && (
            <div className="mt-5 border-t border-gray-200 pt-4">
              <Pagination
                page={filters.page}
                pageSize={filters.limit}
                total={totalUsers}
                pageSizeOptions={[10, 20, 50]}
                onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
                onPageSizeChange={(limit) => setFilters((current) => ({ ...current, limit, page: 1 }))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;
