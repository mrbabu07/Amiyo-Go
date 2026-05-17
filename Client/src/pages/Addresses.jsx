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
import AddressLocationFields from "../components/AddressLocationFields";
import AddressMapPicker from "../components/AddressMapPicker";

const compactParts = (parts) =>
  parts.map((part) => String(part || "").trim()).filter(Boolean);

const getSavedCoordinates = (address = {}) => ({
  latitude: address.latitude ?? address.location?.latitude ?? address.location?.coordinates?.[1] ?? "",
  longitude: address.longitude ?? address.location?.longitude ?? address.location?.coordinates?.[0] ?? "",
});

const formatAddressLines = (address = {}) => {
  const areaLine = compactParts([
    address.wardNo ? `Ward ${address.wardNo}` : "",
    address.area,
  ]).join(", ");
  const localityLine = compactParts([
    address.union,
    address.upazila,
    address.district || address.city,
    address.division,
  ]).join(", ");
  const postalLine = compactParts([
    address.zipCode,
    "Bangladesh",
  ]).join(", ");

  return compactParts([address.address, areaLine, localityLine, postalLine]);
};

const buildAddressPayload = (formData) => {
  const latitude = Number(formData.latitude);
  const longitude = Number(formData.longitude);
  const hasPin = Number.isFinite(latitude) && Number.isFinite(longitude);
  const payload = {
    ...formData,
    city: formData.district || formData.city,
    latitude: hasPin ? latitude : "",
    longitude: hasPin ? longitude : "",
  };

  if (hasPin) {
    payload.location = {
      type: "Point",
      coordinates: [longitude, latitude],
      latitude,
      longitude,
    };
  } else {
    payload.location = null;
  }

  return payload;
};

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
    divisionId: "",
    division: "",
    districtId: "",
    district: "",
    upazilaId: "",
    upazila: "",
    unionId: "",
    union: "",
    wardNo: "",
    area: "",
    zipCode: "",
    latitude: "",
    longitude: "",
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
      const payload = buildAddressPayload(formData);
      if (editingAddress) {
        await updateAddress(editingAddress._id, payload);
      } else {
        await createAddress(payload);
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
    const coordinates = getSavedCoordinates(address);
    setEditingAddress(address);
    setFormData({
      name: address.name,
      phone: address.phone,
      address: address.address,
      city: address.city || address.district || "",
      divisionId: address.divisionId || "",
      division: address.division || "",
      districtId: address.districtId || "",
      district: address.district || address.city || "",
      upazilaId: address.upazilaId || "",
      upazila: address.upazila || "",
      unionId: address.unionId || "",
      union: address.union || "",
      wardNo: address.wardNo || "",
      area: address.area,
      zipCode: address.zipCode || "",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
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
      divisionId: "",
      division: "",
      districtId: "",
      district: "",
      upazilaId: "",
      upazila: "",
      unionId: "",
      union: "",
      wardNo: "",
      area: "",
      zipCode: "",
      latitude: "",
      longitude: "",
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
                {(() => {
                  const coordinates = getSavedCoordinates(address);
                  const hasPin = coordinates.latitude && coordinates.longitude;
                  const lines = formatAddressLines(address);
                  return (
                    <>
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
                    {lines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                  {hasPin && (
                    <p className="mt-3 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Map pin: {Number(coordinates.latitude).toFixed(5)}, {Number(coordinates.longitude).toFixed(5)}
                    </p>
                  )}
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
                    </>
                  );
                })()}
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
              House Name / No *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="House name/no, flat, road"
            />
          </div>

          <AddressLocationFields value={formData} onChange={setFormData} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ward No *
              </label>
              <input
                type="text"
                value={formData.wardNo}
                onChange={(e) =>
                  setFormData({ ...formData, wardNo: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="Ward no"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area Name *
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) =>
                  setFormData({ ...formData, area: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="Village/area/road"
              />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Map Pin
            </label>
            <AddressMapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onChange={(location) =>
                setFormData((prev) => ({
                  ...prev,
                  latitude: location.latitude,
                  longitude: location.longitude,
                }))
              }
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
