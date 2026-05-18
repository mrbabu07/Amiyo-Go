import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import useCurrency from '../../hooks/useCurrency';
import {
  getAdminVendorById,
  getAdminVendorProducts,
  getAdminVendorOrders,
  approveAdminProduct,
  rejectAdminProduct,
  disableAdminProduct,
  getAdminVendorFinanceSummary,
  getAdminVendorFinanceTransactions,
  getAdminVendorManagementProfile,
  updateAdminVendorStatus,
  updateAdminVendorTier,
  autoCalculateAdminVendorTier,
  updateAdminVendorCommission,
  sendAdminVendorNotice,
  issueAdminVendorViolation,
  approveVendor,
  suspendVendor,
  reactivateVendor,
  calculateEligiblePayout,
  createVendorPayout,
  getAllPayouts,
  markPayoutPaid,
  cancelPayout,
  updateOrderStatus,
} from '../../services/api';

const TABS = ['Overview', 'Management', 'Performance', 'Products', 'Orders', 'Returns', 'Earnings', 'Payouts', 'Actions'];
const PRODUCT_STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'];
const ORDER_STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const VENDOR_TIERS = [
  { key: 'normal', label: 'Normal' },
  { key: 'preferred', label: 'Preferred' },
  { key: 'star', label: 'Star' },
  { key: 'mall_seller', label: 'Mall Seller' },
];
const ADMIN_STATUS_OPTIONS = ['active', 'pending', 'suspended', 'rejected', 'blacklisted'];

