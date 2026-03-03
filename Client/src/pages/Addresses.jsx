import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../services/api";
import Loading from "../components/Loading";
import Modal from "../components/Modal";

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    area: "",
    zipCode: "",
    isDefault: false,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await getUserAddresses();
      setAddresses(response.data.data);
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
      if (error.response?.status === 401) {
        alert("Please log in to view your addresses");
      } else if (error.response?.status === 404) {
        console.log("Addresses endpoint not found - server may need restart");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await updateAddress(editingAddress._id, formData);
      } else {
        await createAddress(formData);
      }
      await fetchAddresses();
      handleCloseModal();
      alert(
        editingAddress
          ? "Address updated successfully!"
          : "Address added successfully!",
      );
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save address");
    }
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData({
      name: address.name,
      phone: address.phone,
      address: address.address,
      city: address.city,
      area: address.area,
      zipCode: address.zipCode || "",
      isDefault: address.isDefault,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this address?")) {
      try {
        await deleteAddress(id);
        await fetchAddresses();
        alert("Address deleted successfully!");
      } catch (error) {
        alert("Failed to delete address");
      }
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      await fetchAddresses();
    } catch (error) {
      alert("Failed to set default address");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAddress(null);
    setFormData({
      name: "",
      phone: "",
      address: "",
      city: "",
      area: "",
      zipCode: "",
      isDefault: false,
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
                to="/profile"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Profile"
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
                  My Addresses
                </h1>
                <p className="text-gray-600">Manage your delivery addresses</p>
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
              Add New Address
            </button>
          </div>
        </div>
      </div>

      {/* Addresses List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {addresses.length === 0 ? (
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Addresses Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first delivery address to make checkout faster.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              Add Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addresses.map((address) => (
              <div
                key={address._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative"
              >
                {address.isDefault && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                      Default
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {address.name}
                  </h3>
                  <p className="text-sm text-gray-600">{address.phone}</p>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {address.address}
                    <br />
                    {address.area}, {address.city}
                    {address.zipCode && ` - ${address.zipCode}`}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(address)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(address._id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>

                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address._id)}
                      className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                    >
                      Set Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Address Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingAddress ? "Edit Address" : "Add New Address"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="+880 1521-721946"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="House/Flat number, Street name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area/District *
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) =>
                  setFormData({ ...formData, area: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="e.g., Dhanmondi, Gulshan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <select
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">Select City</option>
                <option value="Dhaka">Dhaka</option>
                <option value="Chittagong">Chittagong</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Khulna">Khulna</option>
                <option value="Barisal">Barisal</option>
                <option value="Rangpur">Rangpur</option>
                <option value="Mymensingh">Mymensingh</option>
                <option value="Comilla">Comilla</option>
                <option value="Gazipur">Gazipur</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) =>
                setFormData({ ...formData, zipCode: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="e.g., 1205"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Set as default address
              </span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              {editingAddress ? "Update Address" : "Add Address"}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
