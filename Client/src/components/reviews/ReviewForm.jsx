import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import StarRating from "./StarRating";
import useAuth from "../../hooks/useAuth";
import { uploadImage } from "../../services/imageUpload";

const ReviewForm = ({ productId, onReviewSubmitted, onCancel }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    rating: 0,
    title: "",
    comment: "",
    images: [], // Array to store uploaded image URLs
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [canReview, setCanReview] = useState(null); // null = loading, true = can review, false = cannot review
  const [reviewEligibility, setReviewEligibility] = useState(null);

  // Check if user can review this product
  useEffect(() => {
    const checkReviewEligibility = async () => {
      if (!user || !productId) return;

      try {
        const response = await fetch(`/api/reviews/can-review/${productId}`, {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          setCanReview(data.data.canReview);
          setReviewEligibility(data.data);
        } else {
          setCanReview(false);
          setReviewEligibility({
            canReview: false,
            reason: "ERROR",
            message: "Failed to check review eligibility",
          });
        }
      } catch (error) {
        console.error("Error checking review eligibility:", error);
        setCanReview(false);
        setReviewEligibility({
          canReview: false,
          reason: "ERROR",
          message: "Failed to check review eligibility",
        });
      }
    };

    checkReviewEligibility();
  }, [user, productId]);

  const handleRatingChange = (rating) => {
    setFormData((prev) => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: null }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          images: "Only JPEG, PNG, and WebP images are allowed",
        }));
        continue;
      }

      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          images: "Images must be smaller than 5MB",
        }));
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Check total image limit (max 5 images)
    if (formData.images.length + validFiles.length > 5) {
      setErrors((prev) => ({
        ...prev,
        images: "Maximum 5 images allowed per review",
      }));
      return;
    }

    setUploadingImages(true);
    setErrors((prev) => ({ ...prev, images: null }));

    try {
      const uploadPromises = validFiles.map((file) => uploadImage(file));
      const uploadedUrls = await Promise.all(uploadPromises);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));

      setSelectedFiles((prev) => [...prev, ...validFiles]);
    } catch (error) {
      console.error("Error uploading images:", error);
      setErrors((prev) => ({
        ...prev,
        images: "Failed to upload images. Please try again.",
      }));
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.rating === 0) {
      newErrors.rating = "Please select a rating";
    }

    if (!formData.comment.trim()) {
      newErrors.comment = "Please write a review";
    } else if (formData.comment.trim().length < 10) {
      newErrors.comment = "Review must be at least 10 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({
          productId,
          rating: formData.rating,
          title: formData.title.trim(),
          comment: formData.comment.trim(),
          images: formData.images, // Include uploaded image URLs
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setFormData({ rating: 0, title: "", comment: "", images: [] });
        setSelectedFiles([]);
        setErrors({});

        // Notify parent component
        if (onReviewSubmitted) {
          onReviewSubmitted(data.data);
        }
      } else {
        // Handle specific error codes
        if (data.code === "PURCHASE_REQUIRED") {
          setErrors({
            submit: "You must purchase this product before you can review it.",
          });
        } else {
          setErrors({ submit: data.error || "Failed to submit review" });
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      setErrors({ submit: "Failed to submit review. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Please sign in to write a review
        </p>
        <button
          onClick={() => (window.location.href = "/login")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Show loading state while checking eligibility
  if (canReview === null) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Checking review eligibility...
          </span>
        </div>
      </div>
    );
  }

  // Show message if user cannot review
  if (!canReview) {
    const getMessageContent = () => {
      switch (reviewEligibility?.reason) {
        case "PURCHASE_REQUIRED":
          return {
            icon: "🛒",
            title: "Purchase Required",
            message:
              "You must purchase this product before you can write a review.",
            actionText: "Shop Now",
            actionLink: "#",
          };
        default:
          return {
            icon: "❌",
            title: "Cannot Review",
            message:
              reviewEligibility?.message ||
              "You cannot review this product at this time.",
            actionText: null,
            actionLink: null,
          };
      }
    };

    const content = getMessageContent();

    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div className="text-4xl mb-4">{content.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {content.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {content.message}
        </p>
        {content.actionText && (
          <button
            onClick={() => {
              if (content.actionLink === "#reviews") {
                document
                  .getElementById("reviews")
                  ?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            {content.actionText}
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="ml-3 px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Write a Review
          </h3>
          {reviewEligibility?.existingReviewsCount > 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              You have {reviewEligibility.existingReviewsCount} previous review
              {reviewEligibility.existingReviewsCount > 1 ? "s" : ""} for this
              product
            </p>
          )}
        </div>
        <div className="flex items-center text-sm text-green-600 dark:text-green-400">
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Verified Purchase
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Multiple Reviews Info */}
        {reviewEligibility?.existingReviewsCount > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Multiple Reviews Allowed
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Like Daraz, you can write multiple reviews for the same
                  product. This is helpful if you've purchased this item
                  multiple times or want to update your experience.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating *
          </label>
          <StarRating
            rating={formData.rating}
            onRatingChange={handleRatingChange}
            size="lg"
          />
          {errors.rating && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.rating}
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Review Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Summarize your review in a few words"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            maxLength={100}
          />
        </div>

        {/* Comment */}
        <div>
          <label
            htmlFor="comment"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Your Review *
          </label>
          <textarea
            id="comment"
            name="comment"
            value={formData.comment}
            onChange={handleInputChange}
            placeholder="Share your experience with this product..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            rows={4}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.comment ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.comment}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Minimum 10 characters
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formData.comment.length}/1000
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Add Photos (Optional) - Show your experience!
          </label>
          <div className="space-y-4">
            {/* Upload Button */}
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="review-images"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                  uploadingImages ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingImages ? (
                    <>
                      <svg
                        className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Uploading images...
                      </p>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, WebP (MAX. 5MB each, up to 5 images)
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="review-images"
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImages || formData.images.length >= 5}
                />
              </label>
            </div>

            {/* Image Preview */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {formData.images.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Review image ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Image Upload Error */}
            {errors.images && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.images}
              </p>
            )}

            {/* Image Upload Info */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formData.images.length}/5 images uploaded
            </p>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.submit}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <button
            type="submit"
            disabled={isSubmitting || uploadingImages}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting
              ? "Submitting..."
              : uploadingImages
                ? "Uploading Images..."
                : "Submit Review"}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
