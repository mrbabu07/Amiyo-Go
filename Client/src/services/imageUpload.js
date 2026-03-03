/**
 * Upload image to ImgBB
 * @param {File} imageFile - The image file to upload
 * @returns {Promise<string>} - The uploaded image URL
 */
export const uploadImage = async (imageFile) => {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error("ImgBB API key not configured");
  }

  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || "Failed to upload image");
  }

  return data.data.display_url;
};

// Export with both names for compatibility
export const uploadToImgBB = uploadImage;
