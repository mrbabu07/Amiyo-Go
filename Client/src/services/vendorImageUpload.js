export const uploadVendorProductImages = async (files, token) => {
  if (!files || files.length === 0) return [];

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/vendor/products/upload-images`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || "Failed to upload images");
  }

  return data.urls || data.data?.map((item) => item.url) || [];
};
