import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

const MotionDiv = motion.div;

const uniqueValues = (items) => [...new Set(items.filter(Boolean))];

export default function ProductVariantSelector({
  product,
  onVariantChange,
  selectedVariant: initialVariant,
}) {
  const variants = useMemo(() => product.variants || [], [product.variants]);
  const firstVariant = initialVariant || variants[0] || null;
  const [selectedSize, setSelectedSize] = useState(firstVariant?.size || null);
  const [selectedColor, setSelectedColor] = useState(firstVariant?.color || null);
  const onVariantChangeRef = useRef(onVariantChange);
  const variantMatrix = product.detail?.variantMatrix;
  const matrixSizes = variantMatrix?.sizes;
  const matrixColors = variantMatrix?.colors;

  useEffect(() => {
    onVariantChangeRef.current = onVariantChange;
  }, [onVariantChange]);

  const allSizes = useMemo(
    () =>
      matrixSizes?.length
        ? matrixSizes
        : uniqueValues(variants.map((variant) => variant.size)),
    [matrixSizes, variants],
  );
  const allColors = useMemo(
    () =>
      matrixColors?.length
        ? matrixColors.map((color) => color.name)
        : uniqueValues(variants.map((variant) => variant.color)),
    [matrixColors, variants],
  );
  const colorOptions = useMemo(
    () =>
      matrixColors?.length
        ? matrixColors
        : allColors.map((color) => ({ name: color, value: getColorHex(color) })),
    [allColors, matrixColors],
  );

  const currentVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return (
      variants.find((variant) => {
        const sizeMatch = !selectedSize || variant.size === selectedSize;
        const colorMatch = !selectedColor || variant.color === selectedColor;
        return sizeMatch && colorMatch;
      }) || null
    );
  }, [selectedColor, selectedSize, variants]);

  useEffect(() => {
    if (currentVariant) {
      onVariantChangeRef.current?.(currentVariant);
    }
  }, [currentVariant]);

  const handleSizeSelect = (size) => {
    setSelectedSize(size);

    const colorsForSize = uniqueValues(
      variants
        .filter((variant) => variant.size === size)
        .map((variant) => variant.color),
    );

    if (colorsForSize.length > 0 && !colorsForSize.includes(selectedColor)) {
      setSelectedColor(colorsForSize[0]);
    }
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);

    const sizesForColor = uniqueValues(
      variants
        .filter((variant) => variant.color === color)
        .map((variant) => variant.size),
    );

    if (sizesForColor.length > 0 && !sizesForColor.includes(selectedSize)) {
      setSelectedSize(sizesForColor[0]);
    }
  };

  const isVariantAvailable = (size, color) => {
    const variant = variants.find((item) => {
      const sizeMatch = !size || item.size === size;
      const colorMatch = !color || item.color === color;
      return sizeMatch && colorMatch;
    });
    return variant && (variant.stock > 0 || product.allowBackorder);
  };

  const hasAvailableOption = (size, color) =>
    variants.some((item) => {
      const sizeMatch = !size || item.size === size;
      const colorMatch = !color || item.color === color;
      return sizeMatch && colorMatch && (item.stock > 0 || product.allowBackorder);
    });

  const variantPrice = Number(currentVariant?.price || product.price || 0);
  const productPrice = Number(product.price || 0);
  const variantStock = Number(currentVariant?.stock || product.stock || 0);

  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {allSizes.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Size
            </label>
            {selectedSize && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Selected: <span className="font-medium">{selectedSize}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allSizes.map((size) => {
              const available = hasAvailableOption(size, selectedColor) || hasAvailableOption(size, null);
              const comboUnavailable = selectedColor && !isVariantAvailable(size, selectedColor);
              const isSelected = selectedSize === size;

              return (
                <button
                  key={size}
                  onClick={() => available && handleSizeSelect(size)}
                  disabled={!available}
                  className={`relative rounded-lg border-2 px-6 py-3 font-medium transition-all ${
                    isSelected
                      ? "scale-105 border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                      : available
                        ? "border-gray-300 text-gray-700 hover:scale-105 hover:border-primary-300 dark:border-gray-600 dark:text-gray-300 dark:hover:border-primary-700"
                        : "cursor-not-allowed border-gray-200 text-gray-400 opacity-50 dark:border-gray-700 dark:text-gray-600"
                  }`}
                >
                  {size}
                  {comboUnavailable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-0.5 w-full rotate-45 bg-gray-400 dark:bg-gray-600" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {allColors.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Color
            </label>
            {selectedColor && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Selected: <span className="font-medium">{selectedColor}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {allColors.map((color) => {
              const available = hasAvailableOption(selectedSize, color) || hasAvailableOption(null, color);
              const comboUnavailable = selectedSize && !isVariantAvailable(selectedSize, color);
              const isSelected = selectedColor === color;
              const colorHex = colorOptions.find((item) => item.name === color)?.value || getColorHex(color);

              return (
                <button
                  key={color}
                  onClick={() => available && handleColorSelect(color)}
                  disabled={!available}
                  className={`group relative ${!available ? "cursor-not-allowed opacity-50" : ""}`}
                  title={color}
                >
                  <div
                    className={`h-12 w-12 rounded-full border-4 transition-all ${
                      isSelected
                        ? "scale-110 border-primary-500 shadow-lg"
                        : available
                          ? "border-gray-300 hover:scale-105 hover:border-primary-300 dark:border-gray-600 dark:hover:border-primary-700"
                          : "border-gray-200 dark:border-gray-700"
                    }`}
                    style={{ backgroundColor: colorHex }}
                  >
                    {isSelected && (
                      <svg
                        className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {comboUnavailable && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-0.5 w-full rotate-45 bg-gray-400 dark:bg-gray-600" />
                      </div>
                    )}
                  </div>
                  <span className="mt-1 block text-center text-xs text-gray-600 dark:text-gray-400">
                    {color}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {currentVariant && (
        <MotionDiv
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                Selected Variant
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                BDT {variantPrice.toFixed(2)}
              </p>
              {variantPrice !== productPrice && (
                <p className="text-sm text-gray-500 line-through dark:text-gray-400">
                  BDT {productPrice.toFixed(2)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                Stock
              </p>
              <p
                className={`text-lg font-semibold ${
                  variantStock > 10
                    ? "text-green-600 dark:text-green-400"
                    : variantStock > 0
                      ? "text-yellow-600 dark:text-yellow-400"
                      : product.allowBackorder
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-red-600 dark:text-red-400"
                }`}
              >
                {variantStock > 0
                  ? `${variantStock} available`
                  : product.allowBackorder
                    ? "Backorder"
                    : "Out of stock"}
              </p>
            </div>
          </div>

          {currentVariant.sku && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              SKU: {currentVariant.sku}
            </p>
          )}
        </MotionDiv>
      )}

      {(currentVariant?.image || currentVariant?.images?.[0]) &&
        (currentVariant.image || currentVariant.images?.[0]) !== product.image && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <img
            src={currentVariant.image || currentVariant.images?.[0]}
            alt={`${selectedSize || ""} ${selectedColor || ""}`.trim()}
            className="h-48 w-full object-cover"
          />
        </MotionDiv>
      )}
    </div>
  );
}

function getColorHex(colorName) {
  const colorMap = {
    Black: "#000000",
    White: "#FFFFFF",
    Red: "#EF4444",
    Blue: "#3B82F6",
    Green: "#10B981",
    Yellow: "#F59E0B",
    Purple: "#8B5CF6",
    Pink: "#EC4899",
    Orange: "#F97316",
    Gray: "#6B7280",
    Brown: "#92400E",
    Navy: "#1E3A8A",
    Beige: "#D4C5B9",
    Maroon: "#7F1D1D",
  };

  return colorMap[colorName] || "#9CA3AF";
}
