import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import {
  getAdminVendorById,
  getAdminVendorProducts,
  approveAdminProduct,
  rejectAdminProduct,
  disableAdminProduct,
  getAdminVendorFinanceSummary,
  getAdminVendorFinanceTransactions,
  approveVendor,
  suspendVendor,
  reactivateVendor,
  calculateEligiblePayout,
  createVendorPayout,
  getAllPayouts,
  markPayoutPaid,
  cancelPayout,
} from '../../services/api';

const TABS = ['Overview', 'Products', 'Orders', 'Earnings', 'Payouts', 'Actions'];
const PRODUCT_STATUS_FILTERS = ['pending', 'approved', 'rejected'];

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

export default function AdminVendorDetail() {
  const { vendorId } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');

  // vendor
  const [vendor, setVendor] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(true);

  // products tab
  const [productFilter, setProductFilter] = useState('pending');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [rejectModal, setRejectModal] = useState(null); // productId
  const [rejectReason, setRejectReason] = useState('');

  // orders tab
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

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

  // actions tab
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ─── fetch vendor ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAdminVendorById(vendorId);
        setVendor(res.data);
      } catch {
        toast.error('Failed to load vendor');
      } finally {
        setVendorLoading(false);
      }
    };
    load();
  }, [vendorId]);

  // ─── fetch products when Products tab is active ───────────────
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await getAdminVendorProducts(vendorId, { status: productFilter, page: productPage, limit: 20 });
      setProducts(res.data.data || []);
      setProductTotal(res.data.total || 0);
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
        const token = await user.getIdToken();
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/vendors/orders?vendorId=${vendorId}&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setOrders(data.vendorOrders || data.orders || []);
      } catch {
        toast.error('Failed to load orders');
      } finally {
        setOrdersLoading(false);
      }
    };
    load();
  }, [activeTab, vendorId, user]);

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

        {/* ── TAB: Overview ─────────────────────────────────────── */}
        {activeTab === 'Overview' && (
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
        )}

        {/* ── TAB: Products ─────────────────────────────────────── */}
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
                              {product.rejectionReason && (
                                <div className="text-xs text-red-500 mt-0.5">Reason: {product.rejectionReason}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">৳{product.price?.toLocaleString()}</td>
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
                    <th className="px-4 py-3 text-left">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{order._id?.toString().slice(-8)}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-700">{order.products?.length ?? 1}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 font-medium">৳{order.total?.toLocaleString() ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Gross Sales', val: `৳${financeSummary.grossSales?.toLocaleString()}`, color: 'text-blue-600' },
                      { label: 'Total Commission', val: `৳${financeSummary.totalCommission?.toLocaleString()}`, color: 'text-red-500' },
                      { label: 'Net Earnings', val: `৳${financeSummary.netEarnings?.toLocaleString()}`, color: 'text-green-600' },
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
                              <td className="px-4 py-3 text-right text-gray-800">৳{tx.subtotal?.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{tx.commissionRateSnapshot ?? '—'}%</td>
                              <td className="px-4 py-3 text-right text-red-500">৳{tx.adminCommissionAmount?.toFixed(2) ?? '—'}</td>
                              <td className="px-4 py-3 text-right text-green-600 font-medium">৳{tx.vendorEarningAmount?.toFixed(2) ?? '—'}</td>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Delivered Earnings</p>
                        <p className="text-xl font-bold text-gray-900">৳{eligiblePayout.totalDeliveredEarnings?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Already Paid</p>
                        <p className="text-xl font-bold text-red-600">৳{eligiblePayout.alreadyPaid?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Pending Payouts</p>
                        <p className="text-xl font-bold text-yellow-600">৳{eligiblePayout.pendingPayouts?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Available Now</p>
                        <p className="text-2xl font-bold text-green-600">৳{eligiblePayout.eligibleAmount?.toLocaleString()}</p>
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
                                ৳{payout.amount?.toLocaleString()}
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
                    Eligible: ৳{eligiblePayout.eligibleAmount?.toLocaleString()}
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
