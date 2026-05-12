import { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { auth } from "../../firebase/firebase.config";
import useAuth from "../../hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const emptyAddress = {
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "Bangladesh",
};

export default function VendorProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    shopName: "",
    description: "",
    phone: "",
    email: "",
    address: emptyAddress,
    logo: "",
    banner: "",
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchVendorProfile = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await axios.get(`${API_URL}/vendors/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const vendorData = response.data.data || response.data.vendor || response.data;

        setFormData({
          shopName: vendorData.shopName || "",
          description: vendorData.description || "",
          phone: vendorData.phone || "",
          email: vendorData.email || "",
          address: vendorData.address || emptyAddress,
          logo: vendorData.logo || "",
          banner: vendorData.banner || "",
        });
      } catch (error) {
        console.error("Failed to fetch vendor profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchVendorProfile();
  }, [user]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateAddress = (field, value) => {
    setFormData((current) => ({
      ...current,
      address: { ...current.address, [field]: value },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const token = await auth.currentUser.getIdToken();
      await axios.patch(`${API_URL}/vendors/me`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Profile updated");
    } catch (error) {
      console.error("Failed to update vendor profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <Toaster position="top-right" />
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Keep your public shop information accurate for customers.
          </p>
        </div>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Shop Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Shop name</span>
              <input
                value={formData.shopName}
                onChange={(event) => updateField("shopName", event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Phone</span>
              <input
                value={formData.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-gray-700">Description</span>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(event) => updateField("description", event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Address</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["street", "Street"],
              ["city", "City"],
              ["state", "State"],
              ["zipCode", "ZIP code"],
              ["country", "Country"],
            ].map(([field, label]) => (
              <label key={field} className={field === "street" ? "block md:col-span-2" : "block"}>
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <input
                  value={formData.address?.[field] || ""}
                  onChange={(event) => updateAddress(field, event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
