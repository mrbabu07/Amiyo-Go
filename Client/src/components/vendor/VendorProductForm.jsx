import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  Image as ImageIcon,
  Layers3,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { getFieldsForCategory } from "../../utils/productFieldConfig";
import { uploadVendorProductImages } from "../../services/vendorImageUpload";
import VendorCategoryPicker from "./VendorCategoryPicker";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const defaultFormData = {
  categoryId: "",
  title: "",
  description: "",
  price: "",
  stock: "",
  sku: "",
  images: [],
  imageSettings: {},
  attributes: {},
  variants: [],
  status: "active",
  seo: {
    metaTitle: "",
    metaDescription: "",
  },
  searchKeywordInput: "",
  lowStockThreshold: "5",
  allowBackorder: false,
  restockDate: "",
  preorderEnabled: false,
  expectedShipDate: "",
};

const buildVendorCategoryOptions = (allCategories, allowedIds) => {
  const allowedSet = new Set((allowedIds || []).map((id) => id.toString()));
  const byId = new Map(allCategories.map((category) => [category._id.toString(), category]));

  const isAllowed = (category) => {
    if (allowedSet.has(category._id.toString())) return true;
    let parentId = category.parentId ? category.parentId.toString() : null;

    while (parentId) {
      if (allowedSet.has(parentId)) return true;
      parentId = byId.get(parentId)?.parentId?.toString() || null;
    }

    return false;
  };

  return allCategories
    .filter(isAllowed)
    .sort(
      (a, b) =>
        (a.displayOrder || 0) - (b.displayOrder || 0) ||
        a.name.localeCompare(b.name),
    );
};

const splitInput = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const slugPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

const makeSku = (title, color, size, index) => {
  const base = slugPart(title).slice(0, 18) || "SKU";
  const colorPart = slugPart(color).slice(0, 6) || "COLOR";
  const sizePart = slugPart(size).slice(0, 6) || "SIZE";
  return `${base}-${colorPart}-${sizePart}-${String(index + 1).padStart(2, "0")}`;
};

const normalizeVariant = (variant = {}) => ({
  color: variant.color || "",
  size: variant.size || "",
  sku: variant.sku || "",
  price: variant.price ?? "",
  stock: variant.stock ?? "",
  image: variant.image || "",
  status: variant.status || "active",
});

const normalizeProductForForm = (product, { clone = false } = {}) => {
  const keywords = product?.seo?.searchKeywords || product?.searchKeywords || [];
  const normalized = {
    ...defaultFormData,
    categoryId: product?.categoryId?.toString?.() || product?.categoryId || "",
    title: clone ? `${product?.title || ""} Copy` : product?.title || "",
    description: product?.description || "",
    price: product?.price ?? "",
    stock: product?.stock ?? "",
    sku: clone ? "" : product?.sku || product?.attributes?.sku || "",
    images: product?.images || [],
    imageSettings: product?.imageSettings || {},
    attributes: product?.attributes || {},
    variants: Array.isArray(product?.variants)
      ? product.variants.map((variant, index) => ({
          ...normalizeVariant(variant),
          sku: clone && variant.sku ? `${variant.sku}-COPY${index + 1}` : variant.sku || "",
        }))
      : [],
    status:
      clone || product?.approvalStatus === "draft"
        ? "draft"
        : product?.isActive === false || product?.status === "inactive"
          ? "inactive"
          : "active",
    seo: {
      metaTitle: product?.seo?.metaTitle || product?.metaTitle || "",
      metaDescription: product?.seo?.metaDescription || product?.metaDescription || "",
    },
    searchKeywordInput: Array.isArray(keywords) ? keywords.join(", ") : String(keywords || ""),
    lowStockThreshold: product?.lowStockThreshold ?? "5",
    allowBackorder: Boolean(product?.allowBackorder || product?.backorder?.enabled),
    restockDate: toDateInput(product?.restockDate || product?.backorder?.restockDate),
    preorderEnabled: Boolean(product?.preorderEnabled || product?.preorder?.enabled),
    expectedShipDate: toDateInput(product?.expectedShipDate || product?.preorder?.expectedShipDate),
  };

  return normalized;
};

const buildMediaItems = (images = [], imageSettings = {}) =>
  images.map((url, index) => ({
    id: `${url}-${index}`,
    url,
    file: null,
    focus: imageSettings?.crops?.[url]?.objectPosition || "center",
  }));

