import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock,
  PackageSearch,
  ShoppingBag,
  Tag,
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import { ProductCardSkeleton } from "../components/Skeleton";
import {
  getCampaignById,
  getCampaignBySlug,
  getCampaignProducts,
  recordCampaignView,
} from "../services/api";
import { useCurrency } from "../hooks/useCurrency";

const fallbackCampaignImage =
  "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1400&h=700&fit=crop";

const isObjectId = (value = "") => /^[a-f0-9]{24}$/i.test(value);

const getSessionId = () => {
  try {
    const existing = localStorage.getItem("amiyoCampaignSessionId");
    if (existing) return existing;

    const sessionId =
      globalThis.crypto?.randomUUID?.() || `campaign-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("amiyoCampaignSessionId", sessionId);
    return sessionId;
  } catch {
    return `campaign-${Date.now()}`;
  }
};

const normalizeCampaignProduct = (row = {}) => {
  const product = row.product && typeof row.product === "object" ? row.product : row;
  const productId = product._id || product.id;
  if (!productId) return null;

  const discountedPrice = Number(row.discountedPrice);
  const basePrice = Number(row.basePrice);
  const productPrice = Number(product.price || product.salePrice || 0);
  const price = discountedPrice > 0 ? discountedPrice : productPrice;
  const originalPrice = basePrice > price ? basePrice : Number(product.originalPrice || product.compareAtPrice || 0);
  const vendor = row.vendor && typeof row.vendor === "object" ? row.vendor : {};

  return {
    ...product,
    _id: productId,
    title: product.title || product.name || "Campaign product",
    name: product.name || product.title || "Campaign product",
    image: product.image || product.imageUrl || product.thumbnail || product.images?.[0],
    price,
    originalPrice: originalPrice > price ? originalPrice : product.originalPrice,
    vendorId: vendor._id || product.vendorId,
    vendorSlug: vendor.slug || product.vendorSlug,
    vendorName: vendor.shopName || vendor.businessName || vendor.name || product.vendorName,
    vendorLogo: vendor.logo || vendor.logoUrl || product.vendorLogo,
  };
};

export default function CampaignLandingPage() {
  const { slugOrId } = useParams();
  const { formatPrice } = useCurrency();
  const [campaign, setCampaign] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState("");
  const [productsError, setProductsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCampaign = async () => {
      setLoading(true);
      setError("");
      setProductsError("");
      setProducts([]);

      try {
        const response = isObjectId(slugOrId)
          ? await getCampaignById(slugOrId)
          : await getCampaignBySlug(slugOrId);
        const campaignData = response.data.data;

        if (cancelled) return;

        if (String(campaignData?.status || "").toLowerCase() !== "active") {
          setCampaign(campaignData || null);
          setError("This campaign is not currently available.");
          return;
        }

        setCampaign(campaignData);
        setLoading(false);
        setProductsLoading(true);

        recordCampaignView(campaignData._id, {
          sessionId: getSessionId(),
          userId: localStorage.getItem("userId"),
        }).catch(() => {});

        try {
          const productsResponse = await getCampaignProducts(campaignData._id, { limit: 24 });
          if (!cancelled) {
            setProducts((productsResponse.data.data || []).map(normalizeCampaignProduct).filter(Boolean));
          }
        } catch (productLoadError) {
          if (!cancelled) {
            setProductsError(productLoadError.response?.data?.message || "Campaign products could not be loaded.");
          }
        } finally {
          if (!cancelled) setProductsLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.response?.data?.message || "Campaign not found.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCampaign();

    return () => {
      cancelled = true;
    };
  }, [slugOrId]);

  const dateRange = useMemo(() => {
    if (!campaign?.startDate || !campaign?.endDate) return "";
    const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
    return `${formatter.format(new Date(campaign.startDate))} - ${formatter.format(new Date(campaign.endDate))}`;
  }, [campaign?.endDate, campaign?.startDate]);

  const startingPrice = products
    .map((product) => Number(product.price || 0))
    .filter((price) => price > 0)
    .sort((a, b) => a - b)[0];

  if (loading) {
    return (
      <main className="bg-slate-50 py-8 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-80 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-slate-50 py-12 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-gray-950 dark:text-white">
            {campaign?.name || "Campaign unavailable"}
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">{error}</p>
          <Link
            to="/products"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700"
          >
            <ShoppingBag className="h-4 w-4" />
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 text-gray-950 dark:bg-gray-950 dark:text-white">
      <section className="border-b border-gray-200 bg-white py-6 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-gray-600 transition hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="relative overflow-hidden rounded-2xl bg-gray-950">
            <img
              src={campaign.bannerImageUrl || fallbackCampaignImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-65"
              loading="eager"
              fetchPriority="high"
              decoding="sync"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/75 to-gray-950/20" />

            <div className="relative grid min-h-[24rem] gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
                  <Tag className="h-3.5 w-3.5" />
                  {campaign.discountPercentage}% off
                </span>
                <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
                  {campaign.name}
                </h1>
                {campaign.description ? (
                  <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/82 sm:text-base">
                    {campaign.description}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-2">
                  <a
                    href="#campaign-products"
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-gray-950 transition hover:bg-orange-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Shop campaign
                  </a>
                  <Link
                    to="/products"
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
                  >
                    View all products
                  </Link>
                </div>
              </div>

              <div className="grid gap-2 text-white sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-lg border border-white/15 bg-white/12 p-3 backdrop-blur">
                  <CalendarDays className="h-5 w-5 text-orange-200" />
                  <p className="mt-2 text-xs font-bold uppercase text-white/60">Campaign dates</p>
                  <p className="mt-1 text-sm font-black">{dateRange || "Live now"}</p>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/12 p-3 backdrop-blur">
                  <PackageSearch className="h-5 w-5 text-emerald-200" />
                  <p className="mt-2 text-xs font-bold uppercase text-white/60">Products</p>
                  <p className="mt-1 text-sm font-black">{products.length || "Fresh"} picks</p>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/12 p-3 backdrop-blur">
                  <Clock className="h-5 w-5 text-sky-200" />
                  <p className="mt-2 text-xs font-bold uppercase text-white/60">Prices from</p>
                  <p className="mt-1 text-sm font-black">
                    {startingPrice ? formatPrice(startingPrice) : "Limited time"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="campaign-products" className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-600 dark:text-orange-300">
                Campaign collection
              </p>
              <h2 className="mt-1 text-2xl font-black text-gray-950 dark:text-white">Featured deals</h2>
            </div>
            <Link
              to="/products"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 transition hover:border-orange-200 hover:text-orange-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            >
              Browse store
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : productsError ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
              {productsError}
            </div>
          ) : products.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <PackageSearch className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-3 text-lg font-black text-gray-950 dark:text-white">No campaign products yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                More products may be added while this campaign is live.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
