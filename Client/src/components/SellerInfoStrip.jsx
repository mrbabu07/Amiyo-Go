import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageCircle, Star, Store, Users } from "lucide-react";
import useAuth from "../hooks/useAuth";
import {
  followVendor,
  getVendorFollowStatus,
  getVendorPublicInfo,
  unfollowVendor,
} from "../services/api";

const toVendorId = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value.$oid) return value.$oid;
  if (typeof value === "object" && value._id) return toVendorId(value._id);
  return String(value);
};

const numberFormat = new Intl.NumberFormat("en-BD");

export default function SellerInfoStrip({ seller, vendorId }) {
  const { user } = useAuth();
  const [vendor, setVendor] = useState(seller || null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = useMemo(() => toVendorId(vendorId || seller?.vendorId || seller?._id), [seller, vendorId]);

  useEffect(() => {
    setVendor(seller || null);
  }, [seller]);

  useEffect(() => {
    if (!id || seller?.shopName) return;
    getVendorPublicInfo(id)
      .then((response) => setVendor(response.data?.data || null))
      .catch(() => {});
  }, [id, seller?.shopName]);

  useEffect(() => {
    if (!id || !user) {
      setIsFollowing(false);
      return;
    }
    getVendorFollowStatus(id)
      .then((response) => setIsFollowing(Boolean(response.data?.isFollowing)))
      .catch(() => {});
  }, [id, user]);

  if (!id || !vendor) return null;

  const storePath = vendor.slug ? `/shop/${vendor.slug}` : `/products?vendorId=${id}`;
  const rating = Number(vendor.rating || 0);

  const handleFollow = async () => {
    if (!user) {
      alert("Please login to follow this store");
      return;
    }

    setBusy(true);
    try {
      const response = isFollowing ? await unfollowVendor(id) : await followVendor(id);
      setIsFollowing(Boolean(response.data?.isFollowing));
      setVendor((current) => {
        if (!current) return current;
        const followerDelta = response.data?.isFollowing ? 1 : -1;
        return {
          ...current,
          followerCount: Math.max(Number(current.followerCount || 0) + followerDelta, 0),
        };
      });
    } catch (error) {
      console.error("Failed to update follow status:", error);
      alert("Could not update follow status. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {vendor.logo ? (
            <img
              src={vendor.logo}
              alt={vendor.shopName}
              className="h-14 w-14 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800">
              <Store className="h-6 w-6" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {vendor.shopName}
              </h2>
              {vendor.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {rating ? rating.toFixed(1) : "New"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                {numberFormat.format(Number(vendor.followerCount || 0))} followers
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                Replies {vendor.responseTime || "within hours"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to={storePath}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800 sm:flex-none"
          >
            <Store className="h-4 w-4" />
            Visit Store
          </Link>
          <button
            type="button"
            onClick={handleFollow}
            disabled={busy}
            className={`inline-flex flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 sm:flex-none ${
              isFollowing
                ? "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100"
                : "bg-primary-600 text-white hover:bg-primary-700"
            }`}
          >
            {busy ? "Saving..." : isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>
    </div>
  );
}
