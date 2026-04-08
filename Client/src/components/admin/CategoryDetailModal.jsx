export default function CategoryDetailModal({ category, onClose, onEdit }) {
  const getAttributeTypeLabel = (type) => {
    const labels = {
      text: "Text",
      number: "Number",
      select: "Dropdown",
      multiselect: "Multi-Select",
      checkbox: "Checkbox",
      date: "Date",
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{category.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>
                <p className="text-gray-900">{category.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Slug
                </label>
                <p className="text-gray-900 font-mono">{category.slug}</p>
              </div>
              {category.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Description
                  </label>
                  <p className="text-gray-900">{category.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Status
                </label>
                <p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      category.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Attributes ({category.attributes?.length || 0})
            </h3>

            {category.attributes && category.attributes.length > 0 ? (
              <div className="space-y-3">
                {category.attributes.map((attr, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {attr.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Type: {getAttributeTypeLabel(attr.type)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {attr.required && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-medium">
                            Required
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">
                          Order: {attr.order}
                        </span>
                      </div>
                    </div>

                    {/* Options */}
                    {attr.options && attr.options.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-600 mb-2">
                          Options:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {attr.options.map((option, optIdx) => (
                            <span
                              key={optIdx}
                              className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No attributes defined yet
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Metadata</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-600">Created</label>
                <p className="text-gray-900">
                  {new Date(category.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-gray-600">Updated</label>
                <p className="text-gray-900">
                  {new Date(category.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Edit Category
          </button>
        </div>
      </div>
    </div>
  );
}
