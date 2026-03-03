import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getUserReturns, createReturnRequest } from "../services/api";
import { uploadToImgBB } from "../services/imageUpload";
import Loading from "../components/Loading";
import Modal from "../components/Modal";

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    orderId: "",
    productId: "",
    reason: "",
    description: "",
    images: [],
    refundMethod: "",
    refundAccountNumber: "",
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await getUserReturns();
      setReturns(response.data.data);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    setUploadingImages(true);

    try {
      // Upload images to ImgBB if any are selected
      let imageUrls = [];
      if (selectedFiles.length > 0) {
        console.log("Uploading images...");
        const uploadPromises = selectedFiles.map((file) => uploadToImgBB(file));
        imageUrls = await Promise.all(uploadPromises);
        console.log("Images uploaded:", imageUrls);
      }

      // Submit return request with image URLs
      const returnData = {
        ...formData,
        images: imageUrls,
      };

      await createReturnRequest(returnData);
      await fetchReturns();
      setShowModal(false);
      setFormData({
        orderId: "",
        productId: "",
        reason: "",
        description: "",
        images: [],
        refundMethod: "",
        refundAccountNumber: "",
      });
      setSelectedFiles([]);
      alert("Return request submitted successfully!");
    } catch (error) {
      console.error("Return request error:", error);
      alert(error.response?.data?.error || "Failed to submit return request");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      alert("Maximum 5 images allowed");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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
    });
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/orders"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Orders"
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
                <h1 className="text-3xl font-bold text-gray-900">My Returns</h1>
                <p className="text-gray-600">
                  Track your return requests and refunds
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Request Return
            </button>
          </div>
        </div>
      </div>

      {/* Returns List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {returns.length === 0 ? (
          <div className="text-center py-12">
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
            <p className="text-gray-600 mb-6">
              You haven't requested any returns. If you need to return a
              product, click the button above.
            </p>
            <Link
              to="/orders"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View Your Orders →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {returns.map((returnItem) => (
              <div
                key={returnItem._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Return #{returnItem._id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Order #{returnItem.orderId.slice(-8)} •{" "}
                        {formatDate(returnItem.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(returnItem.status)}`}
                    >
                      {returnItem.status.charAt(0).toUpperCase() +
                        returnItem.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Product Details
                      </h4>
                      <p className="text-gray-700 mb-1">
                        {returnItem.productTitle}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {returnItem.quantity}
                      </p>
                      <p className="text-sm text-gray-600">
                        Price: ৳{returnItem.productPrice}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Return Details
                      </h4>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Reason:</strong> {returnItem.reason}
                      </p>
                      {returnItem.description && (
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Description:</strong> {returnItem.description}
                        </p>
                      )}
                      {returnItem.refundAmount && (
                        <p className="text-sm text-gray-600">
                          <strong>Refund Amount:</strong> ৳
                          {returnItem.refundAmount}
                        </p>
                      )}
                    </div>
                  </div>

                  {returnItem.adminNotes && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-1">
                        Admin Notes
                      </h5>
                      <p className="text-sm text-blue-700">
                        {returnItem.adminNotes}
                      </p>
                    </div>
                  )}

                  {returnItem.status === "completed" && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
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
                          Return Completed
                        </span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Your refund of ৳{returnItem.refundAmount} has been
                        processed.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Return Request Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Request Return"
      >
        <form onSubmit={handleSubmitReturn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order ID *
            </label>
            <input
              type="text"
              value={formData.orderId}
              onChange={(e) =>
                setFormData({ ...formData, orderId: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="Enter your order ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product ID *
            </label>
            <input
              type="text"
              value={formData.productId}
              onChange={(e) =>
                setFormData({ ...formData, productId: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="Enter the product ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Return Reason *
            </label>
            <select
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="">Select a reason</option>
              <option value="Defective Product">Defective Product</option>
              <option value="Wrong Item Received">Wrong Item Received</option>
              <option value="Size/Fit Issues">Size/Fit Issues</option>
              <option value="Not as Described">Not as Described</option>
              <option value="Damaged in Shipping">Damaged in Shipping</option>
              <option value="Changed Mind">Changed Mind</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="Please provide additional details about your return request..."
            />
          </div>

          {/* Refund Method Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Refund Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Method *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.refundMethod === "bkash"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="bkash"
                      checked={formData.refundMethod === "bkash"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          refundMethod: e.target.value,
                        })
                      }
                      required
                      className="w-4 h-4 text-primary-500"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-semibold text-gray-900">
                        bKash
                      </span>
                      <p className="text-xs text-gray-500">Mobile Banking</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.refundMethod === "nagad"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="nagad"
                      checked={formData.refundMethod === "nagad"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          refundMethod: e.target.value,
                        })
                      }
                      required
                      className="w-4 h-4 text-primary-500"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-semibold text-gray-900">
                        Nagad
                      </span>
                      <p className="text-xs text-gray-500">Mobile Banking</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.refundMethod === "rocket"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="rocket"
                      checked={formData.refundMethod === "rocket"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          refundMethod: e.target.value,
                        })
                      }
                      required
                      className="w-4 h-4 text-primary-500"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-semibold text-gray-900">
                        Rocket
                      </span>
                      <p className="text-xs text-gray-500">DBBL Mobile</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.refundMethod === "upay"
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="upay"
                      checked={formData.refundMethod === "upay"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          refundMethod: e.target.value,
                        })
                      }
                      required
                      className="w-4 h-4 text-primary-500"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-semibold text-gray-900">
                        Upay
                      </span>
                      <p className="text-xs text-gray-500">Mobile Banking</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="tel"
                  value={formData.refundAccountNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      refundAccountNumber: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="01521721946"
                  pattern="[0-9]{11}"
                  title="Please enter a valid 11-digit mobile number"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your{" "}
                  {formData.refundMethod
                    ? formData.refundMethod.charAt(0).toUpperCase() +
                      formData.refundMethod.slice(1)
                    : "mobile banking"}{" "}
                  account number (11 digits)
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Important
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Please ensure the account number is correct. Refunds will
                      be processed to this account once your return is approved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Images (Optional)
            </label>
            <div className="space-y-3">
              {/* File Input */}
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG or JPEG (MAX. 5 images)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              {/* Selected Images Preview */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <p className="text-sm text-gray-600">
                  {selectedFiles.length} image
                  {selectedFiles.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Return Policy:</strong> Items can be returned within 7
              days of delivery. Products must be in original condition with tags
              attached.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={uploadingImages}
              className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadingImages ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading Images...
                </>
              ) : (
                "Submit Return Request"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={uploadingImages}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
