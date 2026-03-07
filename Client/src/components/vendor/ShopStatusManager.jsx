import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getShopStatus, toggleShopStatus, setVacationMode, cancelVacationMode } from '../../services/api';

export default function ShopStatusManager() {
  const [loading, setLoading] = useState(true);
  const [shopStatus, setShopStatus] = useState(null);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationData, setVacationData] = useState({
    vacationStart: '',
    vacationEnd: '',
    vacationReason: '',
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadShopStatus();
  }, []);

  const loadShopStatus = async () => {
    try {
      const res = await getShopStatus();
      setShopStatus(res.data.data);
    } catch (error) {
      console.error('Failed to load shop status:', error);
      toast.error('Failed to load shop status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShop = async () => {
    const newStatus = !shopStatus.isShopOpen;
    
    if (!confirm(`Are you sure you want to ${newStatus ? 'open' : 'close'} your shop?`)) {
      return;
    }

    setProcessing(true);
    try {
      await toggleShopStatus(newStatus);
      toast.success(`Shop ${newStatus ? 'opened' : 'closed'} successfully`);
      loadShopStatus();
    } catch (error) {
      console.error('Failed to toggle shop:', error);
      toast.error('Failed to toggle shop status');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetVacation = async (e) => {
    e.preventDefault();
    
    if (!vacationData.vacationStart || !vacationData.vacationEnd) {
      toast.error('Please select start and end dates');
      return;
    }

    setProcessing(true);
    try {
      await setVacationMode(vacationData);
      toast.success('Vacation mode set successfully');
      setShowVacationModal(false);
      setVacationData({ vacationStart: '', vacationEnd: '', vacationReason: '' });
      loadShopStatus();
    } catch (error) {
      console.error('Failed to set vacation:', error);
      toast.error(error.response?.data?.error || 'Failed to set vacation mode');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelVacation = async () => {
    if (!confirm('Cancel vacation mode and reopen your shop?')) {
      return;
    }

    setProcessing(true);
    try {
      await cancelVacationMode();
      toast.success('Vacation cancelled successfully');
      loadShopStatus();
    } catch (error) {
      console.error('Failed to cancel vacation:', error);
      toast.error('Failed to cancel vacation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const isVacationActive = shopStatus?.isCurrentlyOnVacation;
  const vacationMode = shopStatus?.vacationMode;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Shop Status Management
        </h2>
        <p className="text-orange-100 text-sm mt-1">Control when your shop is open and visible to customers</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Status */}
        <div className={`border-2 rounded-xl p-4 ${
          shopStatus?.isShopOpen && !isVacationActive
            ? 'border-green-300 bg-green-50'
            : 'border-red-300 bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                shopStatus?.isShopOpen && !isVacationActive
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`}>
                <span className="text-2xl">
                  {shopStatus?.isShopOpen && !isVacationActive ? '🏪' : '🔒'}
                </span>
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">
                  {shopStatus?.isShopOpen && !isVacationActive ? 'Shop is Open' : 'Shop is Closed'}
                </p>
                <p className="text-sm text-gray-600">
                  {isVacationActive
                    ? 'Currently on vacation'
                    : shopStatus?.isShopOpen
                    ? 'Your products are visible to customers'
                    : 'Your products are hidden from homepage'}
                </p>
              </div>
            </div>
            
            {!isVacationActive && (
              <button
                onClick={handleToggleShop}
                disabled={processing}
                className={`px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50 ${
                  shopStatus?.isShopOpen
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {processing ? 'Processing...' : shopStatus?.isShopOpen ? 'Close Shop' : 'Open Shop'}
              </button>
            )}
          </div>
        </div>

        {/* Vacation Mode Section */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">🏖️</span>
                Vacation Mode
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Schedule time off and automatically close your shop during vacation
              </p>
            </div>
            
            {!vacationMode?.enabled ? (
              <button
                onClick={() => setShowVacationModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Set Vacation
              </button>
            ) : (
              <button
                onClick={handleCancelVacation}
                disabled={processing}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
              >
                {processing ? 'Cancelling...' : 'Cancel Vacation'}
              </button>
            )}
          </div>

          {vacationMode?.enabled && (
            <div className={`mt-4 p-4 rounded-lg ${
              isVacationActive ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{isVacationActive ? '⏰' : '📅'}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {isVacationActive ? 'Vacation Active' : 'Vacation Scheduled'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>From:</strong> {new Date(vacationMode.startDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>To:</strong> {new Date(vacationMode.endDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  {vacationMode.reason && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Reason:</strong> {vacationMode.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>When shop is closed, your products won't appear on the homepage</li>
                <li>Existing orders will still be processed normally</li>
                <li>Vacation mode automatically closes your shop during the selected period</li>
                <li>Shop will automatically reopen when vacation ends</li>
                <li>Customers can still view your shop page but can't place new orders</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Vacation Modal */}
      {showVacationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Set Vacation Mode</h3>
            
            <form onSubmit={handleSetVacation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={vacationData.vacationStart}
                  onChange={(e) => setVacationData({ ...vacationData, vacationStart: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={vacationData.vacationEnd}
                  onChange={(e) => setVacationData({ ...vacationData, vacationEnd: e.target.value })}
                  min={vacationData.vacationStart || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <textarea
                  value={vacationData.vacationReason}
                  onChange={(e) => setVacationData({ ...vacationData, vacationReason: e.target.value })}
                  rows={3}
                  placeholder="e.g., Annual vacation, Family emergency..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Your shop will be automatically closed during this period. 
                  Products won't appear on the homepage, but existing orders will still be processed.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Setting...' : 'Set Vacation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVacationModal(false);
                    setVacationData({ vacationStart: '', vacationEnd: '', vacationReason: '' });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