const FieldLabel = ({ children, required = false }) => (
  <label className="mb-2 block text-sm font-semibold text-gray-700">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

const Panel = ({ title, children }) => (
  <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    {children}
  </section>
);

export default function VendorProductForm({ mode = "create", productId = null, cloneId = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = mode === "edit";
  const isClone = mode === "clone";

  const [vendor, setVendor] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [formData, setFormData] = useState(defaultFormData);
  const [mediaItems, setMediaItems] = useState([]);
  const [colorsInput, setColorsInput] = useState("");
  const [sizesInput, setSizesInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState("");

  const targetProductId = isEdit ? productId : cloneId;

  const selectedCommissionRate =
    selectedCategory?.effectiveCommissionRate ?? selectedCategory?.commissionRate ?? 0;

  const totalVariantStock = useMemo(
    () => formData.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0),
    [formData.variants],
  );

  const updateForm = (patch) => {
    setFormData((current) => ({ ...current, ...patch }));
  };

  const updateSeo = (patch) => {
    setFormData((current) => ({
      ...current,
      seo: {
        ...current.seo,
        ...patch,
      },
    }));
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const vendorResponse = await fetch(`${API_URL}/vendors/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const vendorData = await vendorResponse.json();
      if (!vendorResponse.ok) throw new Error(vendorData.error || "Failed to load vendor profile");

      setVendor(vendorData.vendor);

      const categoriesResponse = await fetch(`${API_URL}/categories?active=true`);
      const categoriesData = await categoriesResponse.json();
      if (categoriesData.success) {
        const allowedIds = (vendorData.vendor.allowedCategoryIds || []).map((id) => id.toString());
        setCategories(buildVendorCategoryOptions(categoriesData.data || [], allowedIds));
      }

      if (targetProductId) {
        const productResponse = await fetch(`${API_URL}/vendor/products/${targetProductId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const productData = await productResponse.json();
        if (!productResponse.ok) throw new Error(productData.error || "Product not found");

        const normalized = normalizeProductForForm(productData.product, { clone: isClone });
        const variantList = Array.isArray(productData.product?.variants)
          ? productData.product.variants
          : [];
        const variantColors = [...new Set(variantList.map((item) => item.color).filter(Boolean))];
        const variantSizes = [...new Set(variantList.map((item) => item.size).filter(Boolean))];
        setFormData(normalized);
        setMediaItems(buildMediaItems(normalized.images, normalized.imageSettings));
        setColorsInput(variantColors.join(", "));
        setSizesInput(variantSizes.join(", "));
      }
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load product data");
    } finally {
      setFetching(false);
    }
  }, [isClone, targetProductId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!formData.categoryId || categories.length === 0) return;
    const category = categories.find((item) => item._id === formData.categoryId);
    if (!category) return;
    setSelectedCategory(category);
    setDynamicFields(getFieldsForCategory(category.slug));
  }, [categories, formData.categoryId]);

  const handleAttributeChange = (fieldName, value) => {
    setFormData((current) => ({
      ...current,
      attributes: {
        ...current.attributes,
        [fieldName]: value,
      },
    }));
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length + mediaItems.length > 12) {
      setError("Maximum 12 images are allowed in the media manager.");
      return;
    }

    const nextItems = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
      focus: "center",
    }));

    setMediaItems((current) => [...current, ...nextItems]);
    event.target.value = "";
  };

  const moveMediaItem = (index, direction) => {
    setMediaItems((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return current;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const setCoverImage = (index) => {
    setMediaItems((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      return [item, ...next];
    });
  };

  const updateMediaFocus = (index, focus) => {
    setMediaItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, focus } : item)),
    );
  };

  const removeMediaItem = (index) => {
    setMediaItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const generateVariantMatrix = () => {
    const colors = splitInput(colorsInput);
    const sizes = splitInput(sizesInput);

    if (colors.length === 0 || sizes.length === 0) {
      setError("Add at least one color and one size before generating variants.");
      return;
    }

    const existing = new Map(
      formData.variants.map((variant) => [`${variant.color}__${variant.size}`, variant]),
    );
    const variants = colors.flatMap((color) =>
      sizes.map((size, index) => {
        const key = `${color}__${size}`;
        const previous = existing.get(key);
        return (
          previous || {
            color,
            size,
            sku: makeSku(formData.title, color, size, index),
            price: formData.price || "",
            stock: formData.stock || "",
            image: "",
            status: "active",
          }
        );
      }),
    );

    updateForm({ variants });
    setError("");
  };

  const updateVariant = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      variants: current.variants.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, [field]: value } : variant,
      ),
    }));
  };

  const removeVariant = (index) => {
    setFormData((current) => ({
      ...current,
      variants: current.variants.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addEmptyVariant = () => {
    setFormData((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          color: "",
          size: "",
          sku: makeSku(current.title, "Color", "Size", current.variants.length),
          price: current.price || "",
          stock: current.stock || "",
          image: "",
          status: "active",
        },
      ],
    }));
  };

  const syncVariantBaseValues = () => {
    setFormData((current) => ({
      ...current,
      variants: current.variants.map((variant) => ({
        ...variant,
        price: current.price,
        stock: current.stock,
      })),
    }));
  };

  const renderDynamicField = (field) => {
    const value = formData.attributes[field.name] || "";
    const baseClass =
      "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

    if (field.type === "textarea") {
      return (
        <textarea
          required={field.required}
          value={value}
          onChange={(event) => handleAttributeChange(field.name, event.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={baseClass}
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          required={field.required}
          value={value}
          onChange={(event) => handleAttributeChange(field.name, event.target.value)}
          className={baseClass}
        >
          <option value="">Select {field.label}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "multiselect") {
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {field.options.map((option) => {
            const currentValues = Array.isArray(value) ? value : [];
            return (
              <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={currentValues.includes(option)}
                  onChange={(event) => {
                    const nextValue = event.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((item) => item !== option);
                    handleAttributeChange(field.name, nextValue);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                {option}
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <input
        type={field.type === "date" ? "date" : "text"}
        required={field.required}
        value={value}
        onChange={(event) => handleAttributeChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        className={baseClass}
      />
    );
  };

  const prepareImagesForSubmit = async (token) => {
    const fileItems = mediaItems.filter((item) => item.file);
    let uploadedUrls = [];

    if (fileItems.length > 0) {
      setUploadingImages(true);
      uploadedUrls = await uploadVendorProductImages(
        fileItems.map((item) => item.file),
        token,
      );
      setUploadingImages(false);
    }

    let uploadIndex = 0;
    const mediaUrlMap = new Map();
    const orderedImages = mediaItems
      .map((item) => {
        const finalUrl = item.file ? uploadedUrls[uploadIndex++] : item.url;
        if (finalUrl) mediaUrlMap.set(item.url, finalUrl);
        return finalUrl;
      })
      .filter(Boolean);

    const crops = {};
    mediaItems.forEach((item, index) => {
      const finalUrl = orderedImages[index];
      if (finalUrl) crops[finalUrl] = { objectPosition: item.focus || "center" };
    });

    return {
      orderedImages,
      mediaUrlMap,
      imageSettings: {
        coverImage: orderedImages[0] || "",
        crops,
      },
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.categoryId) throw new Error("Please choose a product category.");
      if (!formData.title.trim()) throw new Error("Product title is required.");
      if (!formData.price || Number(formData.price) <= 0) {
        throw new Error("Product price must be greater than 0.");
      }

      const token = await user.getIdToken();
      const { orderedImages, mediaUrlMap, imageSettings } = await prepareImagesForSubmit(token);
      const keywords = splitInput(formData.searchKeywordInput);
      const variants = formData.variants.map((variant) => ({
        ...variant,
        price: Number(variant.price || 0),
        stock: Number(variant.stock || 0),
        image: mediaUrlMap.get(variant.image) || variant.image || "",
      }));

      const payload = {
        categoryId: formData.categoryId,
        title: formData.title.trim(),
        description: formData.description,
        price: Number(formData.price),
        stock: variants.length > 0 ? totalVariantStock : Number(formData.stock || 0),
        sku: formData.sku,
        images: orderedImages,
        imageSettings,
        attributes: formData.attributes,
        variants,
        status: formData.status,
        seo: {
          metaTitle: formData.seo.metaTitle,
          metaDescription: formData.seo.metaDescription,
          searchKeywords: keywords,
        },
        lowStockThreshold: Number(formData.lowStockThreshold || 0),
        allowBackorder: formData.allowBackorder,
        restockDate: formData.allowBackorder ? formData.restockDate || null : null,
        preorderEnabled: formData.preorderEnabled,
        expectedShipDate: formData.preorderEnabled ? formData.expectedShipDate || null : null,
      };

      const response = await fetch(`${API_URL}/vendor/products${isEdit ? `/${productId}` : ""}`, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save product");

      navigate("/vendor/products");
    } catch (submitError) {
      setError(submitError.message || "Failed to save product");
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  if (fetching || !vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-sm text-gray-600">Loading product workspace...</p>
        </div>
      </div>
    );
  }

  const pageTitle = isEdit ? "Edit Product" : isClone ? "Clone Product" : "Add Product";
  const submitLabel = loading
    ? "Saving..."
    : uploadingImages
      ? "Uploading images..."
      : isEdit
        ? "Update Product"
        : formData.status === "draft"
          ? "Save Draft"
          : "Submit Product";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/vendor/products"
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
              title="Back to products"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
              <p className="text-sm text-gray-500">{vendor.shopName}</p>
            </div>
          </div>
          <button
            form="vendor-product-form"
            type="submit"
            disabled={loading || uploadingImages}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {submitLabel}
          </button>
        </div>
      </div>

      <form
        id="vendor-product-form"
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8"
      >
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <Panel title="Listing Basics">
            <div className="space-y-5">
              <VendorCategoryPicker
                categories={categories}
                value={formData.categoryId}
                onChange={(categoryId) => updateForm({ categoryId })}
                selectedCategory={selectedCategory}
                vendorName={vendor?.shopName}
              />

              {selectedCategory && selectedCommissionRate > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  Commission for this category: <strong>{selectedCommissionRate}%</strong>
                </div>
              )}

              <div>
                <FieldLabel required>Product Title</FieldLabel>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(event) => updateForm({ title: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={formData.description}
                  onChange={(event) => updateForm({ description: event.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <FieldLabel required>Base Price</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(event) => updateForm({ price: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <FieldLabel required>Base Stock</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(event) => updateForm({ stock: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <FieldLabel>Product SKU</FieldLabel>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(event) => updateForm({ sku: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Media Manager">
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition hover:border-orange-300 hover:bg-orange-50">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                <span>
                  <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <span className="block text-sm font-semibold text-gray-800">Add product images</span>
                  <span className="text-xs text-gray-500">JPG, PNG, WEBP. Reuse them in the variant matrix.</span>
                </span>
              </label>

              {mediaItems.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {mediaItems.map((item, index) => (
                    <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
                        <img
                          src={item.url}
                          alt={`Product media ${index + 1}`}
                          style={{ objectPosition: item.focus }}
                          className="h-full w-full object-cover"
                        />
                        {index === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-orange-500 px-2 py-1 text-xs font-semibold text-white">
                            Cover
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        <button type="button" onClick={() => moveMediaItem(index, -1)} className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" title="Move earlier">
                          <ArrowUp className="mx-auto h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => moveMediaItem(index, 1)} className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" title="Move later">
                          <ArrowDown className="mx-auto h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setCoverImage(index)} className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" title="Set cover">
                          <Check className="mx-auto h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => removeMediaItem(index)} className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50" title="Remove">
                          <Trash2 className="mx-auto h-4 w-4" />
                        </button>
                      </div>
                      <select
                        value={item.focus}
                        onChange={(event) => updateMediaFocus(index, event.target.value)}
                        className="mt-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="center">Crop center</option>
                        <option value="top">Crop top</option>
                        <option value="bottom">Crop bottom</option>
                        <option value="left">Crop left</option>
                        <option value="right">Crop right</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Variant Matrix">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <FieldLabel>Colors</FieldLabel>
                  <input
                    type="text"
                    value={colorsInput}
                    onChange={(event) => setColorsInput(event.target.value)}
                    placeholder="Black, White, Red"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <FieldLabel>Sizes</FieldLabel>
                  <input
                    type="text"
                    value={sizesInput}
                    onChange={(event) => setSizesInput(event.target.value)}
                    placeholder="S, M, L, XL"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={generateVariantMatrix}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    <Layers3 className="h-4 w-4" />
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={addEmptyVariant}
                    className="inline-flex h-10 items-center rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    title="Add row"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {formData.variants.length > 0 && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
                    <p className="text-sm font-medium text-gray-700">
                      {formData.variants.length} variants, {totalVariantStock} total stock
                    </p>
                    <button
                      type="button"
                      onClick={syncVariantBaseValues}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Sync base price and stock
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-[920px] w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Color", "Size", "SKU", "Price", "Stock", "Status", "Image", ""].map((heading) => (
                            <th key={heading} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {formData.variants.map((variant, index) => (
                          <tr key={`${variant.color}-${variant.size}-${index}`}>
                            <td className="px-3 py-2">
                              <input value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} className="w-44 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                            </td>
                            <td className="px-3 py-2">
                              <select value={variant.status} onChange={(event) => updateVariant(index, "status", event.target.value)} className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select value={variant.image} onChange={(event) => updateVariant(index, "image", event.target.value)} className="w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                                <option value="">Use cover</option>
                                {mediaItems.map((item, itemIndex) => (
                                  <option key={item.id} value={item.url}>
                                    Image {itemIndex + 1}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => removeVariant(index)} className="rounded-md p-2 text-red-600 hover:bg-red-50" title="Remove variant">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </Panel>

          {dynamicFields.length > 0 && (
            <Panel title="Category Attributes">
              <div className="grid gap-4 md:grid-cols-2">
                {dynamicFields.map((field) => (
                  <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                    <FieldLabel required={field.required}>{field.label}</FieldLabel>
                    {renderDynamicField(field)}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-6">
          <Panel title="Publishing">
            <div className="space-y-4">
              <div>
                <FieldLabel>Listing Status</FieldLabel>
                <select
                  value={formData.status}
                  onChange={(event) => updateForm({ status: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                >
                  <option value="active">Submit for moderation</option>
                  <option value="draft">Save as draft</option>
                  {isEdit && <option value="inactive">Delist from shop</option>}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading || uploadingImages}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {submitLabel}
              </button>
            </div>
          </Panel>

          <Panel title="Inventory Rules">
            <div className="space-y-4">
              <div>
                <FieldLabel>Low Stock Threshold</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(event) => updateForm({ lowStockThreshold: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-3">
                <input
                  type="checkbox"
                  checked={formData.allowBackorder}
                  onChange={(event) => updateForm({ allowBackorder: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">Accept backorders</span>
                </span>
              </label>

              {formData.allowBackorder && (
                <div>
                  <FieldLabel>Estimated Restock Date</FieldLabel>
                  <input
                    type="date"
                    value={formData.restockDate}
                    onChange={(event) => updateForm({ restockDate: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              )}

              <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-3">
                <input
                  type="checkbox"
                  checked={formData.preorderEnabled}
                  onChange={(event) => updateForm({ preorderEnabled: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">Enable pre-order</span>
                </span>
              </label>

              {formData.preorderEnabled && (
                <div>
                  <FieldLabel>Expected Ship Date</FieldLabel>
                  <input
                    type="date"
                    value={formData.expectedShipDate}
                    onChange={(event) => updateForm({ expectedShipDate: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              )}
            </div>
          </Panel>

          <Panel title="SEO">
            <div className="space-y-4">
              <div>
                <FieldLabel>Meta Title</FieldLabel>
                <input
                  type="text"
                  value={formData.seo.metaTitle}
                  onChange={(event) => updateSeo({ metaTitle: event.target.value })}
                  maxLength={70}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <p className="mt-1 text-xs text-gray-400">{formData.seo.metaTitle.length}/70</p>
              </div>
              <div>
                <FieldLabel>Meta Description</FieldLabel>
                <textarea
                  value={formData.seo.metaDescription}
                  onChange={(event) => updateSeo({ metaDescription: event.target.value })}
                  maxLength={160}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <p className="mt-1 text-xs text-gray-400">{formData.seo.metaDescription.length}/160</p>
              </div>
              <div>
                <FieldLabel>Search Keywords</FieldLabel>
                <input
                  type="text"
                  value={formData.searchKeywordInput}
                  onChange={(event) => updateForm({ searchKeywordInput: event.target.value })}
                  placeholder="cotton shirt, eid dress, local brand"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
          </Panel>
        </aside>
      </form>
    </div>
  );
}
