import { useState } from "react";

export default function DynamicProductCard({ product }) {
  const [showAttributes, setShowAttributes] = useState(false);

  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative overflow-hidden bg-gray-200 h-48">
        <img
          src={product.image || "https://via.placeholder.com/300x200"}
          alt={product.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform"
        />
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
            -{discount}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-gray-500 mb-1">
          {product.category?.name || "Uncategorized"}
        </p>

        {/* Name */}
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{product.name}</h3>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl font-bold text-gray-900">
            ${product.discountPrice || product.price}
          </span>
          {product.discountPrice && (
            <span className="text-sm text-gray-500 line-through">
              ${product.price}
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="mb-3">
          {product.stock > 0 ? (
            <span className="text-sm text-green-600 font-medium">In Stock</span>
          ) : (
            <span className="text-sm text-red-600 font-medium">Out of Stock</span>
          )}
        </div>

        {/* Dynamic Attributes Preview */}
        {product.dynamicAttributes && Object.keys(product.dynamicAttributes).length > 0 && (
          <div className="mb-3 pb-3 border-t">
            <button
              onClick={() => setShowAttributes(!showAttributes)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAttributes ? "Hide" : "Show"} Specifications
            </button>

            {showAttributes && (
              <div className="mt-2 space-y-1">
                {Object.entries(product.dynamicAttributes).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className="text-gray-600 ml-2">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex text-yellow-400">
              {"★".repeat(Math.round(product.rating))}
              {"☆".repeat(5 - Math.round(product.rating))}
            </div>
            <span className="text-xs text-gray-600">
              ({product.reviewCount} reviews)
            </span>
          </div>
        )}

        {/* Action Button */}
        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          View Details
        </button>
      </div>
    </div>
  );
}
