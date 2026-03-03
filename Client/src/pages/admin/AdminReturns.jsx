import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  getAllReturns,
  updateReturnStatus,
  processRefund,
} from "../../services/api";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: "",
    adminNotes: "",
  });
  const [refundData, setRefundData] = useState({
    refundAmount: "",
    refundMethod: "original",
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await getAllReturns();
      setReturns(response.data.data);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading("Updating return status...");
    try {
      await updateReturnStatus(
        selectedReturn._id,
        statusUpdate.status,
        statusUpdate.adminNotes,
      );
      await fetchReturns();
      setShowModal(false);
      setSelectedReturn(null);
      setStatusUpdate({ status: "", adminNotes: "" });
      toast.success("Return status updated successfully!", {
        id: loadingToast,
      });
    } catch (error) {
      toast.error("Failed to update return status", {
        id: loadingToast,
      });
    }
  };

  const handleProcessRefund = async () => {
    if (!refundData.refundAmount) {
      toast.error("Please enter refund amount");
      return;
    }

    const loadingToast = toast.loading("Processing refund...");
    try {
      await processRefund(
        selectedReturn._id,
        parseFloat(refundData.refundAmount),
        refundData.refundMethod,
      );

      // Note: Notification will be sent to the customer's account
      // This would require backend implementation to send notifications to specific users

      await fetchReturns();
      setShowModal(false);
      setSelectedReturn(null);
      setRefundData({ refundAmount: "", refundMethod: "original" });
      toast.success("Refund processed successfully!", {
        id: loadingToast,
      });
    } catch (error) {
      toast.error("Failed to process refund", {
        id: loadingToast,
      });
    }
  };

  const openStatusModal = (returnItem) => {
    setSelectedReturn(returnItem);
    setStatusUpdate({
      status: returnItem.status,
      adminNotes: returnItem.adminNotes || "",
    });
    setRefundData({
      refundAmount: returnItem.productPrice.toString(),
      refundMethod: "original",
    });
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      processing: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Returns Management
              </h1>
              <p className="text-gray-600">
                Manage customer return requests and refunds
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Returns List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {returns.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Returns Yet
            </h3>
            <p className="text-gray-600">
              No return requests have been submitted yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Refund Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.map((returnItem) => (
                    <tr key={returnItem._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-sm text-gray-900">
                          #{returnItem._id.slice(-8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {returnItem.userInfo ? (
                            <div>
                              <div className="font-medium text-gray-900">
                                {returnItem.userInfo.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {returnItem.userInfo.email}
                              </div>
                              <div className="text-xs text-gray-500">
                                📞 {returnItem.userInfo.phone}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              {returnItem.userId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {returnItem.productTitle}
                        </div>
                        <div className="text-sm text-gray-500">
                          Qty: {returnItem.quantity}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {returnItem.reason}
                        </div>
                        {returnItem.description && (
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {returnItem.description}
                          </div>
                        )}
                        {returnItem.images && returnItem.images.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <svg
                              className="w-4 h-4 text-blue-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-xs text-blue-600">
                              {returnItem.images.length} image
                              {returnItem.images.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ৳{returnItem.productPrice}
                        </div>
                        {returnItem.refundAmount && (
                          <div className="text-sm text-green-600">
                            Refunded: ৳{returnItem.refundAmount}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {returnItem.refundMethod &&
                        returnItem.refundAccountNumber ? (
                          <div className="text-sm">
                            <div className="font-semibold text-gray-900 capitalize mb-1 flex items-center gap-2">
                              {returnItem.refundMethod === "bkash" && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                  📱 bKash
                                </span>
                              )}
                              {returnItem.refundMethod === "nagad" && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                  📱 Nagad
                                </span>
                              )}
                              {returnItem.refundMethod === "rocket" && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                  📱 Rocket
                                </span>
                              )}
                              {returnItem.refundMethod === "upay" && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  📱 Upay
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded font-semibold">
                                {returnItem.refundAccountNumber}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(
                                    returnItem.refundAccountNumber,
                                  );
                                  toast.success("Account number copied!");
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Copy account number"
                              >
                                <svg
                                  className="w-3 h-3 text-gray-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">
                            Not provided
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(returnItem.status)}`}
                        >
                          {returnItem.status.charAt(0).toUpperCase() +
                            returnItem.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(returnItem.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openStatusModal(returnItem)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Manage Return #${selectedReturn?._id.slice(-8)}`}
      >
        {selectedReturn && (
          <div className="space-y-6">
            {/* Customer Information */}
            {selectedReturn.userInfo && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-purple-700 font-medium">Name:</span>
                    <p className="text-purple-900 font-semibold mt-1">
                      {selectedReturn.userInfo.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-purple-700 font-medium">Email:</span>
                    <p className="text-purple-900 font-semibold mt-1 break-all">
                      {selectedReturn.userInfo.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-purple-700 font-medium">Phone:</span>
                    <p className="text-purple-900 font-semibold mt-1">
                      📞 {selectedReturn.userInfo.phone}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Return Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Return Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Product:</span>
                  <p className="font-medium">{selectedReturn.productTitle}</p>
                </div>
                <div>
                  <span className="text-gray-500">Quantity:</span>
                  <p className="font-medium">{selectedReturn.quantity}</p>
                </div>
                <div>
                  <span className="text-gray-500">Reason:</span>
                  <p className="font-medium">{selectedReturn.reason}</p>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <p className="font-medium">৳{selectedReturn.productPrice}</p>
                </div>
              </div>
              {selectedReturn.description && (
                <div className="mt-3">
                  <span className="text-gray-500">Description:</span>
                  <p className="text-sm mt-1">{selectedReturn.description}</p>
                </div>
              )}

              {/* Refund Banking Information */}
              {selectedReturn.refundMethod &&
                selectedReturn.refundAccountNumber && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg shadow-sm">
                    <h5 className="font-bold text-green-900 mb-3 flex items-center gap-2 text-base">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      💰 Refund Payment Details
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <span className="text-green-700 font-semibold text-sm block mb-2">
                          Refund Method:
                        </span>
                        <p className="text-green-900 font-bold text-lg capitalize flex items-center gap-2">
                          {selectedReturn.refundMethod === "bkash" &&
                            "📱 bKash"}
                          {selectedReturn.refundMethod === "nagad" &&
                            "📱 Nagad"}
                          {selectedReturn.refundMethod === "rocket" &&
                            "📱 Rocket"}
                          {selectedReturn.refundMethod === "upay" && "📱 Upay"}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <span className="text-green-700 font-semibold text-sm block mb-2">
                          Account Number:
                        </span>
                        <div className="flex items-center gap-2">
                          <p className="text-green-900 font-bold text-lg font-mono">
                            {selectedReturn.refundAccountNumber}
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                selectedReturn.refundAccountNumber,
                              );
                              toast.success(
                                "Account number copied to clipboard!",
                                {
                                  icon: "📋",
                                },
                              );
                            }}
                            className="p-1.5 hover:bg-green-100 rounded transition-colors"
                            title="Copy account number"
                          >
                            <svg
                              className="w-4 h-4 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-sm bg-green-100 rounded-lg p-3">
                      <svg
                        className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-green-800 font-medium">
                        <strong>Important:</strong> Process refund to this{" "}
                        {selectedReturn.refundMethod.toUpperCase()} account when
                        approved. Customer is expecting payment to this number.
                      </p>
                    </div>
                  </div>
                )}

              {/* Display uploaded images */}
              {selectedReturn.images && selectedReturn.images.length > 0 && (
                <div className="mt-4">
                  <span className="text-gray-500 block mb-2">
                    Uploaded Images:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedReturn.images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={`Return evidence ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(imageUrl, "_blank")}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Click on images to view full size
                  </p>
                </div>
              )}
            </div>

            {/* Status Update Form */}
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) =>
                    setStatusUpdate({
                      ...statusUpdate,
                      status: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes
                </label>
                <textarea
                  value={statusUpdate.adminNotes}
                  onChange={(e) =>
                    setStatusUpdate({
                      ...statusUpdate,
                      adminNotes: e.target.value,
                    })
                  }
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="Add notes for the customer..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors"
              >
                Update Status
              </button>
            </form>

            {/* Refund Section */}
            {(selectedReturn.status === "approved" ||
              selectedReturn.status === "processing") &&
              !selectedReturn.refundAmount && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Process Refund
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Refund Amount (৳) *
                      </label>
                      <input
                        type="number"
                        value={refundData.refundAmount}
                        onChange={(e) =>
                          setRefundData({
                            ...refundData,
                            refundAmount: e.target.value,
                          })
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        placeholder="Enter refund amount"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Refund Method
                      </label>
                      <select
                        value={refundData.refundMethod}
                        onChange={(e) =>
                          setRefundData({
                            ...refundData,
                            refundMethod: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="original">
                          Original Payment Method
                        </option>
                        <option value="bank">Bank Transfer</option>
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleProcessRefund}
                      className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors"
                    >
                      Process Refund
                    </button>
                  </div>
                </div>
              )}

            {selectedReturn.refundAmount && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium text-green-900">
                    Refund Processed
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Refund of ৳{selectedReturn.refundAmount} has been processed.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
