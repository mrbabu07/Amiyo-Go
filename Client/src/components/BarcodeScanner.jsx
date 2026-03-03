import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function BarcodeScanner({ onScan, onClose, isOpen }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const videoRef = useRef(null);
  const codeReader = useRef(null);

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      // Check camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);

      // Stop the test stream
      stream.getTracks().forEach((track) => track.stop());

      // Initialize barcode reader
      codeReader.current = new BrowserMultiFormatReader();
      startScanning();
    } catch (err) {
      console.error("Camera permission denied:", err);
      setHasPermission(false);
      setError("Camera permission is required to scan barcodes");
    }
  };

  const startScanning = async () => {
    if (!codeReader.current || !videoRef.current) return;

    try {
      setIsScanning(true);
      setError(null);

      // Get available video devices
      const videoInputDevices =
        await codeReader.current.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error("No camera devices found");
      }

      // Use the first available camera (usually back camera on mobile)
      const selectedDeviceId = videoInputDevices[0].deviceId;

      // Start decoding
      await codeReader.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const barcodeText = result.getText();
            console.log("Barcode scanned:", barcodeText);
            onScan(barcodeText);
            stopScanning();
          }

          if (error && error.name !== "NotFoundException") {
            console.error("Scanning error:", error);
            setError("Error scanning barcode. Please try again.");
          }
        },
      );
    } catch (err) {
      console.error("Failed to start scanning:", err);
      setError("Failed to start camera. Please check permissions.");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
  };

  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      setError(null);
      startScanning();
    } catch (err) {
      setHasPermission(false);
      setError("Camera permission is required to scan barcodes");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Scan Barcode
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
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

        {/* Scanner Content */}
        <div className="p-4">
          {hasPermission === null && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Initializing camera...
              </p>
            </div>
          )}

          {hasPermission === false && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Camera Permission Required
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Please allow camera access to scan barcodes
              </p>
              <button onClick={requestPermission} className="btn-primary">
                Grant Permission
              </button>
            </div>
          )}

          {hasPermission === true && (
            <div className="space-y-4">
              {/* Camera View */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />

                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Scanning Frame */}
                    <div className="w-64 h-40 border-2 border-white rounded-lg relative">
                      {/* Corner indicators */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>

                      {/* Scanning line animation */}
                      {isScanning && (
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary-500 animate-pulse">
                          <div className="w-full h-full bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-bounce"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="absolute top-4 left-4">
                  <div
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                      isScanning
                        ? "bg-green-500 text-white"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isScanning ? "bg-white animate-pulse" : "bg-gray-300"
                      }`}
                    ></div>
                    <span>{isScanning ? "Scanning..." : "Ready"}</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2">
                <p className="text-gray-600 dark:text-gray-400">
                  Position the barcode within the frame
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  The scanner will automatically detect and read the barcode
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-red-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Input Option */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">
                  Can't scan? Enter barcode manually
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter barcode number"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && e.target.value.trim()) {
                        onScan(e.target.value.trim());
                        onClose();
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      if (input.value.trim()) {
                        onScan(input.value.trim());
                        onClose();
                      }
                    }}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
