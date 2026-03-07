import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getAvailableBalance, requestPayout } from '../../services/api';
import { useCurrency } from '../../hooks/useCurrency';
import Modal from '../Modal';

export default function PayoutRequestButton({ onRequestSuccess }) {
  const { formatPrice } = useCurrency();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [note, setNote] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank');

  useEffect(() => {
    if (showModal) {
      loadBalanceData();
    }
  }, [showModal]);

  const loadBalanceData = async () => {
    try {
      setLoading(true);
      const res = await getAvailableBalance();
      if (res.data.success) {
        setBalanceData(res.data.data);
        // Pre-fill with available balance
        setRequestAmount(res.data.data.availableBalance.toString());
      }
    } catch (error) {
      console.error('Error loading balance:', error);
      toast.error('Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(requestAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > balanceData.availableBalance) {
      toast.error(`Amount exceeds available balance (${formatPrice(balanceData.availableBalance)})`);
      return;
    }

    if (amount < balanceData.minimumPayout) {
      toast.error(`Minimum payout amount is ${formatPrice(balanceData.minimumPayout)}`);
      return;
    }

    try {
      setLoading(true);
      await requestPayout({
        amount,
        note,
        payoutMethod,
      });

      toast.success('Payout request submitted successfully!');
      setShowModal(false);
      if (onRequestSuccess) onRequestSuccess();
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error(error.response?.data?.error || 'Failed to submit payout request');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setRequestAmount('');
    setNote('');
    setPayoutMethod('bank');
  };

  return (
    <>
      <button
        onClick={openModal}
        className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition font-medium flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Request Payout
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Request Payout"
      >
        {loading && !balanceData ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : balanceData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Balance Info */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-3">Available Balance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivered Earnings:</span>
                  <span className="font-medium text-gray-900">{formatPrice(balanceData.deliveredEarnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Already Paid:</span>
                  <span className="font-medium text-red-600">-{formatPrice(balanceData.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Payouts:</span>
                  <span className="font-medium text-yellow-600">-{formatPrice(balanceData.pendingAmount)}</span>
                </div>
                {balanceData.returnDeductions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Return Deductions:</span>
                    <span className="font-medium text-red-600">-{formatPrice(balanceData.returnDeductions)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-orange-300">
                  <span className="font-semibold text-orange-900">Available:</span>
                  <span className="font-bold text-orange-600 text-lg">{formatPrice(balanceData.availableBalance)}</span>
                </div>
              </div>
            </div>

            {/* Pending Request Warning */}
            {balanceData.hasPendingRequest && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">You already have a pending payout request</p>
                    <p className="mt-1">Amount: {formatPrice(balanceData.pendingRequest?.amount || 0)}</p>
                    <p className="text-xs mt-1">Please wait for admin approval before requesting another payout.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cannot Request */}
            {!balanceData.canRequestPayout && !balanceData.hasPendingRequest && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Cannot request payout</p>
                    <p className="mt-1">
                      {balanceData.availableBalance < balanceData.minimumPayout
                        ? `Minimum payout amount is ${formatPrice(balanceData.minimumPayout)}`
                        : 'Insufficient balance'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Request Form */}
            {balanceData.canRequestPayout && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payout Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                    <input
                      type="number"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      min={balanceData.minimumPayout}
                      max={balanceData.availableBalance}
                      step="0.01"
                      required
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Min: {formatPrice(balanceData.minimumPayout)} | Max: {formatPrice(balanceData.availableBalance)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payout Method *
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (Optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="Add any additional information..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Payout Process</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Admin will review your request within 24-48 hours</li>
                        <li>Once approved, payment will be processed within 3-5 business days</li>
                        <li>You'll receive a notification when payment is completed</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </>
            )}
          </form>
        ) : null}
      </Modal>
    </>
  );
}
