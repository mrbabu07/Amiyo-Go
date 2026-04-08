import { useState } from "react";
import CategoryCard from "./CategoryCard";
import CategoryDetailModal from "./CategoryDetailModal";

export default function CategoryList({ categories, onEdit, onDelete }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleViewDetails = (category) => {
    setSelectedCategory(category);
    setShowDetails(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <CategoryCard
            key={category._id}
            category={category}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {showDetails && selectedCategory && (
        <CategoryDetailModal
          category={selectedCategory}
          onClose={() => setShowDetails(false)}
          onEdit={() => {
            setShowDetails(false);
            onEdit(selectedCategory);
          }}
        />
      )}
    </>
  );
}
