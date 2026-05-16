import { AlertCircle, Ban, Clock3, Store, XCircle } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loading from "./Loading";

const statusCopy = {
  pending: {
    icon: Clock3,
    title: "Vendor application pending",
    message:
      "Your shop application is in review. You can come back here as soon as admin approves the account.",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  rejected: {
    icon: XCircle,
    title: "Vendor application rejected",
    message:
      "Your application was rejected. Please check your submitted details and contact support before applying again.",
    tone: "bg-red-50 text-red-700 border-red-200",
  },
  suspended: {
    icon: Ban,
    title: "Vendor account suspended",
    message:
      "Your seller account is currently suspended. Product, order, and finance tools are paused until admin reactivates it.",
    tone: "bg-red-50 text-red-700 border-red-200",
  },
};

function VendorStatusScreen({ status }) {
  const config = statusCopy[status] || {
    icon: AlertCircle,
    title: "Vendor access unavailable",
    message:
      "We could not confirm an approved vendor profile for this account.",
    tone: "bg-slate-50 text-slate-700 border-slate-200",
  };
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className={`mb-5 inline-flex rounded-full border p-3 ${config.tone}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{config.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Go to Store
          </Link>
          <Link
            to="/support"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VendorRoute({ children }) {
  const { user, loading, role, isAdmin, vendorProfile, vendorStatus } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (isAdmin) {
    return children;
  }

  if (!vendorProfile) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 inline-flex rounded-full border border-orange-200 bg-orange-50 p-3 text-orange-700">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your vendor profile</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            This account does not have a seller profile yet. Register your shop first, then admin can review it.
          </p>
          <Link
            to="/vendor/register"
            className="mt-6 inline-flex rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Register Shop
          </Link>
        </div>
      </div>
    );
  }

  if (vendorStatus !== "approved" || role !== "vendor") {
    return <VendorStatusScreen status={vendorStatus} />;
  }

  return children;
}
