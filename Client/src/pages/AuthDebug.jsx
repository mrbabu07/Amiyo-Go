import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { getCurrentUser } from '../services/api';

const AuthDebug = () => {
  const { user, isAdmin, loading } = useAuth();
  const [backendData, setBackendData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchBackendData();
    }
  }, [user]);

  const fetchBackendData = async () => {
    try {
      const response = await getCurrentUser();
      setBackendData(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">Auth Debug</h1>
          <p className="text-red-600">Not logged in. Please login first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Authentication Debug Info</h1>

        {/* Firebase User Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-blue-600">Firebase User</h2>
          <div className="space-y-2">
            <div className="flex">
              <span className="font-semibold w-40">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-40">Firebase UID:</span>
              <span className="font-mono text-sm">{user.uid}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-40">Email Verified:</span>
              <span>{user.emailVerified ? '✅ Yes' : '❌ No'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-40">Display Name:</span>
              <span>{user.displayName || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Frontend Auth State */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-green-600">Frontend Auth State</h2>
          <div className="space-y-2">
            <div className="flex">
              <span className="font-semibold w-40">Is Admin:</span>
              <span className={isAdmin ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {isAdmin ? '✅ TRUE' : '❌ FALSE'}
              </span>
            </div>
            <div className="flex">
              <span className="font-semibold w-40">Loading:</span>
              <span>{loading ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Backend User Data */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-purple-600">Backend User Data</h2>
          {error ? (
            <div className="text-red-600">Error: {error}</div>
          ) : backendData ? (
            <div className="space-y-2">
              <div className="flex">
                <span className="font-semibold w-40">Email:</span>
                <span>{backendData.data?.email}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">Role:</span>
                <span className={`font-bold ${
                  backendData.data?.role === 'admin' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {backendData.data?.role?.toUpperCase()}
                </span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">MongoDB ID:</span>
                <span className="font-mono text-sm">{backendData.data?._id}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">Firebase UID:</span>
                <span className="font-mono text-sm">{backendData.data?.firebaseUid}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">Status:</span>
                <span>{backendData.data?.status || 'N/A'}</span>
              </div>
              <div className="mt-4">
                <span className="font-semibold">Full Response:</span>
                <pre className="mt-2 p-4 bg-gray-100 rounded overflow-x-auto text-xs">
                  {JSON.stringify(backendData, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div>Loading backend data...</div>
          )}
        </div>

        {/* Diagnosis */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-orange-600">Diagnosis</h2>
          <div className="space-y-3">
            {user.email === 'admin@bazarbd.com' && !isAdmin && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="font-bold text-red-700">⚠️ PROBLEM DETECTED</p>
                <p className="text-red-600 mt-2">
                  You're logged in as admin@bazarbd.com but isAdmin is FALSE.
                </p>
                <p className="text-red-600 mt-1">
                  Backend role: {backendData?.data?.role}
                </p>
                <p className="text-sm text-red-500 mt-2">
                  This means the backend is returning role "{backendData?.data?.role}" instead of "admin".
                </p>
              </div>
            )}

            {user.uid !== backendData?.data?.firebaseUid && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-bold text-yellow-700">⚠️ UID MISMATCH</p>
                <p className="text-yellow-600 mt-2">
                  Firebase UID doesn't match MongoDB Firebase UID.
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  Firebase: {user.uid}
                </p>
                <p className="text-sm text-yellow-600">
                  MongoDB: {backendData?.data?.firebaseUid}
                </p>
              </div>
            )}

            {isAdmin && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="font-bold text-green-700">✅ ALL GOOD</p>
                <p className="text-green-600 mt-2">
                  You're logged in as admin and the system recognizes you correctly.
                </p>
              </div>
            )}

            {!isAdmin && user.email !== 'admin@bazarbd.com' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-bold text-blue-700">ℹ️ INFO</p>
                <p className="text-blue-600 mt-2">
                  You're logged in as a regular user (not admin).
                </p>
                <p className="text-sm text-blue-500 mt-1">
                  If you need admin access, login with: admin@bazarbd.com
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Actions</h2>
          <div className="space-y-2">
            <button
              onClick={fetchBackendData}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Refresh Backend Data
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
              }}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Clear Cache & Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDebug;
