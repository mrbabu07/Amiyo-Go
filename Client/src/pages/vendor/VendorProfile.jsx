import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import { auth } from "../../firebase/firebase.config";
import toast, { Toaster } from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function VendorProfile() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    shopName: "",
    description: "",
    phone: "",
    email: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Bangladesh",
    },
    logo: "",
    banner: "",
  });

  useEffect(() => {
    if (user) {
      fetchVendorProfile();
    }
  }, [user]);

  const fetchVendorProfile = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.get(`${API_URL}/vendors/my-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const vendorData = response.data.data;
      setVendor(vendorData);
      setFormData({
        shopName: vendorData.shopName || "",
        description: vendorData.description || "",
        phone: vendorData.phone || "",
        email: vendorData.email || "",
        address: vendorData.address || {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "Bangladesh",
        },
        logo: vendorData.logo || "",
        banner: vendorData.banner || "",
      });
    } catch (error) {
      console.error("Failed to fetch vendor profile:", error);
      toast.error("Failed to load profi