const StatusBadge = ({ status }) => {
  const colors = {
    approved: 'bg-green-100 text-green-800',
    pending:  'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    suspended:'bg-red-100 text-red-800',
    disabled: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const getCancellationMessage = (order) => {
  if (order?.status !== 'cancelled') return '';
  if (order.cancellationMessage) return order.cancellationMessage;
  if (order.cancelledByRole === 'user' || order.cancellationSource === 'customer') {
    return 'User cancelled this order.';
  }
  const userCancelHistory = order.statusHistory?.find(
    (entry) =>
      entry.status === 'cancelled' &&
      /customer|user/i.test(`${entry.changedBy || ''} ${entry.note || ''}`),
  );
  return userCancelHistory ? 'User cancelled this order.' : '';
};

const getHealthColor = (color) => {
  if (color === 'green') return 'bg-green-100 text-green-800 border-green-200';
  if (color === 'yellow') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
};

const getTierLabel = (tier) => VENDOR_TIERS.find((item) => item.key === tier)?.label || tier || 'Normal';

// Helper function to get bank info from either new or old schema
const getBankInfo = (vendor) => {
  // New schema (direct fields)
  const newSchema = {
    bankName: vendor.bankName,
    bankAccountName: vendor.bankAccountName,
    bankAccountNumber: vendor.bankAccountNumber,
    bankBranch: vendor.bankBranch,
    mobileBankingProvider: vendor.mobileBankingProvider,
    mobileBankingNumber: vendor.mobileBankingNumber,
  };

  // Old schema (payoutDetails object)
  const oldSchema = vendor.payoutDetails ? {
    bankName: vendor.payoutDetails.bankName,
    bankAccountName: vendor.payoutDetails.accountName,
    bankAccountNumber: vendor.payoutDetails.accountNumber,
    bankBranch: vendor.payoutDetails.branchName,
    mobileBankingProvider: vendor.payoutMethod, // Old schema used payoutMethod for provider
    mobileBankingNumber: vendor.payoutDetails.mobileNumber,
  } : {};

  // Merge both, preferring new schema if available
  return {
    bankName: newSchema.bankName || oldSchema.bankName || '',
    bankAccountName: newSchema.bankAccountName || oldSchema.bankAccountName || '',
    bankAccountNumber: newSchema.bankAccountNumber || oldSchema.bankAccountNumber || '',
    bankBranch: newSchema.bankBranch || oldSchema.bankBranch || '',
    mobileBankingProvider: newSchema.mobileBankingProvider || oldSchema.mobileBankingProvider || '',
    mobileBankingNumber: newSchema.mobileBankingNumber || oldSchema.mobileBankingNumber || '',
  };
};

export default function AdminVendorDetail() {
  const { vendorId } = useParams();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState('Overview');

  // vendor
  const [vendor, setVendor] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(true);

  // products tab
  const [productFilter, setProductFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [allProductTotal, setAllProductTotal] = useState(0);
  const [rejectModal, setRejectModal] = useState(null); // productId
  const [rejectReason, setRejectReason] = useState('');

  // orders tab
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // earnings tab
  const [financeSummary, setFinanceSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  // payouts tab
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [eligiblePayout, setEligiblePayout] = useState(null);
  const [showCreatePayoutModal, setShowCreatePayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [createPayoutLoading, setCreatePayoutLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(null); // payoutId
  const [transactionId, setTransactionId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // returns tab
  const [returns, setReturns] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnStats, setReturnStats] = useState(null);

  // actions tab
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // management tab
  const [management, setManagement] = useState(null);
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementSaving, setManagementSaving] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: 'active',
    note: '',
    vacationModeOverride: false,
  });
  const [tierForm, setTierForm] = useState({ tier: 'normal', note: '' });
  const [commissionForm, setCommissionForm] = useState({ rate: '', note: '' });
  const [noticeForm, setNoticeForm] = useState({ subject: '', message: '', severity: 'notice' });
  const [violationForm, setViolationForm] = useState({ reason: '', severity: 'warning', note: '' });

  const syncManagementState = useCallback((profile) => {
    if (!profile) return;
    setManagement(profile);
    setStatusForm({
      status: profile.statusControl?.adminStatus || (profile.vendor?.status === 'approved' ? 'active' : profile.vendor?.status || 'active'),
      note: profile.statusControl?.note || '',
      vacationModeOverride: Boolean(profile.statusControl?.vacationModeOverride),
    });
    setTierForm({
      tier: profile.tier?.current || 'normal',
      note: profile.tier?.note || '',
    });
    setCommissionForm({
      rate: profile.commissionOverride?.rate ?? '',
      note: profile.commissionOverride?.note || '',
    });
  }, []);

  const loadManagement = useCallback(async () => {
    setManagementLoading(true);
    try {
      const res = await getAdminVendorManagementProfile(vendorId);
      syncManagementState(res.data.data);
    } catch {
      toast.error('Failed to load vendor management data');
    } finally {
      setManagementLoading(false);
    }
  }, [vendorId, syncManagementState]);

  // ─── fetch vendor ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [vendorRes, productsRes, ordersRes, financeRes, managementRes] = await Promise.all([
          getAdminVendorById(vendorId),
          getAdminVendorProducts(vendorId, { status: 'all', page: 1, limit: 5 }),
          getAdminVendorOrders(vendorId, { page: 1, limit: 5 }),
          getAdminVendorFinanceSummary(vendorId),
          getAdminVendorManagementProfile(vendorId),
        ]);

        setVendor(vendorRes.data);
        setAllProductTotal(productsRes.data.total || 0);
        setOrders(ordersRes.data.vendorOrders || ordersRes.data.orders || []);
        setOrderTotal(ordersRes.data.total || ordersRes.data.vendorOrders?.length || ordersRes.data.orders?.length || 0);
        setFinanceSummary(financeRes.data.data);
        syncManagementState(managementRes.data.data);
      } catch {
        toast.error('Failed to load vendor');
      } finally {
        setVendorLoading(false);
      }
    };
    load();
  }, [vendorId, syncManagementState]);

  useEffect(() => {
    if ((activeTab === 'Management' || activeTab === 'Performance') && !management) loadManagement();
  }, [activeTab, management, loadManagement]);

  // ─── fetch products when Products tab is active ───────────────
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await getAdminVendorProducts(vendorId, { status: productFilter, page: productPage, limit: 20 });
      setProducts(res.data.data || []);
      setProductTotal(res.data.total || 0);
      if (productFilter === 'all') setAllProductTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  }, [vendorId, productFilter, productPage]);

  useEffect(() => {
    if (activeTab === 'Products') loadProducts();
  }, [activeTab, loadProducts]);

  // ─── fetch orders ─────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'Orders') return;
    const load = async () => {
      setOrdersLoading(true);
      try {
        const res = await getAdminVendorOrders(vendorId, { page: 1, limit: 20 });
        const data = res.data;
        setOrders(data.vendorOrders || data.orders || []);
        setOrderTotal(data.total || data.vendorOrders?.length || data.orders?.length || 0);
      } catch {
        toast.error('Failed to load orders');
      } finally {
        setOrdersLoading(false);
      }
    };
    load();
  }, [activeTab, vendorId]);

  const handleAdminOrderStatusChange = async (order, newStatus) => {
    const orderId = order.parentOrderId || order._id;
    if (!orderId || !newStatus || newStatus === order.status) return;

    let trackingNumber = "";
    if (newStatus === "shipped") {
      trackingNumber = window.prompt("Tracking number (optional):", order.trackingNumber || "") || "";
    }

    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus, trackingNumber);
      setOrders((prev) =>
        prev.map((item) =>
          (item.parentOrderId || item._id)?.toString() === orderId.toString()
            ? {
                ...item,
                status: newStatus,
                overallOrderStatus: newStatus,
                trackingNumber: trackingNumber || item.trackingNumber,
                products: (item.products || []).map((product) => ({
                  ...product,
                  itemStatus: newStatus,
                })),
              }
            : item,
        ),
      );
      toast.success(`Order marked as ${newStatus}`);
      loadFinance();
      if (activeTab === 'Payouts') loadPayouts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ─── fetch finance ────────────────────────────────────────────
  const loadFinance = useCallback(async () => {
    setFinanceLoading(true);
    try {
      const [summaryRes, txRes] = await Promise.all([
        getAdminVendorFinanceSummary(vendorId),
        getAdminVendorFinanceTransactions(vendorId, { page: txPage, limit: 20 }),
      ]);
      setFinanceSummary(summaryRes.data.data);
      setTransactions(txRes.data.data || []);
      setTxTotal(txRes.data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load finance data');
    } finally {
      setFinanceLoading(false);
    }
  }, [vendorId, txPage]);

  useEffect(() => {
    if (activeTab === 'Earnings') loadFinance();
  }, [activeTab, loadFinance]);

  // ─── fetch payouts ────────────────────────────────────────────
  const loadPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const [payoutsRes, eligibleRes] = await Promise.all([
        getAllPayouts({ vendorId }),
        calculateEligiblePayout(vendorId),
      ]);
      setPayouts(payoutsRes.data.payouts || []);
      setEligiblePayout(eligibleRes.data.data);
    } catch {
      toast.error('Failed to load payouts');
    } finally {
      setPayoutsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (activeTab === 'Payouts') loadPayouts();
  }, [activeTab, loadPayouts]);

  // ─── fetch returns ────────────────────────────────────────────
  const loadReturns = useCallback(async () => {
    setReturnsLoading(true);
    try {
      const token = await user.getIdToken();
      const [returnsRes, statsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/returns/admin/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        fetch(`${import.meta.env.VITE_API_URL}/returns/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ]);
      
      // Filter returns for this vendor
      const vendorReturns = (returnsRes.data || []).filter(
        ret => ret.vendorId && ret.vendorId.toString() === vendorId
      );
      
      setReturns(vendorReturns);
      setReturnStats(statsRes.data);
    } catch {
      toast.error('Failed to load returns');
    } finally {
      setReturnsLoading(false);
    }
  }, [vendorId, user]);

  useEffect(() => {
    if (activeTab === 'Returns') loadReturns();
  }, [activeTab, loadReturns]);

  // ─── product actions ──────────────────────────────────────────
  const handleApproveProduct = async (productId) => {
    try {
      await approveAdminProduct(productId);
      setProducts(prev => prev.filter(p => p._id !== productId));
      toast.success('Product approved');
    } catch {
      toast.error('Failed to approve product');
    }
  };

  const openRejectModal = (productId) => {
    setRejectModal(productId);
    setRejectReason('');
  };

  const handleRejectProduct = async () => {
    if (!rejectReason.trim()) { toast.error('Please enter a reason'); return; }
    try {
      await rejectAdminProduct(rejectModal, rejectReason);
      setProducts(prev => prev.map(p =>
        p._id === rejectModal ? { ...p, approvalStatus: 'rejected', rejectionReason: rejectReason } : p
      ));
      toast.success('Product rejected');
      setRejectModal(null);
    } catch {
      toast.error('Failed to reject product');
    }
  };

  const handleDisableProduct = async (productId) => {
    try {
      await disableAdminProduct(productId);
      setProducts(prev => prev.map(p =>
        p._id === productId ? { ...p, isActive: false } : p
      ));
      toast.success('Product disabled');
    } catch {
      toast.error('Failed to disable product');
    }
  };

  // ─── payout actions ───────────────────────────────────────────
  const handleCreatePayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Enter valid payout amount');
      return;
    }
    setCreatePayoutLoading(true);
    try {
      await createVendorPayout(vendorId, {
        amount: parseFloat(payoutAmount),
        note: payoutNote,
      });
      toast.success('Payout created successfully');
      setShowCreatePayoutModal(false);
      setPayoutAmount('');
      setPayoutNote('');
      loadPayouts();
    } catch {
      toast.error('Failed to create payout');
    } finally {
      setCreatePayoutLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!showPaymentModal) return;
    try {
      await markPayoutPaid(showPaymentModal, {
        transactionId,
        note: paymentNote,
      });
      toast.success('Payout marked as paid');
      setShowPaymentModal(null);
      setTransactionId('');
      setPaymentNote('');
      loadPayouts();
    } catch {
      toast.error('Failed to mark payout as paid');
    }
  };

  const handleCancelPayout = async (payoutId) => {
    if (!confirm('Cancel this payout?')) return;
    try {
      await cancelPayout(payoutId, 'Cancelled by admin');
      toast.success('Payout cancelled');
      loadPayouts();
    } catch {
      toast.error('Failed to cancel payout');
    }
  };

  // ─── vendor status actions ────────────────────────────────────
  const handleVendorAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await approveVendor(vendorId);
        setVendor(v => ({ ...v, status: 'approved' }));
        toast.success('Vendor approved');
      } else if (action === 'suspend') {
        if (!actionNote.trim()) { toast.error('Enter suspension reason'); setActionLoading(false); return; }
        await suspendVendor(vendorId, actionNote);
        setVendor(v => ({ ...v, status: 'suspended' }));
        toast.success('Vendor suspended');
      } else if (action === 'reactivate') {
        await reactivateVendor(vendorId);
        setVendor(v => ({ ...v, status: 'approved' }));
        toast.success('Vendor reactivated');
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const refreshVendorAfterManagementChange = (profile) => {
    syncManagementState(profile);
    if (profile?.vendor) setVendor({ vendor: profile.vendor });
  };

  const handleStatusUpdate = async () => {
    setManagementSaving(true);
    try {
      const res = await updateAdminVendorStatus(vendorId, statusForm);
      refreshVendorAfterManagementChange(res.data.data);
      toast.success('Vendor status updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update vendor status');
    } finally {
      setManagementSaving(false);
    }
  };

  const handleTierUpdate = async () => {
    setManagementSaving(true);
    try {
      const res = await updateAdminVendorTier(vendorId, { ...tierForm, mode: 'manual' });
      refreshVendorAfterManagementChange(res.data.data);
      toast.success('Vendor tier updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update vendor tier');
    } finally {
      setManagementSaving(false);
    }
  };

  const handleAutoTier = async () => {
    setManagementSaving(true);
    try {
      const res = await autoCalculateAdminVendorTier(vendorId);
      refreshVendorAfterManagementChange(res.data.data);
      toast.success('Vendor tier auto-calculated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to auto-calculate vendor tier');
    } finally {
      setManagementSaving(false);
    }
  };

  const handleCommissionUpdate = async () => {
    setManagementSaving(true);
    try {
      const payload = {
        commissionOverrideRate: commissionForm.rate === '' ? null : Number(commissionForm.rate),
        note: commissionForm.note,
      };
      const res = await updateAdminVendorCommission(vendorId, payload);
      refreshVendorAfterManagementChange(res.data.data);
      toast.success('Commission override saved');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save commission override');
    } finally {
      setManagementSaving(false);
    }
  };

  const handleSendNotice = async () => {
    if (!noticeForm.subject.trim() || !noticeForm.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setManagementSaving(true);
    try {
      const res = await sendAdminVendorNotice(vendorId, noticeForm);
      refreshVendorAfterManagementChange(res.data.data);
      setNoticeForm({ subject: '', message: '', severity: 'notice' });
      toast.success('Notice sent to vendor');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send notice');
    } finally {
      setManagementSaving(false);
    }
  };

  const handleIssueViolation = async () => {
    if (!violationForm.reason.trim()) {
      toast.error('Violation reason is required');
      return;
    }
    setManagementSaving(true);
    try {
      const res = await issueAdminVendorViolation(vendorId, violationForm);
      refreshVendorAfterManagementChange(res.data.data);
      setViolationForm({ reason: '', severity: 'warning', note: '' });
      toast.success(res.data.message || 'Violation issued');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to issue violation');
    } finally {
      setManagementSaving(false);
    }
  };

  if (vendorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading vendor...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500">Vendor not found</div>
      </div>
    );
  }

  const v = vendor.vendor || vendor; // handle API wrapper

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin/vendors" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
            ← Back to Vendors
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{v.shopName}</h1>
            <p className="text-sm text-gray-500">{v.slug} · {v.phone}</p>
          </div>
          <StatusBadge status={v.status} />
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Quick Actions Panel */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">⚡</span>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {v.status === 'pending' && (
              <button
                onClick={() => handleVendorAction('approve')}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                <span className="text-xl">✅</span>
                Approve Vendor
              </button>
            )}
            {v.status === 'approved' && (
              <button
                onClick={() => setActiveTab('Actions')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition"
              >
                <span className="text-xl">⏸️</span>
                Suspend Vendor
              </button>
            )}
            {v.status === 'suspended' && (
              <button
                onClick={() => handleVendorAction('reactivate')}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                <span className="text-xl">▶️</span>
                Reactivate Vendor
              </button>
            )}
            <button
              onClick={() => setActiveTab('Payouts')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition"
            >
              <span className="text-xl">💰</span>
              Create Payout
            </button>
            <button
              onClick={() => setActiveTab('Products')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
            >
              <span className="text-xl">📦</span>
              View Products
            </button>
            <Link
              to={`/admin/chat/${vendorId}`}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
            >
              <span className="text-xl">💬</span>
              Send Message
            </Link>
          </div>
        </div>

        {/* Vendor Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Products</span>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{allProductTotal || productTotal || 0}</p>
            <p className="text-xs text-gray-400 mt-1">All products</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Orders</span>
              <span className="text-2xl">🛒</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{orderTotal || orders.length || financeSummary?.ordersCount || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Lifetime orders</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Earnings</span>
              <span className="text-2xl">💵</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatPrice(financeSummary?.payableEarnings ?? financeSummary?.netEarnings ?? 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">After return deductions</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Status</span>
              <span className="text-2xl">
                {v.status === 'approved' ? '✅' : v.status === 'pending' ? '⏳' : '⏸️'}
              </span>
            </div>
            <StatusBadge status={v.status} />
            <p className="text-xs text-gray-400 mt-1">Current status</p>
          </div>
        </div>

        {/* ── TAB: Overview ─────────────────────────────────────── */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shop Info</h2>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Shop Name', v.shopName],
                    ['Slug', `/${v.slug}`],
                    ['Phone', v.phone],
                    ['Status', <StatusBadge status={v.status} />],
                    ['Registered', new Date(v.createdAt).toLocaleDateString()],
                    ['Allowed Categories', v.allowedCategoryIds?.length ?? 0],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-900">{val}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  {v.status !== 'approved' && (
                    <button
                      onClick={() => handleVendorAction('approve')}
                      className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                    >
                      Approve Vendor
                    </button>
                  )}
                  {v.status === 'approved' && (
                    <button
                      onClick={() => setActiveTab('Actions')}
                      className="w-full py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                    >
                      Suspend Vendor
                    </button>
                  )}
                  {v.status === 'suspended' && (
                    <button
                      onClick={() => handleVendorAction('reactivate')}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                      Reactivate Vendor
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Payment Information</h2>
                  <p className="text-sm text-gray-600">Vendor banking details for payouts</p>
                </div>
              </div>

              {(() => {
                const bankInfo = getBankInfo(v);
                
                return (
                  <>
                    {/* Bank Transfer Details */}
                    {(bankInfo.bankName || bankInfo.bankAccountNumber) ? (
                      <div className="bg-white rounded-lg p-5 mb-4">
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                          </svg>
                          <h3 className="font-bold text-gray-900">Bank Transfer</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Bank Name</div>
                            <div className="font-semibold text-gray-900">{bankInfo.bankName || 'Not provided'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Account Name</div>
                            <div className="font-semibold text-gray-900">{bankInfo.bankAccountName || 'Not provided'}</div>
                          </div>
                          <div className="md:col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Account Number</div>
                            <div className="flex items-center gap-3">
                              <div className="font-bold text-xl text-blue-600 font-mono tracking-wider flex-1">
                                {bankInfo.bankAccountNumber || 'Not provided'}
                              </div>
                              {bankInfo.bankAccountNumber && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(bankInfo.bankAccountNumber);
                                    toast.success('Account number copied!');
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy
                                </button>
                              )}
                            </div>
                          </div>
                          {bankInfo.bankBranch && (
                            <div className="md:col-span-2">
                              <div className="text-xs text-gray-500 mb-1">Branch</div>
                              <div className="font-medium text-gray-900">{bankInfo.bankBranch}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-medium">No bank account information provided</span>
                        </div>
                      </div>
                    )}

                    {/* Mobile Banking Details */}
                    {(bankInfo.mobileBankingProvider || bankInfo.mobileBankingNumber) ? (
                      <div className="bg-white rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <h3 className="font-bold text-gray-900">Mobile Banking</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Provider</div>
                            <div className="font-semibold text-gray-900 capitalize">
                              {bankInfo.mobileBankingProvider || 'Not specified'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Mobile Number</div>
                            <div className="flex items-center gap-3">
                              <div className="font-bold text-xl text-green-600 font-mono tracking-wider flex-1">
                                {bankInfo.mobileBankingNumber || 'Not provided'}
                              </div>
                              {bankInfo.mobileBankingNumber && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(bankInfo.mobileBankingNumber);
                                    toast.success('Mobile number copied!');
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copy
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-medium">No mobile banking information provided</span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Contact Info */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Contact: {v.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{v.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Products ─────────────────────────────────────── */}
        {/* TAB: Management */}
        {activeTab === 'Management' && (
          <div className="space-y-6">
            {managementLoading && !management ? (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
                Loading management controls...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div className={`rounded-xl border p-5 shadow-sm ${getHealthColor(management?.health?.color)}`}>
                    <p className="text-sm font-medium">Account Health</p>
                    <p className="mt-2 text-4xl font-bold">{management?.health?.score ?? 0}</p>
                    <p className="mt-1 text-xs">Warnings: {management?.warningStrikes ?? 0}/3</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Current Tier</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{getTierLabel(management?.tier?.current)}</p>
                    <p className="mt-1 text-xs text-gray-500">Calculated: {getTierLabel(management?.tier?.calculated)}</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Commission Override</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {management?.commissionOverride?.rate != null ? `${management.commissionOverride.rate}%` : 'Default'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Overrides category default</p>
                  </div>
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">KYC Status</p>
                    <p className="mt-2 text-2xl font-bold capitalize text-gray-900">{management?.kyc?.status || 'not submitted'}</p>
                    <p className="mt-1 text-xs text-gray-500">{management?.kyc?.documents?.length || 0} document(s)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Vendor Status Control</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                        <select
                          value={statusForm.status}
                          onChange={(event) => setStatusForm((prev) => ({ ...prev, status: event.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                          {ADMIN_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={statusForm.vacationModeOverride}
                          onChange={(event) => setStatusForm((prev) => ({ ...prev, vacationModeOverride: event.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Force vacation mode
                      </label>
                    </div>
                    <textarea
                      value={statusForm.note}
                      onChange={(event) => setStatusForm((prev) => ({ ...prev, note: event.target.value }))}
                      rows={3}
                      placeholder="Admin note, suspension reason, or override context"
                      className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={handleStatusUpdate}
                      disabled={managementSaving}
                      className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save Status
                    </button>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Tier Management</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Tier</label>
                        <select
                          value={tierForm.tier}
                          onChange={(event) => setTierForm((prev) => ({ ...prev, tier: event.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                          {VENDOR_TIERS.map((tier) => (
                            <option key={tier.key} value={tier.key}>{tier.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        GMV {formatPrice(management?.performance?.gmv || 0)} - Health {management?.health?.score ?? 0}
                      </div>
                    </div>
                    <textarea
                      value={tierForm.note}
                      onChange={(event) => setTierForm((prev) => ({ ...prev, note: event.target.value }))}
                      rows={3}
                      placeholder="Manual assignment note"
                      className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={handleTierUpdate}
                        disabled={managementSaving}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Save Tier
                      </button>
                      <button
                        onClick={handleAutoTier}
                        disabled={managementSaving}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        Auto-Calculate Tier
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Commission Override</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Override rate (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="0.1"
                          value={commissionForm.rate}
                          onChange={(event) => setCommissionForm((prev) => ({ ...prev, rate: event.target.value }))}
                          placeholder="Blank uses default"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        Current: {management?.commissionOverride?.rate != null ? `${management.commissionOverride.rate}%` : 'Category default'}
                      </div>
                    </div>
                    <textarea
                      value={commissionForm.note}
                      onChange={(event) => setCommissionForm((prev) => ({ ...prev, note: event.target.value }))}
                      rows={3}
                      placeholder="Why this vendor has a special commission rate"
                      className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={handleCommissionUpdate}
                      disabled={managementSaving}
                      className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                    >
                      Save Commission
                    </button>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Official Notice</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <input
                        value={noticeForm.subject}
                        onChange={(event) => setNoticeForm((prev) => ({ ...prev, subject: event.target.value }))}
                        placeholder="Subject"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:col-span-2"
                      />
                      <select
                        value={noticeForm.severity}
                        onChange={(event) => setNoticeForm((prev) => ({ ...prev, severity: event.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="notice">Notice</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <textarea
                      value={noticeForm.message}
                      onChange={(event) => setNoticeForm((prev) => ({ ...prev, message: event.target.value }))}
                      rows={4}
                      placeholder="Message sent to the vendor and saved in audit trail"
                      className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={handleSendNotice}
                      disabled={managementSaving}
                      className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Send Notice
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Violation & Warning System</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <input
                        value={violationForm.reason}
                        onChange={(event) => setViolationForm((prev) => ({ ...prev, reason: event.target.value }))}
                        placeholder="Reason"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 md:col-span-2"
                      />
                      <select
                        value={violationForm.severity}
                        onChange={(event) => setViolationForm((prev) => ({ ...prev, severity: event.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      >
                        <option value="warning">Warning</option>
                        <option value="major">Major</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <textarea
                      value={violationForm.note}
                      onChange={(event) => setViolationForm((prev) => ({ ...prev, note: event.target.value }))}
                      rows={3}
                      placeholder="Evidence, policy reference, or internal note"
                      className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    />
                    <button
                      onClick={handleIssueViolation}
                      disabled={managementSaving}
                      className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Issue Warning Strike
                    </button>

                    <div className="mt-5 space-y-3">
                      {(management?.violations || []).length === 0 ? (
                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No active violations.</p>
                      ) : (
                        management.violations.map((violation) => (
                          <div key={violation._id} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-red-900">Strike {violation.strikeNumber}: {violation.reason}</p>
                              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-red-700">{violation.severity}</span>
                            </div>
                            {violation.note && <p className="mt-1 text-red-700">{violation.note}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
                    <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                      {(management?.auditTrail || []).length === 0 ? (
                        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No audit events yet.</p>
                      ) : (
                        management.auditTrail.map((event) => (
                          <div key={event._id} className="rounded-lg border border-gray-200 p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-gray-900">{event.message || event.action}</p>
                              <span className="text-xs text-gray-500">
                                {event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{event.action}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: Performance */}
        {activeTab === 'Performance' && (() => {
          const perf = management?.performance || {};
          const trend = perf.trend || [];
          const maxRevenue = Math.max(1, ...trend.map((item) => item.revenue || 0));

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ['GMV', formatPrice(perf.gmv || 0)],
                  ['Orders', perf.totalOrders || 0],
                  ['Response', `${management?.health?.responseRate ?? 0}%`],
                  ['Late Ship', `${perf.lateShipmentRate || 0}%`],
                  ['Cancel', `${perf.cancellationRate || 0}%`],
                  ['Returns', `${perf.returnRate || 0}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-xl bg-white p-6 shadow-sm xl:col-span-2">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">7-Day Revenue & Orders Trend</h2>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getHealthColor(management?.health?.color)}`}>
                      Health {management?.health?.score ?? 0}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {trend.map((item) => (
                      <div key={item.key} className="grid grid-cols-[72px_1fr_96px] items-center gap-3 text-sm">
                        <span className="text-gray-500">{item.label}</span>
                        <div className="h-8 overflow-hidden rounded-lg bg-gray-100">
                          <div
                            className="h-full rounded-lg bg-blue-600"
                            style={{ width: `${Math.max(6, ((item.revenue || 0) / maxRevenue) * 100)}%` }}
                          />
                        </div>
                        <span className="text-right font-medium text-gray-900">
                          {formatPrice(item.revenue || 0)} - {item.orders || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
                  <div className="mt-4 space-y-3">
                    {(perf.topProducts || []).length === 0 ? (
                      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No product sales yet.</p>
                    ) : (
                      perf.topProducts.map((product) => (
                        <div key={product.productId} className="rounded-lg border border-gray-200 p-3">
                          <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {product.unitsSold} sold - {formatPrice(product.revenue || 0)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Performance Benchmarks</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                  {[
                    ['Average Review', perf.averageReviewScore ? `${perf.averageReviewScore}/5` : 'No reviews'],
                    ['Cancelled Orders', perf.cancelledOrders || 0],
                    ['Returned Orders', perf.returnedOrders || 0],
                    ['Completed Orders', perf.completedOrders || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
                      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'Products' && (
          <div>
            {/* Sub-filter */}
            <div className="flex gap-2 mb-4">
              {PRODUCT_STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => { setProductFilter(s); setProductPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${
                    productFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
              <span className="ml-auto text-sm text-gray-500 self-center">{productTotal} total</span>
            </div>

            {productsLoading ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">Loading...</div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                No {productFilter} products
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-left">Price</th>
                      <th className="px-4 py-3 text-left">Stock</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map(product => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt="" className="w-10 h-10 object-cover rounded-lg" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">?</div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900 line-clamp-1">{product.title}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Admin can edit this vendor product
                              </div>
                              {product.rejectionReason && (
                                <div className="text-xs text-red-500 mt-0.5">Reason: {product.rejectionReason}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatPrice(product.price || 0)}</td>
                        <td className="px-4 py-3 text-gray-600">{product.stock ?? '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={product.approvalStatus} />
                          {product.isActive === false && (
                            <span className="ml-1 text-xs text-gray-400">(disabled)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{new Date(product.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/admin/products/edit/${product._id}?returnTo=${encodeURIComponent(`/admin/vendors/${vendorId}`)}&vendorId=${vendorId}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </Link>
                            {product.approvalStatus === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveProduct(product._id)}
                                  className="text-green-600 hover:text-green-800 font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => openRejectModal(product._id)}
                                  className="text-red-500 hover:text-red-700 font-medium"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {product.approvalStatus === 'approved' && product.isActive !== false && (
                              <button
                                onClick={() => handleDisableProduct(product._id)}
                                className="text-gray-500 hover:text-red-600 font-medium"
                              >
                                Disable
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Orders ───────────────────────────────────────── */}
        {activeTab === 'Orders' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {ordersLoading ? (
              <div className="p-8 text-center text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No orders found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Order ID</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Items</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Manage</th>
                    <th className="px-4 py-3 text-left">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{order._id?.toString().slice(-8)}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-700">{order.products?.length ?? 1}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                        {getCancellationMessage(order) && (
                          <div className="mt-1 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                            User cancelled this order
                          </div>
                        )}
                        {order.overallOrderStatus && order.overallOrderStatus !== order.status && (
                          <div className="mt-1 text-xs text-gray-500">
                            Parent: {order.overallOrderStatus}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={order.status || 'pending'}
                          onChange={(event) => handleAdminOrderStatusChange(order, event.target.value)}
                          disabled={updatingOrderId === (order.parentOrderId || order._id) || Boolean(getCancellationMessage(order))}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title={getCancellationMessage(order) ? 'This order was cancelled by the user' : 'Update order status'}
                        >
                          {ORDER_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                        {updatingOrderId === (order.parentOrderId || order._id) && (
                          <div className="mt-1 text-xs text-blue-600">Updating...</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatPrice(order.vendorSubtotal ?? order.totalAmount ?? order.total ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TAB: Returns ──────────────────────────────────────── */}
        {activeTab === 'Returns' && (
          <div className="space-y-6">
            {returnsLoading ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">Loading returns...</div>
            ) : (
              <>
                {/* Returns Impact Card */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border border-red-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Returns Impact on Payouts</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Returns</p>
                      <p className="text-2xl font-bold text-gray-900">{returns.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Pending Review</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {returns.filter(r => r.status === 'pending').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Approved</p>
                      <p className="text-2xl font-bold text-green-600">
                        {returns.filter(r => ['approved', 'completed', 'refunded'].includes(r.status)).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Deductions</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatPrice(returns
                          .filter(r => ['approved', 'completed', 'refunded'].includes(r.status))
                          .reduce((sum, r) => sum + (r.vendorDeduction || 0), 0)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-white/50 rounded-lg">
                    <p className="text-xs text-gray-700">
                      <strong>Note:</strong> When a return is approved, the vendor's earning amount is deducted from their next payout. 
                      The customer receives a full refund (including commission).
                    </p>
                  </div>
                </div>

                {/* Returns List */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-900">Return Requests</h3>
                  </div>
                  {returns.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No returns found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">Return ID</th>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Product</th>
                            <th className="px-4 py-3 text-left">Reason</th>
                            <th className="px-4 py-3 text-right">Customer Refund</th>
                            <th className="px-4 py-3 text-right">Vendor Deduction</th>
                            <th className="px-4 py-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {returns.map((ret) => (
                            <tr key={ret._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                #{ret._id?.toString().slice(-8)}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {new Date(ret.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 max-w-xs truncate">
                                  {ret.productTitle}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Qty: {ret.quantity} × {formatPrice(ret.productPrice || 0)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                {ret.reason?.replace(/_/g, ' ')}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-semibold text-gray-900">
                                  {formatPrice(ret.refundAmount || 0)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  To customer
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-semibold text-red-600">
                                  -{formatPrice(ret.vendorDeduction || 0)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  From vendor
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={ret.status} />
                                {ret.adminNotes && (
                                  <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                    {ret.adminNotes}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* How It Works */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-2">How Returns Affect Vendor Payouts:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li><strong>Customer Refund:</strong> Full amount paid (price + commission)</li>
                        <li><strong>Vendor Deduction:</strong> Only their earning amount (price - commission)</li>
                        <li><strong>Admin Loss:</strong> Commission amount is not recovered</li>
                        <li><strong>Payout Calculation:</strong> Earnings - Paid - Pending - Return Deductions</li>
                        <li><strong>Example:</strong> Product sold for ৳100 with 15% commission → Vendor earned ৳85 → If returned, vendor loses ৳85, customer gets ৳100 back</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Earnings ─────────────────────────────────────── */}
        {activeTab === 'Earnings' && (
          <div className="space-y-6">
            {financeLoading ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">Loading finance data...</div>
            ) : (
              <>
                {/* Summary Cards */}
                {financeSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                      { label: 'Gross Sales', val: formatPrice(financeSummary.grossSales || 0), color: 'text-blue-600' },
                      { label: 'Total Commission', val: formatPrice(financeSummary.totalCommission || 0), color: 'text-red-500' },
                      { label: 'Order Earnings', val: formatPrice(financeSummary.netEarningsBeforeReturns ?? financeSummary.netEarnings ?? 0), color: 'text-green-600' },
                      { label: 'Return Deductions', val: `-${formatPrice(financeSummary.returnDeductions || 0)}`, color: 'text-red-600' },
                      { label: 'Payable Earnings', val: formatPrice(financeSummary.payableEarnings ?? financeSummary.netEarnings ?? 0), color: 'text-emerald-700' },
                      { label: 'Orders', val: financeSummary.ordersCount, color: 'text-gray-700' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="bg-white rounded-xl shadow-sm p-4">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className={`text-xl font-bold ${color}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transactions Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-900">Transactions ({txTotal})</h3>
                  </div>
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No transactions yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">Order</th>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Product</th>
                            <th className="px-4 py-3 text-right">Qty</th>
                            <th className="px-4 py-3 text-right">Subtotal</th>
                            <th className="px-4 py-3 text-right">Commission %</th>
                            <th className="px-4 py-3 text-right">Commission ৳</th>
                            <th className="px-4 py-3 text-right">Vendor Earning</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {transactions.map((tx, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs text-gray-500">{tx.orderId?.toString().slice(-8)}</td>
                              <td className="px-4 py-3 text-gray-600">{new Date(tx.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-gray-800 max-w-32 truncate">{tx.product}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{tx.qty}</td>
                              <td className="px-4 py-3 text-right text-gray-800">{formatPrice(tx.subtotal || 0)}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{tx.commissionRateSnapshot ?? '—'}%</td>
                              <td className="px-4 py-3 text-right text-red-500">{tx.adminCommissionAmount != null ? formatPrice(tx.adminCommissionAmount) : '—'}</td>
                              <td className="px-4 py-3 text-right text-green-600 font-medium">{tx.vendorEarningAmount != null ? formatPrice(tx.vendorEarningAmount) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {txTotal > 20 && (
                    <div className="px-4 py-3 border-t flex justify-between items-center text-sm">
                      <button
                        disabled={txPage <= 1}
                        onClick={() => setTxPage(p => p - 1)}
                        className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="text-gray-500">Page {txPage} of {Math.ceil(txTotal / 20)}</span>
                      <button
                        disabled={txPage >= Math.ceil(txTotal / 20)}
                        onClick={() => setTxPage(p => p + 1)}
                        className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Payouts ──────────────────────────────────────── */}
        {activeTab === 'Payouts' && (
          <div className="space-y-6">
            {payoutsLoading ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">Loading payouts...</div>
            ) : (
              <>
                {/* Eligible Payout Card */}
                {eligiblePayout && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Eligible for Payout</h3>
                      <button
                        onClick={() => {
                          setPayoutAmount(eligiblePayout.eligibleAmount.toString());
                          setShowCreatePayoutModal(true);
                        }}
                        disabled={eligiblePayout.eligibleAmount <= 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create Payout
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Delivered Earnings</p>
                        <p className="text-xl font-bold text-gray-900">{formatPrice(eligiblePayout.totalDeliveredEarnings || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Already Paid</p>
                        <p className="text-xl font-bold text-red-600">{formatPrice(eligiblePayout.alreadyPaid || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Pending Payouts</p>
                        <p className="text-xl font-bold text-yellow-600">{formatPrice(eligiblePayout.pendingPayouts || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Return Deductions</p>
                        <p className="text-xl font-bold text-red-600">{formatPrice(eligiblePayout.returnDeductions || 0)}</p>
                        {eligiblePayout.returnsCount > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">{eligiblePayout.returnsCount} returns</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Available Now</p>
                        <p className="text-2xl font-bold text-green-600">{formatPrice(eligiblePayout.eligibleAmount || 0)}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                      {eligiblePayout.totalItems} delivered items from {eligiblePayout.eligibleOrdersCount} orders
                    </div>
                  </div>
                )}

                {/* Payouts History */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Payout History</h3>
                    <button
                      onClick={() => setShowCreatePayoutModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + New Payout
                    </button>
                  </div>
                  {payouts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No payouts yet</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Note</th>
                            <th className="px-4 py-3 text-left">Transaction ID</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {payouts.map((payout) => (
                            <tr key={payout._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600">
                                {new Date(payout.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                {formatPrice(payout.amount || 0)}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={payout.status} />
                              </td>
                              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                {payout.note || '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                                {payout.transactionId || '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  {payout.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => setShowPaymentModal(payout._id)}
                                        className="text-green-600 hover:text-green-800 font-medium"
                                      >
                                        Mark Paid
                                      </button>
                                      <button
                                        onClick={() => handleCancelPayout(payout._id)}
                                        className="text-red-500 hover:text-red-700 font-medium"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                  {payout.status === 'paid' && payout.paidAt && (
                                    <span className="text-xs text-gray-500">
                                      Paid {new Date(payout.paidAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Actions ──────────────────────────────────────── */}
        {activeTab === 'Actions' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Status Control</h2>
              <p className="text-sm text-gray-600 mb-2">Current status: <StatusBadge status={v.status} /></p>
              <textarea
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                rows={3}
                placeholder="Reason / admin note (required for suspend)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-3 flex-wrap">
                {v.status !== 'approved' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleVendorAction('approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                {v.status === 'approved' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleVendorAction('suspend')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
                {v.status === 'suspended' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleVendorAction('reactivate')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Reject Product Modal ─────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Reject Product</h3>
            <p className="text-sm text-gray-600 mb-2">Provide a reason (shown to vendor):</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Images are low quality..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                onClick={handleRejectProduct}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Payout Modal ──────────────────────────────────── */}
      {showCreatePayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Create Payout</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (৳)</label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {eligiblePayout && (
                  <p className="text-xs text-gray-500 mt-1">
                    Eligible: {formatPrice(eligiblePayout.eligibleAmount || 0)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea
                  value={payoutNote}
                  onChange={e => setPayoutNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Payout for January 2024..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreatePayout}
                disabled={createPayoutLoading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {createPayoutLoading ? 'Creating...' : 'Create Payout'}
              </button>
              <button
                onClick={() => {
                  setShowCreatePayoutModal(false);
                  setPayoutAmount('');
                  setPayoutNote('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Paid Modal ───────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Mark Payout as Paid</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="e.g. TXN123456789"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note (optional)</label>
                <textarea
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Paid via bank transfer..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleMarkPaid}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700"
              >
                Confirm Payment
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(null);
                  setTransactionId('');
                  setPaymentNote('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
