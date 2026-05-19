import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageCircle, Star, Store, Users } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { usePlatformConfig } from "../context/PlatformConfigContext";
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
  const { isShopDirectoryVisible } = usePlatformConfig();
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

  const storePath = vendor.slug ? `/shops/${vendor.slug}` : `/products?vendorId=${id}`;
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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {vendor.logo ? (
            <img
              src={vendor.logo}
              alt={vendor.shopName}
              className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800">
              <Store className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-white">
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

        <div className={`grid w-full gap-2 sm:w-auto sm:min-w-[14rem] xl:min-w-0 xl:shrink-0 ${isShopDirectoryVisible ? "grid-cols-2" : "grid-cols-1"}`}>
          {isShopDirectoryVisible ? (
            <Link
              to={storePath}
              className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md border border-gray-300 px-3 text-xs font-bold text-gray-800 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800 sm:text-sm"
            >
              <Store className="h-4 w-4 shrink-0" />
              <span className="truncate">Visit Store</span>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleFollow}
            disabled={busy}
            className={`inline-flex h-10 min-w-0 items-center justify-center rounded-md px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60 sm:text-sm ${
              isFollowing
                ? "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100"
                : "bg-primary-600 text-white hover:bg-primary-700"
            }`}
          >
            <span className="truncate">
              {busy ? "Saving..." : isFollowing ? "Following" : "Follow"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
