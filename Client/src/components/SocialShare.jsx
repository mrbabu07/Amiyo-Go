import { useState } from "react";
import QRCodeShare from "./QRCodeShare";

export default function SocialShare({ product }) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  const shareUrl = window.location.href;
  const shareTitle = product?.title || "Check out this product!";
  const shareImage = product?.image || product?.images?.[0] || "";

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareTitle + " " + shareUrl)}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(shareImage)}&description=${encodeURIComponent(shareTitle)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
  };

  const handleShare = (platform) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
    setShowShareMenu(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard!");
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Check out ${shareTitle}`,
          url: shareUrl,
        });
        setShowShareMenu(false);
      } catch (error) {
        console.error("Error sharing:", error);
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        title="Share this product"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700">Share</span>
      </button>

      {showShareMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowShareMenu(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                Share this product
              </p>
            </div>

            <div className="py-2">
              {/* Native Share (Mobile) */}
              {navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">Share via...</span>
                </button>
              )}

              {/* Facebook */}
              <button
                onClick={() => handleShare("facebook")}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Facebook</span>
              </button>

              {/* Twitter */}
              <button
                onClick={() => handleShare("twitter")}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-sky-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Twitter</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={() => handleShare("whatsapp")}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">WhatsApp</span>
              </button>

              {/* Pinterest */}
              <button
                onClick={() => handleShare("pinterest")}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0a12 12 0 00-4.37 23.17c-.1-.92-.19-2.33 0-3.33l1.45-6.15s-.37-.74-.37-1.84c0-1.72 1-3 2.24-3 1.06 0 1.57.79 1.57 1.74 0 1.06-.67 2.64-1 4.1-.29 1.21.61 2.2 1.8 2.2 2.16 0 3.82-2.28 3.82-5.57 0-2.91-2.09-4.95-5.07-4.95-3.46 0-5.49 2.59-5.49 5.27 0 1.04.4 2.16.9 2.77a.36.36 0 01.08.35c-.09.38-.3 1.21-.34 1.38-.05.22-.17.27-.4.16-1.51-.7-2.46-2.9-2.46-4.66 0-3.83 2.78-7.35 8.02-7.35 4.21 0 7.48 3 7.48 7.01 0 4.18-2.64 7.55-6.3 7.55-1.23 0-2.39-.64-2.79-1.39l-.76 2.9c-.27 1.06-1.01 2.39-1.5 3.2A12 12 0 1012 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Pinterest</span>
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors border-t border-gray-100 mt-2 pt-3"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">Copy Link</span>
              </button>

              {/* QR Code */}
              <QRCodeShare url={shareUrl} title={shareTitle} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
