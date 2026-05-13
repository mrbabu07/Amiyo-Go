import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';

const REQUEST_EMPTY = {
  pendingVendors: [],
  categoryRequests: [],
  marketingRequests: [],
  payoutRequests: [],
  pendingProductCount: 0,
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-gray-100 text-gray-700 border-gray-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
};

const getRequestModalConfig = (modal) => {
  if (!modal) return null;

  const configs = {
    approveVendor: {
      title: 'Approve Vendor',
      description: 'Approve this vendor and allow marketplace operations.',
      confirmLabel: 'Approve Vendor',
      requiresReason: false,
      noteLabel: 'Admin note (optional)',
    },
    rejectVendor: {
      title: 'Reject Vendor',
      description: 'Add a clear reason so the vendor knows what to correct.',
      confirmLabel: 'Reject Vendor',
      requiresReason: true,
      noteLabel: 'Rejection reason',
    },
    approveCategory: {
      title: 'Approve Category Request',
      description: 'This will grant the vendor access to the requested category if it exists.',
      confirmLabel: 'Approve Request',
      requiresReason: false,
      noteLabel: 'Admin note (optional)',
    },
    rejectCategory: {
      title: 'Reject Category Request',
      description: 'Explain why the category request cannot be approved yet.',
      confirmLabel: 'Reject Request',
      requiresReason: true,
      noteLabel: 'Rejection reason',
    },
    approveMarketing: {
      title: 'Approve Marketing Request',
      description: 'Approve this voucher, promotion, or campaign submission for the storefront.',
      confirmLabel: 'Approve Request',
      requiresReason: false,
      noteLabel: 'Admin note (optional)',
    },
    rejectMarketing: {
      title: 'Reject Marketing Request',
      description: 'Tell the vendor what needs to change before this can go live.',
      confirmLabel: 'Reject Request',
      requiresReason: true,
      noteLabel: 'Rejection reason',
    },
    approvePayout: {
      title: 'Approve Payout Request',
      description: 'Approve this payout request so it moves to the payment-ready stage.',
      confirmLabel: 'Approve Payout',
      requiresReason: false,
      noteLabel: 'Approval note (optional)',
    },
    rejectPayout: {
      title: 'Reject Payout Request',
      description: 'Add the reason for rejecting this payout request.',
      confirmLabel: 'Reject Payout',
      requiresReason: true,
      noteLabel: 'Rejection reason',
    },
  };

  return configs[modal.action] || null;
};

const getVendorRequirements = (vendor) => {
  const address = vendor?.address || {};
  const addressComplete =
    typeof address === 'string'
      ? Boolean(address.trim())
      : Boolean(
          address?.divisionId ||
            address?.districtId ||
            address?.upazilaId ||
            address?.details ||
            address?.addressLine
        );

  const hasPayoutMethod = Boolean(
    (vendor?.bankName && vendor?.bankAccountNumber) ||
      (vendor?.mobileBankingProvider && vendor?.mobileBankingNumber)
  );

  const items = [
    { label: 'Shop name', done: Boolean(vendor?.shopName?.trim()) },
    { label: 'Phone', done: Boolean(vendor?.phone?.trim()) },
    { label: 'Address', done: addressComplete },
    { label: 'Categories', done: (vendor?.allowedCategoryIds || []).length > 0 },
    { label: 'Payout details', done: hasPayoutMethod },
  ];

  const completed = items.filter((item) => item.done).length;
  return {
    items,
    completed,
    total: items.length,
    missing: items.filter((item) => !item.done).map((item) => item.label),
  };
};

const formatPayoutMethod = (request) => {
  if (request?.mobileBankingProvider || request?.mobileBankingNumber) {
    return `${request.mobileBankingProvider || 'Mobile banking'}${request.mobileBankingNumber ? ` (${request.mobileBankingNumber})` : ''}`;
  }

  if (request?.bankName || request?.bankAccountNumber) {
    return `${request.bankName || 'Bank'}${request.bankAccountNumber ? ` (${request.bankAccountNumber})` : ''}`;
  }

  return request?.payoutMethod || 'Not provided';
};

