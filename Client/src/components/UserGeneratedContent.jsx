import { useState, useRef } from "react";
import { uploadImage } from "../services/imageUpload";

export default function UserGeneratedContent({
  onMediaAdd,
  onMediaRemove,
  existingMedia = [],
  maxFiles = 5,
  acceptedTypes = ["image/*", "video/*"],
  maxFileSize = 10 * 1024 * 1024, // 10MB
}) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files);

    // Validate file count
    if (existingMedia.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);

    try {
      for (const file of fileArray) {
        // Validate file type
        const isValidType = acceptedTypes.some((type) => {
          if (type === "image/*") return file.type.startsWith("image/");
          if (type === "video/*") return file.type.startsWith("video/");
          return file.type === type;
        });

        if (!isValidType) {
          alert(`File type ${file.type} is not supported`);
          continue;
        }

        // Validate file size
        if (file.size > maxFileSize) {
          alert(
            `File ${file.name} is too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB`,
          );
          continue;
        }

        // Create preview
        const preview = await createPreview(file);

        // Upload file
        let uploadedUrl = null;
        if (file.type.startsWith("image/")) {
          try {
            const response = await uploadImage(file);
            uploadedUrl = response.data.url;
          } catch (error) {
            console.error("Failed to upload image:", error);
            alert("Failed to upload image. Please try again.");
            continue;
          }
        }

        const mediaItem = {
          id: Date.now() + Math.random(),
          file,
          preview,
          url: uploadedUrl,
          type: file.type.startsWith("image/") ? "image" : "video",
          name: file.name,
          size: file.size,
        };

        onMediaAdd(mediaItem);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Error processing files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const createPreview = (file) => {
    return new Promise((resolve) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          video.currentTime = 1; // Seek to 1 second for thumbnail
        };
        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0);
          resolve(canvas.toDataURL());
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve(null);
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Uploading files...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>

            <div>
              <p className="text-gray-900 dark:text-white font-medium">
                Add photos or videos
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Drag and drop files here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-500 hover:text-primary-600 font-medium"
                >
                  browse
                </button>
              </p>
            </div>

            <div className="text-xs text-gray-400 dark:text-gray-500">
              <p>
                Maximum {maxFiles} files • Up to {maxFileSize / (1024 * 1024)}MB
                each
              </p>
              <p>Supported: Images (JPG, PNG, GIF) and Videos (MP4, MOV)</p>
            </div>
          </div>
        )}
      </div>

      {/* Media Preview Grid */}
      {existingMedia.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {existingMedia.map((media) => (
            <div key={media.id} className="relative group">
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {media.type === "image" ? (
                  <img
                    src={media.preview || media.url}
                    alt="User uploaded content"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={media.preview}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-700"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onMediaRemove(media.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* File Info */}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <p className="truncate">{media.name}</p>
                <p>{formatFileSize(media.size)}</p>
              </div>

              {/* Upload Status */}
              {media.type === "image" && !media.url && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs">Uploading...</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guidelines */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          Content Guidelines
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Share authentic photos and videos of the product</li>
          <li>• Avoid blurry or low-quality images</li>
          <li>• Include different angles and use cases</li>
          <li>• Keep content appropriate and family-friendly</li>
          <li>• Videos should be under 30 seconds for best experience</li>
        </ul>
      </div>

      {/* Media Stats */}
      {existingMedia.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            {existingMedia.length} of {maxFiles} files added
          </span>
          <span>
            {existingMedia.filter((m) => m.type === "image").length} images,{" "}
            {existingMedia.filter((m) => m.type === "video").length} videos
          </span>
        </div>
      )}
    </div>
  );
}
