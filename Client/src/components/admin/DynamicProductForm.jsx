import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import axios from "axios";

export default function DynamicProductForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryAttributes, setCategoryAttributes] = useState([]);

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      name: "",
      description: "",
      price: "",
      discountPrice: "",
      image: "",
      images: [],
      category: "",
      stock: "",
      sku: "",
      dynamicAttributes: {},
    },
  });

  const categoryId = watch("category");

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch category attributes when category changes
  useEffect(() => {
    if (categoryId) {
      fetchCategoryAttributes(categoryId);
    }
  }, [categoryId]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dynamic-categories`
      );
      setCategories(response.data.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCategoryAttributes = async (catId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dynamic-categories/${catId}`
      );
      setCategoryAttributes(response.data.data.attributes || []);
      setSelectedCategory(response.data.data);
    } catch (error) {
      console.error("Error fetching category attributes:", error);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setMessage("");

      // Collect dynamic attributes from form
      const dynamicAttributes = {};
      categoryAttributes.forEach((attr) => {
        const fieldName = `attr_${attr._id}`;
        if (data[fieldName] !== undefined) {
          dynamicAttributes[attr.name] = data[fieldName];
        }
      });

      const payload = {
        ...data,
        dynamicAttributes,
      };

      // Remove individual attribute fields from payload
      categoryAttributes.forEach((attr) => {
        delete payload[`attr_${attr._id}`];
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dynamic-products`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setMessageType("success");
      setMessage("Product created successfully!");
      reset();
      setCategoryAttributes([]);
    } catch (error) {
      setMessageType("error");
      setMessage(error.response?.data?.message || "Error creating product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Create Dynamic Product</h1>

      {message && (
        <div
          className={`mb-4 p-4 rounded ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Product Info */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product Name *</label>
              <input
                {...register("name", { required: "Name is required" })}
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., iPhone 15 Pro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                {...register("category", { required: "Category is required" })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              {...register("description")}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Product description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price *</label>
              <input
                {...register("price", { required: "Price is required" })}
                type="number"
                step="0.01"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Discount Price</label>
              <input
                {...register("discountPrice")}
                type="number"
                step="0.01"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stock</label>
              <input
                {...register("stock")}
                type="number"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">SKU</label>
              <input
                {...register("sku")}
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., IPHONE-15-PRO-256"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <input
                {...register("image")}
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Attributes */}
        {categoryAttributes.length > 0 && (
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedCategory?.name} Specifications
            </h2>

            <div className="space-y-4">
              {categoryAttributes.map((attr) => (
                <DynamicAttributeField
                  key={attr._id}
                  attribute={attr}
                  register={register}
                  fieldName={`attr_${attr._id}`}
                />
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? "Creating..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}

function DynamicAttributeField({ attribute, register, fieldName }) {
  const renderInput = () => {
    const baseProps = {
      ...register(fieldName, {
        required: attribute.required ? `${attribute.name} is required` : false,
      }),
      className:
        "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
    };

    switch (attribute.type) {
      case "text":
        return <input {...baseProps} type="text" placeholder={attribute.name} />;

      case "number":
        return (
          <input
            {...baseProps}
            type="number"
            step="0.01"
            placeholder={attribute.name}
          />
        );

      case "date":
        return <input {...baseProps} type="date" />;

      case "select":
        return (
          <select {...baseProps}>
            <option value="">Select {attribute.name}</option>
            {attribute.options.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "multiselect":
        return (
          <select {...baseProps} multiple>
            {attribute.options.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "checkbox":
        return (
          <label className="flex items-center">
            <input {...baseProps} type="checkbox" className="mr-2" />
            <span>{attribute.name}</span>
          </label>
        );

      default:
        return <input {...baseProps} type="text" />;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {attribute.name}
        {attribute.required && <span className="text-red-500">*</span>}
      </label>
      {renderInput()}
    </div>
  );
}
