import { Edit2, Trash2, Eye, Settings } from "lucide-react";

export default function CategoryCard({
  category,
  onEdit,
  onDelete,
  onViewDetails,
}) {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-300">
      {/* Image Container */}
      {category.image && (
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden group">
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
              {category.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {category.slug}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2 ${
              category.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {category.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Description */}
        {category.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        )}

        {/* Attributes Section */}
        <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <p className="text-xs font-bold text-blue-900 mb-3 uppercase tracking-wide">
            {category.attributes && category.attributes.length > 0
              ? `${category.attributes.length} Attributes`
              : "No Attributes"}
          </p>

          {category.attributes && category.attributes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {category.attributes.slice(0, 3).map((attr, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-900 text-xs rounded-full font-semibold hover:bg-blue-50 transition-colors"
                >
                  <span>{attr.name}</span>
                  <span className="text-xs opacity-60">({attr.type})</span>
                </div>
              ))}
              {category.attributes.length > 3 && (
                <div className="inline-flex items-center px-3 py-1.5 bg-white border border-blue-300 text-blue-900 text-xs rounded-full font-semibold">
                  +{category.attributes.length - 3} more
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-blue-600 italic">No attributes defined</p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onViewDetails(category)}
            className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors text-sm flex items-center justify-center gap-1.5"
            title="View details"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">View</span>
          </button>
          <button
            onClick={() => onEdit(category)}
            className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors text-sm flex items-center justify-center gap-1.5"
            title="Edit category"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={() => window.location.href = `/admin/categories/${category._id}/attributes`}
            className="px-3 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors text-sm flex items-center justify-center gap-1.5"
            title="Manage attributes"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Attrs</span>
          </button>
          <button
            onClick={() => onDelete(category._id)}
            className="px-3 py-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-semibold transition-colors text-sm flex items-center justify-center gap-1.5"
            title="Delete category"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
