export default function CategoryCard({
  category,
  onEdit,
  onDelete,
  onViewDetails,
}) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* Image */}
      {category.image && (
        <div className="h-40 bg-gray-200 overflow-hidden">
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Name and Status */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              category.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {category.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Slug */}
        <p className="text-sm text-gray-500 mb-3">
          <span className="font-medium">Slug:</span> {category.slug}
        </p>

        {/* Description */}
        {category.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {category.description}
          </p>
        )}

        {/* Attributes Count */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            {category.attributes?.length || 0} Attributes
          </p>
          {category.attributes && category.attributes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {category.attributes.slice(0, 3).map((attr, idx) => (
                <span
                  key={idx}
                  className="inline-block px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded"
                >
                  {attr.name}
                </span>
              ))}
              {category.attributes.length > 3 && (
                <span className="inline-block px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                  +{category.attributes.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(category)}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            View Details
          </button>
          <button
            onClick={() => onEdit(category)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(category._id)}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
