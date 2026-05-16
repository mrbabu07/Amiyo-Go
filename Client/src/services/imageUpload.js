import { auth } from "../firebase/firebase.config";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const uploadImage = async (imageFile, folder = "general") => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to upload images");
  }

  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append("images", imageFile);
  formData.append("folder", folder);

  const response = await fetch(`${API_URL}/uploads/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to upload image");
  }

  return data.urls?.[0] || data.data?.[0]?.url;
};

// Backward-compatible name for older return/review flows.
export const uploadToImgBB = uploadImage;
