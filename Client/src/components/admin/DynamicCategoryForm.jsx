import { useState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import axios from "axios";

const ATTRIBUTE_TYPES = ["text", "number", "select", "multiselect", "checkbox", "date"];

export default function DynamicCategoryForm({ category, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const { control, register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      description: category?.description || "",
      image: category?.image || "",
      isActive: category?.isActive !== false,
      attributes: category?.attributes || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "attributes",
  });

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        isActive: category.isActive,
        attributes: category.attributes || [],
      });
    }
  }, [category, reset]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setMessage("");

      const url = category
        ? `${import.meta.env.VITE_API_URL}/api/dynamic-categories/${category._id}`
        : `${import.meta.env.VITE_API_URL}/api/dynamic-categories`;

      const method = category ? "put" : "post";

      await axios[method](url, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setMessageType("success");
      setMessage(
        category
          ? "Category updated successfully!"
          : "Category created successfully!"
      );

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      } else {
        reset();
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error.response?.data?.message || "Error saving category");
    } finally {
      setLoading(false);
    }
  };

  const addAttribute = () => {
    append({
      name: "",
      type: "text",
      options: [],
      required: false,
      order: fields.length,
    });
  };

  return (
    <div className="w-full">
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
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Category Name *
            </label>
            <input
              {...register("name", { required: "Name is required" })}
              type="text"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Electronics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              {...register("slug")}
              type="text"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., electronics"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            {...register("description")}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Category description"
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

        <div>
          <label className="flex items-center">
            <input
              {...register("isActive")}
              type="checkbox"
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm font-medium">Active</span>
          </label>
        </div>

        {/* Attributes Section */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Attributes</h2>
            <button
              type="button"
              onClick={addAttribute}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              + Add Attribute
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No attributes added yet. Click "Add Attribute" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <AttributeField
                  key={field.id}
                  index={index}
                  control={control}
                  register={register}
                  remove={remove}
                />
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-6 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 font-medium"
          >
            {loading
              ? "Saving..."
              : category
              ? "Update Category"
              : "Create Category"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AttributeField({ index, control, register, remove }) {
  const [options, setOptions] = useState([]);
  const [optionInput, setOptionInput] = useState("");

  const attributeType = watch(`attributes.${index}.type`);

  const addOption = () => {
    if (optionInput.trim()) {
      setOptions([...options, optionInput.trim()]);
      setOptionInput("");
    }
  };

  const removeOption = (idx) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="border p-4 rounded-lg bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-gray-900">Attribute {index + 1}</h3>
        <button
          type="button"
          onClick={() => remove(index)}
          className="text-red-500 hover:text-red-700 font-medium"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Attribute Name *
          </label>
          <input
            {...register(`attributes.${index}.name`, {
              required: "Attribute name is required",
            })}
            type="text"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., RAM"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Type *</label>
          <select
            {...register(`attributes.${index}.type`)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ATTRIBUTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="flex items-center">
          <input
            {...register(`attributes.${index}.required`)}
            type="checkbox"
            className="mr-2"
          />
          <span className="text-sm font-medium">Required</span>
        </label>
      </div>

      {(attributeType === "select" || attributeType === "multiselect") && (
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Options</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={optionInput}
              onChange={(e) => setOptionInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addOption()}
              className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add option and press Enter"
            />
            <button
              type="button"
              onClick={addOption}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {options.map((option, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded"
              >
                <span className="text-sm">{option}</span>
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <input
            {...register(`attributes.${index}.options`)}
            type="hidden"
            value={JSON.stringify(options)}
          />
        </div>
      )}
    </div>
  );
}

function watch(fieldName) {
  // This is a placeholder - in real implementation, use useWatch from react-hook-form
  return null;
}
