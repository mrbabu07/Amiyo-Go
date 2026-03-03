import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WishlistShare({
  wishlistId,
  isPublic = false,
  onTogglePublic,
}) {
  const [showModal, setShowModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/wishlist/shared/${wishlistId}`;

  const generateQRCode = async () => {
    try {
      // Dynamic import to avoid build errors if package not installed
      const QRCode = await import("qrcode");
      const url = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("QR code generation failed:", error);
      console.log("Please install qrcode package: npm install qrcode");
      // Set a placeholder message
      setQrCodeUrl("placeholder");
    }
  };

  const handleShare = async () => {
    setShowModal(true);
    if (!qrCodeUrl) {
      await generateQRCode();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const shareVia = (platform) => {
    const text = "Check out my wishlist!";
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      email: `mailto:?subject=${encodeURIComponent("My Wishlist")}&body=${encodeURIComponent(text + " " + shareUrl)}`,
    };

    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  const downloadQRCode = () => {
    const link = document.createElement("a");
    link.download = "wishlist-qr-code.png";
    link.href = qrCodeUrl;
    link.click();
  };

  return (
    <>
      {/* Share Button */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
        title="Share your wishlist"
      >
        <svg
          className="w-5 h-5"
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
        <span className="hidden sm:inline">Share Wishlist</span>
        <span className="sm:hidden">Share</span>
      </button>

      {/* Share Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Share Wishlist
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-500 dark:text-gray-400"
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
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Privacy Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Public Wishlist
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Anyone with the link can view
                      </p>
                    </div>
                    <button
                      onClick={onTogglePublic}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isPublic
                          ? "bg-primary-600"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isPublic ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {isPublic && (
                    <>
                      {/* Share Link */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Share Link
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={copyToClipboard}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              copied
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            }`}
                          >
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* QR Code */}
                      {qrCodeUrl && (
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Scan QR Code
                          </p>
                          {qrCodeUrl === "placeholder" ? (
                            <div className="inline-block p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                              <div className="w-48 h-48 flex items-center justify-center">
                                <div className="text-center">
                                  <svg
                                    className="w-16 h-16 mx-auto text-gray-400 mb-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                                    />
                                  </svg>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    QR Code requires
                                    <br />
                                    qrcode package
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                    Run: npm install qrcode
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="inline-block p-4 bg-white rounded-lg">
                                <img
                                  src={qrCodeUrl}
                                  alt="QR Code"
                                  className="w-48 h-48"
                                />
                              </div>
                              <button
                                onClick={downloadQRCode}
                                className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                              >
                                Download QR Code
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Share Buttons */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Share via
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                          <button
                            onClick={() => shareVia("whatsapp")}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              WhatsApp
                            </span>
                          </button>

                          <button
                            onClick={() => shareVia("facebook")}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                              </svg>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Facebook
                            </span>
                          </button>

                          <button
                            onClick={() => shareVia("twitter")}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                              </svg>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Twitter
                            </span>
                          </button>

                          <button
                            onClick={() => shareVia("email")}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Email
                            </span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {!isPublic && (
                    <div className="text-center py-8">
                      <svg
                        className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <p className="text-gray-600 dark:text-gray-400">
                        Enable public sharing to generate a shareable link
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
