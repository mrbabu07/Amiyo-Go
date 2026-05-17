import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, ShoppingCart } from "lucide-react";
import useCart from "../hooks/useCart";
import { useCurrency } from "../hooks/useCurrency";

const productImage = (product) =>
  product?.image || product?.selectedImage || product?.images?.[0] || "";

export default function FrequentlyBoughtTogether({
  product,
  selectedVariant,
  selectedImage,
  selectedSize,
  selectedColor,
}) {
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const items = product?.detail?.frequentlyBoughtTogether || [];
  const [selectedIds, setSelectedIds] = useState(() => new Set(items.map((item) => String(item._id))));

  useEffect(() => {
    setSelectedIds(new Set(items.map((item) => String(item._id))));
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(String(item._id))),
    [items, selectedIds],
  );

  if (!items.length) return null;

  const primaryProduct = selectedVariant
    ? {
        ...product,
        price: selectedVariant.price || product.price,
        selectedVariantId: selectedVariant._id || selectedVariant.id || selectedVariant.sku,
        sku: selectedVariant.sku || product.sku,
      }
    : product;

  const total = [primaryProduct, ...selectedItems].reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );

  const toggleItem = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addBundle = () => {
    addToCart(primaryProduct, 1, selectedImage || productImage(product), selectedSize, selectedColor);
    selectedItems.forEach((item) => addToCart(item, 1, productImage(item)));
  };

  return (
    <section className="mt-10 border-t border-gray-200 pt-8 dark:border-gray-700">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Frequently Bought Together
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add useful companions in one click.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Bundle total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatPrice(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={addBundle}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <ShoppingCart className="h-4 w-4" />
            Add Bundle
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        <BundleItem product={primaryProduct} checked locked formatPrice={formatPrice} />
        {items.map((item) => (
          <BundleItem
            key={item._id}
            product={item}
            checked={selectedIds.has(String(item._id))}
            onToggle={() => toggleItem(item._id)}
            formatPrice={formatPrice}
          />
        ))}
      </div>
    </section>
  );
}

function BundleItem({ product, checked, locked = false, onToggle, formatPrice }) {
  return (
    <div className="relative w-44 flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      {!locked && (
        <button
          type="button"
          aria-label={checked ? "Remove from bundle" : "Add to bundle"}
          onClick={onToggle}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition ${
            checked
              ? "border-primary-600 bg-primary-600 text-white"
              : "border-gray-300 bg-white text-gray-500 hover:border-primary-400"
          }`}
        >
          {checked ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      )}
      {locked && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-gray-900 px-2 py-1 text-xs font-semibold text-white">
          This item
        </span>
      )}
      <Link to={`/products/${product._id}`} className="block">
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          {productImage(product) ? (
            <img src={productImage(product)} alt={product.title} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-900 dark:text-white">
          {product.title}
        </p>
        <p className="mt-1 text-sm font-bold text-primary-600 dark:text-primary-400">
          {formatPrice(product.price)}
        </p>
      </Link>
    </div>
  );
}