const RequestCard = ({ title, count, tone = 'orange', actionLabel, actionTo, children }) => {
  const tones = {
    orange: 'from-orange-50 to-white border-orange-200 text-orange-700',
    blue: 'from-blue-50 to-white border-blue-200 text-blue-700',
    green: 'from-green-50 to-white border-green-200 text-green-700',
    purple: 'from-purple-50 to-white border-purple-200 text-purple-700',
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tones[tone]} shadow-sm`}>
      <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{count} pending</p>
        </div>
        {actionTo ? (
          <Link
            to={actionTo}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {actionLabel}
          </Link>
        ) : (
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-900 shadow-sm">
            {count}
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
};

const RequestTabButton = ({ active, label, count, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
      active
        ? 'bg-orange-600 text-white shadow-sm'
        : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
    }`}
  >
    <span>{label}</span>
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
      }`}
    >
      {count}
    </span>
  </button>
);

const AdminVendorsEnhanced = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState(REQUEST_EMPTY);
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [activeRequestTab, setActiveRequestTab] = useState('all');
  const [actionModal, setActionModal] = useState(null);
  const [actionData, setActionData] = useState({ reason: '', note: '', transactionId: '' });
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchVendors();
    fetchStats();
  }, [filter, user]);

  useEffect(() => {
    if (!user) return;
    fetchRequestCenter();
  }, [user]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const url =
        filter === 'all'
          ? `${import.meta.env.VITE_API_URL}/vendors`
          : `${import.meta.env.VITE_API_URL}/vendors?status=${filter}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load vendors');
      }
      setVendors(data.vendors || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      }
    } catch {
      // optional stats
    }
  };

  const fetchRequestCenter = async () => {
    setRequestLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [
        pendingVendorsRes,
        categoryRequestsRes,
        marketingRequestsRes,
        payoutRequestsRes,
        pendingProductsRes,
      ] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/vendors?status=pending`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/category-requests/admin/all?status=pending`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/vendor-marketing?status=pending&page=1&limit=6`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/payouts/requests?status=pending`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/admin/products/pending?page=1&limit=1`, { headers }),
      ]);

      const [pendingVendorsData, categoryRequestsData, marketingRequestsData, payoutRequestsData, pendingProductsData] =
        await Promise.all([
          pendingVendorsRes.json(),
          categoryRequestsRes.json(),
          marketingRequestsRes.json(),
          payoutRequestsRes.json(),
          pendingProductsRes.json(),
        ]);

      setRequests({
        pendingVendors: pendingVendorsData.vendors || [],
        categoryRequests: categoryRequestsData.requests || [],
        marketingRequests: marketingRequestsData.data || [],
        payoutRequests: payoutRequestsData.data || [],
        pendingProductCount: pendingProductsData.total || 0,
      });
    } catch (error) {
      toast.error('Failed to load vendor request center');
    } finally {
      setRequestLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchVendors(), fetchStats(), fetchRequestCenter()]);
  };

  const handleVendorAction = async (vendorId, action, payload = {}) => {
    const endpointMap = {
      approve: 'approve',
      reject: 'reject',
      suspend: 'suspend',
      reactivate: 'reactivate',
    };

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/vendors/${vendorId}/${endpointMap[action]}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} vendor`);
      }
      toast.success(data.message || `Vendor ${action}d successfully`);
      await refreshAll();
    } catch (error) {
      toast.error(error.message || `Failed to ${action} vendor`);
      throw error;
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedVendors.length === 0) {
      toast.error('Please select vendors first');
      return;
    }

    try {
      const token = await user.getIdToken();
      await Promise.all(
        selectedVendors.map((vendorId) =>
          fetch(`${import.meta.env.VITE_API_URL}/vendors/${vendorId}/${action}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(actionData),
          })
        )
      );
      toast.success(`${selectedVendors.length} vendors updated`);
      setSelectedVendors([]);
      setShowBulkActions(false);
      await refreshAll();
    } catch {
      toast.error('Failed to perform bulk action');
    }
  };

  const handleCategoryRequestAction = async (requestId, action, payload = {}) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/category-requests/${requestId}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} category request`);
      }
      toast.success(data.message || `Category request ${action}d`);
      await refreshAll();
    } catch (error) {
      toast.error(error.message || `Failed to ${action} category request`);
      throw error;
    }
  };

  const handleMarketingAction = async (itemId, status, adminNotes = '') => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/vendor-marketing/${itemId}/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, adminNotes }),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update marketing request');
      }
      toast.success(data.message || `Marketing request ${status}`);
      await refreshAll();
    } catch (error) {
      toast.error(error.message || 'Failed to update marketing request');
      throw error;
    }
  };

  const handlePayoutRequestAction = async (payoutId, action, payload = {}) => {
    const endpointMap = {
      approve: `requests/${payoutId}/approve`,
      reject: `requests/${payoutId}/reject`,
      markPaid: `requests/${payoutId}/mark-paid`,
    };

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/payouts/${endpointMap[action]}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} payout request`);
      }
      toast.success(data.message || `Payout request ${action}d`);
      await refreshAll();
    } catch (error) {
      toast.error(error.message || `Failed to ${action} payout request`);
      throw error;
    }
  };

  const openActionModal = (action, item) => {
    setActionModal({ action, item });
    setActionData({ reason: '', note: '', transactionId: '' });
  };

  const closeActionModal = () => {
    setActionModal(null);
    setActionData({ reason: '', note: '', transactionId: '' });
  };

  const submitModalAction = async () => {
    if (!actionModal) return;
    const config = getRequestModalConfig(actionModal);

    if (config?.requiresReason && !actionData.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setSubmittingAction(true);
    try {
      const { action, item } = actionModal;

      if (action === 'approveVendor') {
        await handleVendorAction(item._id, 'approve', actionData.note ? { note: actionData.note } : {});
      } else if (action === 'rejectVendor') {
        await handleVendorAction(item._id, 'reject', { reason: actionData.reason.trim() });
      } else if (action === 'approveCategory') {
        await handleCategoryRequestAction(item._id, 'approve', { adminNote: actionData.note.trim() });
      } else if (action === 'rejectCategory') {
        await handleCategoryRequestAction(item._id, 'reject', { adminNote: actionData.reason.trim() });
      } else if (action === 'approveMarketing') {
        await handleMarketingAction(item._id, 'approved', actionData.note.trim());
      } else if (action === 'rejectMarketing') {
        await handleMarketingAction(item._id, 'rejected', actionData.reason.trim());
      } else if (action === 'approvePayout') {
        await handlePayoutRequestAction(item._id, 'approve', { note: actionData.note.trim() });
      } else if (action === 'rejectPayout') {
        await handlePayoutRequestAction(item._id, 'reject', { reason: actionData.reason.trim() });
      }

      closeActionModal();
    } finally {
      setSubmittingAction(false);
    }
  };

  const toggleVendorSelection = (vendorId) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  const filteredVendors = useMemo(
    () =>
      vendors.filter((vendor) =>
        [vendor.shopName, vendor.email, vendor.phone]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [vendors, searchQuery]
  );

  const requestSummary = [
    {
      key: 'vendors',
      label: 'Pending Vendor Approvals',
      count: requests.pendingVendors.length,
      tone: 'orange',
      helper: 'New sellers waiting for onboarding approval',
      to: '/admin/vendors',
    },
    {
      key: 'categories',
      label: 'Category Access Requests',
      count: requests.categoryRequests.length,
      tone: 'blue',
      helper: 'Vendors asking for new selling categories',
      to: '/admin/category-requests',
    },
    {
      key: 'marketing',
      label: 'Voucher & Campaign Requests',
      count: requests.marketingRequests.length,
      tone: 'purple',
      helper: 'Promotions, vouchers, and campaign submissions',
      to: '/admin/vendor-activity',
    },
    {
      key: 'payouts',
      label: 'Payout Requests',
      count: requests.payoutRequests.length,
      tone: 'green',
      helper: 'Vendor payout approvals waiting for finance review',
      to: '/admin/payout-requests',
    },
  ];

  const isRequestCenterRoute = location.pathname === '/admin/vendor-requests';
  const totalPendingRequests = requestSummary.reduce((sum, item) => sum + item.count, 0);
  const requestTabs = [
    { key: 'all', label: 'All Requests', count: totalPendingRequests },
    { key: 'vendors', label: 'Vendor Approval', count: requests.pendingVendors.length },
    { key: 'categories', label: 'Category Access', count: requests.categoryRequests.length },
    { key: 'marketing', label: 'Marketing', count: requests.marketingRequests.length },
    { key: 'payouts', label: 'Payouts', count: requests.payoutRequests.length },
  ];
  const showRequestCard = (key) => !isRequestCenterRoute || activeRequestTab === 'all' || activeRequestTab === key;
  const requestLimit = isRequestCenterRoute ? undefined : 4;

  const modalConfig = getRequestModalConfig(actionModal);

  if (loading && !vendors.length) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isRequestCenterRoute ? 'Vendor Requests & Approvals' : 'Vendor Management'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {isRequestCenterRoute
                ? 'Approve vendor onboarding, category access, marketing submissions, and payouts from one easy admin queue.'
                : 'Review vendor requests, approve marketplace operations, and monitor all stores from one place.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isRequestCenterRoute ? (
              <Link
                to="/admin/vendors"
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Open Vendor Directory
              </Link>
            ) : null}
            <Link
              to="/admin/vendor-activity"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Open Activity Center
            </Link>
            <Link
              to="/admin/chats"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              Vendor Messages
            </Link>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Total Vendors</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Active Vendors</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.approved || 0}</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.pending || 0}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Suspended</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{stats.suspended || 0}</p>
            </div>
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Vendor Request Center</h2>
              <p className="mt-1 text-sm text-gray-500">
                Handle vendor approvals, category access, marketing submissions, payouts, and product review follow-ups.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
                {totalPendingRequests} total pending requests
              </div>
              {isRequestCenterRoute && (
                <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 ring-1 ring-orange-200">
                  {requestLoading ? 'Refreshing queues...' : 'Live approval workspace'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {requestSummary.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{item.count}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.tone === 'orange' ? 'bg-orange-100 text-orange-700' : item.tone === 'blue' ? 'bg-blue-100 text-blue-700' : item.tone === 'purple' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    Pending
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-500">{item.helper}</p>
              </Link>
            ))}
          </div>

          {isRequestCenterRoute && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Request Sections</h3>
                  <p className="mt-1 text-sm text-gray-500">Switch between request types without leaving the page.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requestTabs.map((tab) => (
                    <RequestTabButton
                      key={tab.key}
                      active={activeRequestTab === tab.key}
                      label={tab.label}
                      count={tab.count}
                      onClick={() => setActiveRequestTab(tab.key)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={`grid gap-5 ${isRequestCenterRoute ? 'xl:grid-cols-[1.15fr_0.85fr]' : 'xl:grid-cols-2'}`}>
            <div className="space-y-5">
            {showRequestCard('vendors') && (
              <RequestCard
                title="Vendor Approval Queue"
                count={requests.pendingVendors.length}
                tone="orange"
                actionLabel="All Vendors"
                actionTo="/admin/vendors"
              >
              {requestLoading ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading vendor requests...</div>
              ) : requests.pendingVendors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                  No vendor approvals are waiting right now.
                </div>
              ) : (
                requests.pendingVendors.slice(0, requestLimit).map((vendor) => {
                  const readiness = getVendorRequirements(vendor);
                  return (
                    <div key={vendor._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link to={`/admin/vendors/${vendor._id}`} className="font-semibold text-gray-900 hover:text-orange-700">
                            {vendor.shopName || 'Unnamed Shop'}
                          </Link>
                          <p className="mt-1 text-sm text-gray-500">{vendor.email || 'No email'} • {vendor.phone || 'No phone'}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(vendor.status)}`}>
                          {vendor.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">Readiness</span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {readiness.completed}/{readiness.total} complete
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {readiness.items.map((item) => (
                          <span
                            key={item.label}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.done ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                          >
                            {item.label}
                          </span>
                        ))}
                      </div>
                      {readiness.missing.length > 0 && (
                        <p className="mt-3 text-xs text-gray-500">Missing: {readiness.missing.join(', ')}</p>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => openActionModal('approveVendor', vendor)}
                          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openActionModal('rejectVendor', vendor)}
                          className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              </RequestCard>
            )}

            {showRequestCard('categories') && (
              <RequestCard
                title="Category Access Requests"
                count={requests.categoryRequests.length}
                tone="blue"
                actionLabel="Category Requests"
                actionTo="/admin/category-requests"
              >
              {requestLoading ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading category requests...</div>
              ) : requests.categoryRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                  No pending category access requests.
                </div>
              ) : (
                requests.categoryRequests.slice(0, requestLimit).map((request) => (
                  <div key={request._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{request.categoryName}</p>
                        <p className="mt-1 text-sm text-gray-500">{request.vendorName} • {request.vendorEmail}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">{request.reason || request.description || 'No reason provided.'}</p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openActionModal('approveCategory', request)}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Grant Access
                      </button>
                      <button
                        onClick={() => openActionModal('rejectCategory', request)}
                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
              </RequestCard>
            )}

            </div>

            <div className="space-y-5">
            {showRequestCard('marketing') && (
              <RequestCard
                title="Voucher, Promotion & Campaign Requests"
                count={requests.marketingRequests.length}
                tone="purple"
                actionLabel="Marketing Queue"
                actionTo="/admin/vendor-activity"
              >
              {requestLoading ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading marketing requests...</div>
              ) : requests.marketingRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                  No pending marketing submissions.
                </div>
              ) : (
                requests.marketingRequests.slice(0, requestLimit).map((item) => (
                  <div key={item._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold capitalize text-gray-900">{item.title || item.code || 'Untitled request'}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.vendorName || 'Vendor'} • {item.type}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                      {item.description || item.adminNotes || 'No description provided.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      {item.discountType && <span className="rounded-full bg-gray-100 px-2.5 py-1">{item.discountType}</span>}
                      {item.discountValue ? <span className="rounded-full bg-gray-100 px-2.5 py-1">Value: {item.discountValue}</span> : null}
                      {item.code ? <span className="rounded-full bg-gray-100 px-2.5 py-1">Code: {item.code}</span> : null}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openActionModal('approveMarketing', item)}
                        className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openActionModal('rejectMarketing', item)}
                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
              </RequestCard>
            )}

            {showRequestCard('payouts') && (
              <RequestCard
                title="Payout Approval Queue"
                count={requests.payoutRequests.length}
                tone="green"
                actionLabel="Payout Requests"
                actionTo="/admin/payout-requests"
              >
              {requestLoading ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading payout requests...</div>
              ) : requests.payoutRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                  No pending payout requests.
                </div>
              ) : (
                requests.payoutRequests.slice(0, requestLimit).map((request) => (
                  <div key={request._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link to={`/admin/vendors/${request.vendorId}`} className="font-semibold text-gray-900 hover:text-green-700">
                          {request.vendorName || 'Unknown Vendor'}
                        </Link>
                        <p className="mt-1 text-sm text-gray-500">{formatPayoutMethod(request)}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Requested amount</span>
                      <span className="text-base font-semibold text-gray-900">৳{Number(request.amount || 0).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Requested {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'recently'}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openActionModal('approvePayout', request)}
                        className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openActionModal('rejectPayout', request)}
                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
              </RequestCard>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Related vendor review queues</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Product update approvals still happen in the activity center so admin can review edited vendor products with full context.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                    {requests.pendingProductCount} pending product approvals
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                    {requests.pendingVendors.length} vendor approvals
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                    {requests.payoutRequests.length} payout reviews
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommended order</p>
                    <ol className="mt-2 space-y-2 text-sm text-gray-700">
                      <li>1. Approve vendors that are fully ready</li>
                      <li>2. Grant or reject category access</li>
                      <li>3. Review vouchers and campaigns</li>
                      <li>4. Clear payout requests</li>
                    </ol>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin shortcuts</p>
                    <div className="mt-2 flex flex-col gap-2">
                      <Link
                        to="/admin/vendor-activity"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        Review Product Queue
                      </Link>
                      <Link
                        to="/admin/chats"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        Open Vendor Messages
                      </Link>
                    </div>
                  </div>
                </div>
                <Link
                  to="/admin/vendor-activity"
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Review Product Queue
                </Link>
              </div>
            </div>
            </div>
          </div>
        </section>

        {!isRequestCenterRoute && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search vendors by shop name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-11 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'approved', 'suspended', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
                    filter === status ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                List
              </button>
            </div>
          </div>

          {selectedVendors.length > 0 && (
            <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm font-medium text-orange-900">
                  {selectedVendors.length} vendor(s) selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkActions(true)}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
                  >
                    Bulk Actions
                  </button>
                  <button
                    onClick={() => setSelectedVendors([])}
                    className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-800 transition hover:bg-orange-100"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {!isRequestCenterRoute && (filteredVendors.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gray-100"></div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No vendors found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery ? 'Try changing the search keyword.' : 'No vendors match the selected filter right now.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredVendors.map((vendor) => {
              const readiness = getVendorRequirements(vendor);
              return (
                <div key={vendor._id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
                  <div className="relative h-28 bg-gradient-to-br from-orange-500 to-orange-600">
                    <div className="absolute right-4 top-4 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedVendors.includes(vendor._id)}
                        onChange={() => toggleVendorSelection(vendor._id)}
                        className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(vendor.status)}`}>
                        {vendor.status}
                      </span>
                    </div>
                    <div className="absolute -bottom-10 left-6 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-white text-3xl font-bold text-orange-600 shadow-lg">
                      {vendor.shopName?.charAt(0)?.toUpperCase() || 'V'}
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-14">
                    <h3 className="text-lg font-bold text-gray-900">{vendor.shopName || 'Unnamed Shop'}</h3>
                    <p className="mt-1 text-sm text-gray-500">{vendor.email || 'No email'}</p>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p>{vendor.phone || 'No phone'}</p>
                      <p>Joined {new Date(vendor.createdAt).toLocaleDateString()}</p>
                      <p>{(vendor.allowedCategoryIds || []).length} allowed categories</p>
                    </div>

                    {vendor.status === 'pending' && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Approval readiness</span>
                          <span className="text-xs font-semibold text-gray-600">{readiness.completed}/{readiness.total}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {readiness.items.map((item) => (
                            <span key={item.label} className={`rounded-full px-2 py-1 text-xs ${item.done ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex gap-2">
                      <Link
                        to={`/admin/vendors/${vendor._id}`}
                        className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-orange-700"
                      >
                        View Details
                      </Link>
                      <Link
                        to={`/admin/chat/${vendor._id}`}
                        className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
                      >
                        Chat
                      </Link>
                    </div>

                    {vendor.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openActionModal('approveVendor', vendor)}
                          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openActionModal('rejectVendor', vendor)}
                          className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {vendor.status === 'suspended' && (
                      <button
                        onClick={() => handleVendorAction(vendor._id, 'reactivate')}
                        className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedVendors.length > 0 && selectedVendors.length === filteredVendors.length}
                      onChange={(event) =>
                        setSelectedVendors(event.target.checked ? filteredVendors.map((vendor) => vendor._id) : [])
                      }
                      className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Readiness</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVendors.map((vendor) => {
                  const readiness = getVendorRequirements(vendor);
                  return (
                    <tr key={vendor._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedVendors.includes(vendor._id)}
                          onChange={() => toggleVendorSelection(vendor._id)}
                          className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{vendor.shopName || 'Unnamed Shop'}</p>
                          <p className="text-sm text-gray-500">{vendor.email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{vendor.phone || 'No phone'}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(vendor.status)}`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {vendor.status === 'pending' ? `${readiness.completed}/${readiness.total}` : 'Complete'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(vendor.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/vendors/${vendor._id}`}
                            className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
                          >
                            View
                          </Link>
                          {vendor.status === 'pending' && (
                            <>
                              <button
                                onClick={() => openActionModal('approveVendor', vendor)}
                                className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-100"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openActionModal('rejectVendor', vendor)}
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {modalConfig && actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">{modalConfig.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{modalConfig.description}</p>

            <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium text-gray-900">
                {actionModal.item.shopName ||
                  actionModal.item.vendorName ||
                  actionModal.item.title ||
                  actionModal.item.categoryName ||
                  'Selected request'}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{modalConfig.noteLabel}</label>
                <textarea
                  value={modalConfig.requiresReason ? actionData.reason : actionData.note}
                  onChange={(event) =>
                    setActionData((prev) => ({
                      ...prev,
                      [modalConfig.requiresReason ? 'reason' : 'note']: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder={modalConfig.requiresReason ? 'Enter the reason...' : 'Add an optional note...'}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={submitModalAction}
                disabled={submittingAction}
                className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingAction ? 'Saving...' : modalConfig.confirmLabel}
              </button>
              <button
                onClick={closeActionModal}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Bulk Vendor Actions</h3>
            <p className="mt-2 text-sm text-gray-600">
              Apply one action to {selectedVendors.length} selected vendors.
            </p>
            <div className="mt-5 space-y-3">
              <button
                onClick={() => {
                  handleBulkAction('approve');
                  setShowBulkActions(false);
                }}
                className="w-full rounded-xl bg-green-50 px-4 py-3 text-left text-sm font-semibold text-green-700 transition hover:bg-green-100"
              >
                Approve selected vendors
              </button>
              <button
                onClick={() => {
                  handleBulkAction('suspend');
                  setShowBulkActions(false);
                }}
                className="w-full rounded-xl bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Suspend selected vendors
              </button>
              <button
                onClick={() => {
                  handleBulkAction('reactivate');
                  setShowBulkActions(false);
                }}
                className="w-full rounded-xl bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Reactivate selected vendors
              </button>
            </div>
            <button
              onClick={() => setShowBulkActions(false)}
              className="mt-5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendorsEnhanced;
