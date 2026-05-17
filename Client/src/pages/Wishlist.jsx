import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Bell,
  Boxes,
  Copy,
  Heart,
  PackageCheck,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";
import useCart from "../hooks/useCart";
import useWishlist from "../hooks/useWishlist";
import Loading from "../components/Loading";
import WishlistShare from "../components/WishlistShare";
import { useCurrency } from "../hooks/useCurrency";
import {
  addWishlistCollectionItem,
  createWishlistCollection,
  deleteWishlistCollection,
  getWishlist,
  removeFromWishlist,
  removeWishlistCollectionItem,
  shareWishlistCollection,
  toggleWishlistPublic,
  updateWishlistAlert,
  updateWishlistCollection,
} from "../services/wishlistApi";

const DEFAULT_COLLECTION_ID = "default";

const getProductId = (product) => product?._id?.toString?.() || String(product?._id || "");

const getProductImage = (product) =>
  product?.image || product?.thumbnail || (Array.isArray(product?.images) ? product.images[0] : "");

const getProductTitle = (product) => product?.title || product?.name || "Product";

const getStock = (product) => Number(product?.stock ?? product?.inventory ?? 0);

const defaultAlert = (collectionId) => ({
  collectionId,
  priceDrop: { enabled: false, targetPrice: "" },
  backInStock: { enabled: false },
  flashSale: { enabled: false },
  channels: { email: true, push: true },
});

const mergeAlert = (collectionId, existing = {}, patch = {}) => ({
  ...defaultAlert(collectionId),
  ...existing,
  ...patch,
  collectionId,
  priceDrop: {
    ...defaultAlert(collectionId).priceDrop,
    ...(existing.priceDrop || {}),
    ...(patch.priceDrop || {}),
  },
  backInStock: {
    ...defaultAlert(collectionId).backInStock,
    ...(existing.backInStock || {}),
    ...(patch.backInStock || {}),
  },
  flashSale: {
    ...defaultAlert(collectionId).flashSale,
    ...(existing.flashSale || {}),
    ...(patch.flashSale || {}),
  },
  channels: {
    ...defaultAlert(collectionId).channels,
    ...(existing.channels || {}),
    ...(patch.channels || {}),
  },
});

