import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductVariantSelector({
  product,
  onVariantChange,
  selectedVariant: initialVariant,
}) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [currentVariant, setCurrentVariant] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);

  // Initialize variants from product
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      // Get unique sizes and colors
      const sizes = [...new Set(product.variants.map((v) => v.size))].filter(
        Boolean,
      );
      const colors = [...new Set(product.variants.map((v) => v.color))].filter(
        Boolean,
      );

      setAvailableSizes(sizes);
      setAvailableColors(colors);

      // Set initial selection
      if (initialVariant) {
        setSelectedSize(initialVariant.size);
        setSelectedColor(initialVariant.color);
        setCurrentVariant(initialVariant);
      } else if (product.variants[0]) {
        const firstVariant = product.variants[0];
        setSelectedSize(firstVariant.size);
        setSelectedColor(firstVariant.color);
        setCurrentVariant(firstVariant);
      }
    }
  }, [product, initialVariant]);

  // Update variant when size or color changes
  useEffect(() => {
    if (selectedSize || selectedColor) {
      const variant = product.variants?.find((v) => {
        const sizeMatch = !selectedSize || v.size === selectedSize;
        const colorMatch = !selectedColor || v.color === selectedColor;
        return sizeMatch && colorMatch;
      });

      if (variant) {
        setCurrentVariant(variant);
        onVariantChange?.(variant);
      }
    }
  }, [selectedSize, selectedColor, product.variants]);

  const handleSizeSelect = (size) => {
    setSelectedSize(size);

    // Update available colors for this size
    const colorsForSize = product.variants
      ?.filter((v) => v.size === size)
      .map((v) => v.color)
      .filter(Boolean);

    if (colorsForSize && colorsForSize.length > 0) {
      setAvailableColors([...new Set(colorsForSize)]);

      // If current color not available, select first available
      if (!colorsForSize.includes(selectedColor)) {
        setSelectedColor(colorsForSize[0]);
      }
    }
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);

    // Update available sizes for this color
    const sizesForColor = product.variants
      ?.filter((v) => v.color === color)
      .map((v) => v.size)
      .filter(Boolean);

    if (sizesForColor && sizesForColor.length > 0) {
      setAvailableSizes([...new Set(sizesForColor)]);

      // If current size not available, select first available
      if (!sizesForColor.includes(selectedSize)) {
        setSelectedSize(sizesForColor[0]);
      }
    }
  };

  const isVariantAvailable = (size, color) => {
    const variant = product.variants?.find((v) => {
      const sizeMatch = !size || v.size === size;
      const colorMatch = !color || v.color === color;
      return sizeMatch && colorMatch;
    });
    return variant && variant.stock > 0;
  };

  const getVariantPrice = () => {
    if (currentVariant && currentVariant.price) {
      return currentVariant.price;
    }
    return product.price;
  };

  const getVariantStock = () => {
    if (currentVariant) {
      return currentVariant.stock || 0;
    }
    return product.stock || 0;
  };

  if (!product.variants || product.variants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Size Selector */}
      {availableSizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
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
            {availableSizes.map((size) => {
              const available = isVariantAvailable(size, selectedColor);
              const isSelected = selectedSize === size;

              return (
                <button
                  key={size}
                  onClick={() => available && handleSizeSelect(size)}
                  disabled={!available}
                  className={`relative px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                    isSelected
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 scale-105"
                      : available
                        ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-700 hover:scale-105"
                        : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
                  }`}
                >
                  {size}
                  {!available && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-gray-400 dark:bg-gray-600 rotate-45"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Selector */}
      {availableColors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
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
            {availableColors.map((color) => {
              const available = isVariantAvailable(selectedSize, color);
              const isSelected = selectedColor === color;
              const colorHex = getColorHex(color);

              return (
                <button
                  key={color}
                  onClick={() => available && handleColorSelect(color)}
                  disabled={!available}
                  className={`relative group ${!available ? "cursor-not-allowed opacity-50" : ""}`}
                  title={color}
                >
                  <div
                    className={`w-12 h-12 rounded-full border-4 transition-all ${
                      isSelected
                        ? "border-primary-500 scale-110 shadow-lg"
                        : available
                          ? "border-gray-300 dark:border-gray-600 hover:scale-105 hover:border-primary-300 dark:hover:border-primary-700"
                          : "border-gray-200 dark:border-gray-700"
                    }`}
                    style={{ backgroundColor: colorHex }}
                  >
                    {isSelected && (
                      <svg
                        className="w-6 h-6 text-white absolute inset-0 m-auto drop-shadow-lg"
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
                    {!available && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-gray-400 dark:bg-gray-600 rotate-45"></div>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 block text-center">
                    {color}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Variant Info */}
      {currentVariant && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Selected Variant
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ৳{getVariantPrice().toFixed(2)}
              </p>
              {currentVariant.price !== product.price && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  ৳{product.price.toFixed(2)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Stock
              </p>
              <p
                className={`text-lg font-semibold ${
                  getVariantStock() > 10
                    ? "text-green-600 dark:text-green-400"
                    : getVariantStock() > 0
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {getVariantStock() > 0
                  ? `${getVariantStock()} available`
                  : "Out of stock"}
              </p>
            </div>
          </div>

          {currentVariant.sku && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              SKU: {currentVariant.sku}
            </p>
          )}
        </motion.div>
      )}

      {/* Variant Image */}
      {currentVariant?.image && currentVariant.image !== product.image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <img
            src={currentVariant.image}
            alt={`${selectedSize} ${selectedColor}`}
            className="w-full h-48 object-cover"
          />
        </motion.div>
      )}
    </div>
  );
}

// Helper function to get color hex codes
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
