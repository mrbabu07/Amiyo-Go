import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';

export default function VendorBankSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('bank'); // 'bank' or 'mobile'

  const [bankData, setBankData] = useState({
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankBranch: '',
  });

  const [mobileData, setMobileData] = useState({
    mobileBankingProvider: '',
    mobileBankingNumber: '',
  });

  useEffect(() => {
    loadBankInfo();
  }, []);

  const loadBankInfo = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.vendor) {
        setBankData({
          bankName: data.vendor.bankName || '',
          bankAccountName: data.vendor.bankAccountName || '',
          bankAccountNumber: data.vendor.bankAccountNumber || '',
          bankBranch: data.vendor.bankBranch || '',
        });
        setMobileData({
          mobileBankingProvider: data.vendor.mobileBankingProvider || '',
          mobileBankingNumber: data.vendor.mobileBankingNumber || '',
        });
      }
    } catch (error) {
      console.error('Error loading bank info:', error);
      toast.error('Failed to load bank information');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!bankData.bankName || !bankData.bankAccountName || !bankData.bankAccountNumber) {
      toast.error('Please fill in all required bank fields');
      return;
    }

    try {
      setSaving(true);
      const token = await user.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bankData),
      });

      if (res.ok) {
        toast.success('Bank information saved successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save bank information');
      }
    } catch (error) {
      console.error('Error saving bank info:', error);
      toast.error('Failed to save bank information');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMobile = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!mobileData.mobileBankingProvider || !mobileData.mobileBankingNumber) {
      toast.error('Please fill in all required mobile banking fields');
      return;
    }

    // Validate Bangladesh phone number format
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(mobileData.mobileBankingNumber)) {
      toast.error('Please enter a valid Bangladesh mobile number (e.g., 01712345678)');
      return;
    }

    try {
      setSaving(true);
      const token = await user.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/vendors/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mobileData),
      });

      if (res.ok) {
        toast.success('Mobile banking information saved successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save mobile banking information');
      }
    } catch (error) {
      console.error('Error saving mobile banking info:', error);
      toast.error('Failed to save mobile banking information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Link
              to="/vendor/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Payment Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage your bank and mobile banking information for payouts</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Important: Secure Your Payment Information
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Provide accurate bank or mobile banking details to receive payouts</li>
                  <li>You can set up both bank and mobile banking options</li>
                  <li>Double-check account numbers before saving</li>
                  <li>Contact support if you need to update information after payout requests</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-xl shadow-sm border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex-1 px-6 py-4 font-medium transition ${
                activeTab === 'bank'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                Bank Transfer
              </div>
            </button>
            <button
              onClick={() => setActiveTab('mobile')}
              className={`flex-1 px-6 py-4 font-medium transition ${
                activeTab === 'mobile'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile Banking
              </div>
            </button>
          </div>
        </div>

        {/* Bank Transfer Form */}
        {activeTab === 'bank' && (
          <div className="bg-white rounded-b-xl shadow-sm p-6">
            <form onSubmit={handleSaveBank} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={bankData.bankName}
                  onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">Select your bank</option>
                  <option value="Sonali Bank">Sonali Bank</option>
                  <option value="Janata Bank">Janata Bank</option>
                  <option value="Agrani Bank">Agrani Bank</option>
                  <option value="Rupali Bank">Rupali Bank</option>
                  <option value="BASIC Bank">BASIC Bank</option>
                  <option value="Bangladesh Development Bank">Bangladesh Development Bank</option>
                  <option value="Dutch-Bangla Bank">Dutch-Bangla Bank (DBBL)</option>
                  <option value="Brac Bank">Brac Bank</option>
                  <option value="Eastern Bank">Eastern Bank (EBL)</option>
                  <option value="City Bank">City Bank</option>
                  <option value="Islami Bank">Islami Bank Bangladesh</option>
                  <option value="Prime Bank">Prime Bank</option>
                  <option value="Standard Chartered">Standard Chartered</option>
                  <option value="HSBC">HSBC</option>
                  <option value="Mutual Trust Bank">Mutual Trust Bank (MTB)</option>
                  <option value="United Commercial Bank">United Commercial Bank (UCB)</option>
                  <option value="AB Bank">AB Bank</option>
                  <option value="Bank Asia">Bank Asia</option>
                  <option value="Mercantile Bank">Mercantile Bank</option>
                  <option value="NCC Bank">NCC Bank</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankData.bankAccountName}
                  onChange={(e) => setBankData({ ...bankData, bankAccountName: e.target.value })}
                  required
                  placeholder="Enter name as per bank account"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <p className="mt-1 text-xs text-gray-500">Enter the exact name as shown on your bank account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankData.bankAccountNumber}
                  onChange={(e) => setBankData({ ...bankData, bankAccountNumber: e.target.value.replace(/\D/g, '') })}
                  required
                  placeholder="Enter your bank account number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono text-lg"
                />
                <p className="mt-1 text-xs text-gray-500">Enter only numbers, no spaces or dashes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name (Optional)
                </label>
                <input
                  type="text"
                  value={bankData.bankBranch}
                  onChange={(e) => setBankData({ ...bankData, bankBranch: e.target.value })}
                  placeholder="e.g., Dhaka Main Branch"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Bank Information'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mobile Banking Form */}
        {activeTab === 'mobile' && (
          <div className="bg-white rounded-b-xl shadow-sm p-6">
            <form onSubmit={handleSaveMobile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Banking Provider <span className="text-red-500">*</span>
                </label>
                <select
                  value={mobileData.mobileBankingProvider}
                  onChange={(e) => setMobileData({ ...mobileData, mobileBankingProvider: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">Select mobile banking provider</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="upay">Upay</option>
                  <option value="tap">TAP</option>
                  <option value="mcash">mCash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={mobileData.mobileBankingNumber}
                  onChange={(e) => setMobileData({ ...mobileData, mobileBankingNumber: e.target.value.replace(/\D/g, '') })}
                  required
                  placeholder="01712345678"
                  maxLength="11"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono text-lg"
                />
                <p className="mt-1 text-xs text-gray-500">Enter 11-digit mobile number (e.g., 01712345678)</p>
              </div>

              {/* Provider-specific instructions */}
              {mobileData.mobileBankingProvider && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">
                        {mobileData.mobileBankingProvider === 'bkash' && 'bKash Account Type'}
                        {mobileData.mobileBankingProvider === 'nagad' && 'Nagad Account Type'}
                        {mobileData.mobileBankingProvider === 'rocket' && 'Rocket Account Type'}
                        {['upay', 'tap', 'mcash'].includes(mobileData.mobileBankingProvider) && 'Account Type'}
                      </p>
                      <p>
                        Make sure you have a {mobileData.mobileBankingProvider === 'bkash' ? 'Personal' : 'registered'} account 
                        to receive payments. Agent accounts may have limitations.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Mobile Banking Information'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Current Settings Summary */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Current Payment Methods</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Status */}
            <div className={`p-4 rounded-lg border-2 ${bankData.bankAccountNumber ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                <span className="font-medium text-gray-900">Bank Transfer</span>
              </div>
              {bankData.bankAccountNumber ? (
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-green-700">✓ Configured</p>
                  <p className="mt-1">{bankData.bankName}</p>
                  <p className="font-mono">****{bankData.bankAccountNumber.slice(-4)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not configured</p>
              )}
            </div>

            {/* Mobile Banking Status */}
            <div className={`p-4 rounded-lg border-2 ${mobileData.mobileBankingNumber ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-gray-900">Mobile Banking</span>
              </div>
              {mobileData.mobileBankingNumber ? (
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-green-700">✓ Configured</p>
                  <p className="mt-1 capitalize">{mobileData.mobileBankingProvider}</p>
                  <p className="font-mono">****{mobileData.mobileBankingNumber.slice(-4)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not configured</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