export default function Wishlist() {
  const { addToCart } = useCart();
  const { fetchWishlist } = useWishlist();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [wishlistData, setWishlistData] = useState(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(DEFAULT_COLLECTION_ID);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [renamingCollectionId, setRenamingCollectionId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [collectionTargets, setCollectionTargets] = useState({});
  const [alertDrafts, setAlertDrafts] = useState({});
  const [actionLoading, setActionLoading] = useState("");

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await getWishlist();
      const data = response.data.data || {};
      const collections = data.collections || [];
      setWishlistData(data);

      if (!collections.some((collection) => collection.id === selectedCollectionId)) {
        setSelectedCollectionId(collections[0]?.id || DEFAULT_COLLECTION_ID);
      }
    } catch (error) {
      console.error("Failed to load wishlist:", error);
      toast.error(error.response?.data?.error || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const collections = useMemo(
    () =>
      wishlistData?.collections?.length
        ? wishlistData.collections
        : [
            {
              id: DEFAULT_COLLECTION_ID,
              name: "All Saved Items",
              products: [],
              productDetails: [],
              isDefault: true,
              isPublic: false,
              shareId: "",
            },
          ],
    [wishlistData],
  );

  const customCollections = collections.filter((collection) => !collection.isDefault);
  const selectedCollection =
    collections.find((collection) => collection.id === selectedCollectionId) || collections[0];
  const selectedProducts = selectedCollection?.productDetails || [];
  const totalItems = collections[0]?.productDetails?.length || 0;

  const refreshAll = async () => {
    await loadWishlist();
    await fetchWishlist();
  };

  const handleCreateCollection = async (event) => {
    event.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      setActionLoading("create");
      const response = await createWishlistCollection(newCollectionName);
      setNewCollectionName("");
      setSelectedCollectionId(response.data.data.id);
      await refreshAll();
      toast.success("Wishlist collection created");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create collection");
    } finally {
      setActionLoading("");
    }
  };

  const handleRenameCollection = async (collectionId) => {
    if (!renameValue.trim()) return;

    try {
      setActionLoading(`rename-${collectionId}`);
      await updateWishlistCollection(collectionId, { name: renameValue });
      setRenamingCollectionId("");
      setRenameValue("");
      await refreshAll();
      toast.success("Collection renamed");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to rename collection");
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm("Delete this wishlist collection? Saved products in your main wishlist will stay untouched.")) {
      return;
    }

    try {
      setActionLoading(`delete-${collectionId}`);
      await deleteWishlistCollection(collectionId);
      setSelectedCollectionId(DEFAULT_COLLECTION_ID);
      await refreshAll();
      toast.success("Collection deleted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete collection");
    } finally {
      setActionLoading("");
    }
  };

  const handleToggleShare = async () => {
    try {
      setActionLoading(`share-${selectedCollection.id}`);
      if (selectedCollection.isDefault) {
        await toggleWishlistPublic();
      } else {
        await shareWishlistCollection(selectedCollection.id, !selectedCollection.isPublic);
      }
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update sharing");
    } finally {
      setActionLoading("");
    }
  };

  const handleCopyToCollection = async (product) => {
    const productId = getProductId(product);
    const targetCollectionId =
      collectionTargets[productId] || customCollections[0]?.id || "";

    if (!targetCollectionId) {
      toast.error("Create a collection first");
      return;
    }

    try {
      setActionLoading(`copy-${productId}`);
      await addWishlistCollectionItem(targetCollectionId, productId);
      await refreshAll();
      toast.success("Added to collection");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add to collection");
    } finally {
      setActionLoading("");
    }
  };

  const handleRemoveProduct = async (product) => {
    const productId = getProductId(product);
    try {
      setActionLoading(`remove-${productId}`);
      if (selectedCollection.isDefault) {
        await removeFromWishlist(productId);
      } else {
        await removeWishlistCollectionItem(selectedCollection.id, productId);
      }
      await refreshAll();
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to remove item");
    } finally {
      setActionLoading("");
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1, getProductImage(product));
  };

  const handleMoveAllToCart = () => {
    const inStockItems = selectedProducts.filter((product) => getStock(product) > 0);
    if (inStockItems.length === 0) {
      toast.error("No in-stock items to move");
      return;
    }

    inStockItems.forEach((product) => {
      addToCart(product, 1, getProductImage(product));
    });
    toast.success(`${inStockItems.length} item${inStockItems.length === 1 ? "" : "s"} moved to cart`);
  };

  const saveAlert = async (product, patch) => {
    const productId = getProductId(product);
    const existing = product.wishlistAlert || defaultAlert(selectedCollection.id);
    const nextAlert = mergeAlert(selectedCollection.id, existing, patch);
    const targetPrice = Number(nextAlert.priceDrop.targetPrice);

    if (nextAlert.priceDrop.enabled && (!Number.isFinite(targetPrice) || targetPrice <= 0)) {
      toast.error("Enter a valid target price");
      return;
    }

    if (nextAlert.priceDrop.enabled) {
      nextAlert.priceDrop.targetPrice = targetPrice;
    }

    try {
      setActionLoading(`alert-${productId}`);
      await updateWishlistAlert(productId, nextAlert);
      await refreshAll();
      toast.success("Alert updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save alert");
    } finally {
      setActionLoading("");
    }
  };

  const getDraftTargetPrice = (product) => {
    const productId = getProductId(product);
    return (
      alertDrafts[productId]?.targetPrice ??
      product.wishlistAlert?.priceDrop?.targetPrice ??
      ""
    );
  };

  if (loading) {
    return <Loading text="Loading your wishlist..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-white"
              title="Back to Home"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Wishlist & Alerts</h1>
              <p className="mt-1 text-slate-600">
                {totalItems} saved item{totalItems === 1 ? "" : "s"} across {collections.length} list{collections.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedProducts.length > 0 && (
              <button
                onClick={handleMoveAllToCart}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <ShoppingCart className="h-4 w-4" />
                Wishlist to Cart
              </button>
            )}
            {selectedProducts.length > 0 && (
              <WishlistShare
                wishlistId={selectedCollection.shareId}
                isPublic={Boolean(selectedCollection.isPublic)}
                onTogglePublic={handleToggleShare}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-950">
                <Boxes className="h-5 w-5 text-orange-500" />
                Collections
              </h2>
              <div className="space-y-2">
                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedCollectionId(collection.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      selectedCollection?.id === collection.id
                        ? "border-orange-300 bg-orange-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{collection.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {collection.productDetails?.length || 0}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      {collection.isPublic ? (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Public link active
                        </>
                      ) : (
                        <>
                          <Heart className="h-3.5 w-3.5" />
                          Private
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleCreateCollection}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="mb-3 text-sm font-semibold uppercase text-slate-500">
                New Collection
              </h3>
              <input
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                className="input-control"
                placeholder="Birthday Gifts"
              />
              <button
                type="submit"
                disabled={actionLoading === "create" || !newCollectionName.trim()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Create List
              </button>
            </form>

            {!selectedCollection?.isDefault && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold uppercase text-slate-500">
                  Collection Settings
                </h3>
                {renamingCollectionId === selectedCollection.id ? (
                  <div className="space-y-2">
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      className="input-control"
                    />
                    <button
                      onClick={() => handleRenameCollection(selectedCollection.id)}
                      disabled={actionLoading === `rename-${selectedCollection.id}`}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Save Name
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setRenamingCollectionId(selectedCollection.id);
                      setRenameValue(selectedCollection.name);
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Rename Collection
                  </button>
                )}
                <button
                  onClick={() => handleDeleteCollection(selectedCollection.id)}
                  disabled={actionLoading === `delete-${selectedCollection.id}`}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Collection
                </button>
              </div>
            )}
          </aside>

          <main>
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    {selectedCollection?.name || "Wishlist"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Price-drop, stock, and flash-sale alerts are stored per product in this list.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    <Tag className="h-3.5 w-3.5" />
                    Price drop
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <PackageCheck className="h-3.5 w-3.5" />
                    Stock
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    <Bell className="h-3.5 w-3.5" />
                    Flash sale
                  </span>
                </div>
              </div>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Heart className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-950">This list is empty</h2>
                <p className="mt-2 text-slate-600">
                  Save products first, then organize them into named collections.
                </p>
                <Link to="/" className="btn-primary mt-6 inline-flex">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {selectedProducts.map((product) => {
                  const productId = getProductId(product);
                  const stock = getStock(product);
                  const inStock = stock > 0;
                  const alert = mergeAlert(selectedCollection.id, product.wishlistAlert || {});
                  const targetPrice = getDraftTargetPrice(product);

                  return (
                    <article
                      key={productId}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="relative aspect-square bg-slate-100">
                        <Link to={`/product/${productId}`}>
                          <img
                            src={getProductImage(product)}
                            alt={getProductTitle(product)}
                            className="h-full w-full object-cover transition duration-300 hover:scale-105"
                          />
                        </Link>
                        <button
                          onClick={() => handleRemoveProduct(product)}
                          disabled={actionLoading === `remove-${productId}`}
                          className="absolute right-3 top-3 rounded-full bg-white p-2 text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
                          title="Remove from this wishlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {!inStock && (
                          <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                            Out of Stock
                          </span>
                        )}
                        {inStock && stock <= 5 && (
                          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2 py-1 text-xs font-semibold text-white">
                            Only {stock} left
                          </span>
                        )}
                      </div>

                      <div className="space-y-4 p-4">
                        <div>
                          <Link to={`/product/${productId}`}>
                            <h3 className="line-clamp-2 font-semibold text-slate-950 transition hover:text-orange-600">
                              {getProductTitle(product)}
                            </h3>
                          </Link>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xl font-bold text-orange-600">
                              {formatPrice(product.price)}
                            </span>
                            {inStock ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                In Stock
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                                Notify Ready
                              </span>
                            )}
                          </div>
                        </div>

                        {customCollections.length > 0 && (
                          <div className="flex gap-2">
                            <select
                              value={collectionTargets[productId] || customCollections[0]?.id || ""}
                              onChange={(event) =>
                                setCollectionTargets((prev) => ({
                                  ...prev,
                                  [productId]: event.target.value,
                                }))
                              }
                              className="input-control"
                            >
                              {customCollections.map((collection) => (
                                <option key={collection.id} value={collection.id}>
                                  {collection.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleCopyToCollection(product)}
                              disabled={actionLoading === `copy-${productId}`}
                              className="rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Add
                            </button>
                          </div>
                        )}

                        <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                              Price Drop Alert
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={targetPrice}
                                onChange={(event) =>
                                  setAlertDrafts((prev) => ({
                                    ...prev,
                                    [productId]: {
                                      ...prev[productId],
                                      targetPrice: event.target.value,
                                    },
                                  }))
                                }
                                className="input-control"
                                placeholder="Target price"
                              />
                              <button
                                onClick={() =>
                                  saveAlert(product, {
                                    priceDrop: {
                                      enabled: !alert.priceDrop.enabled,
                                      targetPrice,
                                    },
                                  })
                                }
                                disabled={actionLoading === `alert-${productId}`}
                                className={`rounded-lg px-3 text-sm font-semibold transition disabled:opacity-60 ${
                                  alert.priceDrop.enabled
                                    ? "bg-blue-600 text-white"
                                    : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                                }`}
                              >
                                {alert.priceDrop.enabled ? "On" : "Set"}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() =>
                                saveAlert(product, {
                                  backInStock: { enabled: !alert.backInStock.enabled },
                                })
                              }
                              disabled={actionLoading === `alert-${productId}`}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                                alert.backInStock.enabled
                                  ? "bg-emerald-600 text-white"
                                  : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              <PackageCheck className="h-4 w-4" />
                              Stock
                            </button>
                            <button
                              onClick={() =>
                                saveAlert(product, {
                                  flashSale: { enabled: !alert.flashSale.enabled },
                                })
                              }
                              disabled={actionLoading === `alert-${productId}`}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                                alert.flashSale.enabled
                                  ? "bg-orange-600 text-white"
                                  : "border border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                              }`}
                            >
                              <Bell className="h-4 w-4" />
                              Flash
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={!inStock}
                            className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {inStock ? "Add to Cart" : "Out of Stock"}
                          </button>
                          <Link
                            to={`/product/${productId}`}
                            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
