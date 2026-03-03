import { useState, useEffect } from "react";

export default function OrderTracking({
  orderId,
  currentStatus,
  orderDate,
  estimatedDelivery,
}) {
  const [activeStep, setActiveStep] = useState(0);

  const trackingSteps = [
    {
      id: "pending",
      title: "Order Placed",
      description: "Your order has been received",
      icon: "📝",
      date: orderDate,
    },
    {
      id: "processing",
      title: "Processing",
      description: "We're preparing your order",
      icon: "⚙️",
      date: null,
    },
    {
      id: "shipped",
      title: "Shipped",
      description: "Your order is on the way",
      icon: "🚚",
      date: null,
    },
    {
      id: "delivered",
      title: "Delivered",
      description: "Order delivered successfully",
      icon: "✅",
      date: null,
    },
  ];

  useEffect(() => {
    const stepIndex = trackingSteps.findIndex(
      (step) => step.id === currentStatus,
    );
    setActiveStep(stepIndex >= 0 ? stepIndex : 0);
  }, [currentStatus]);

  const getStepStatus = (index) => {
    if (index < activeStep) return "completed";
    if (index === activeStep) return "active";
    return "pending";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Order Tracking
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Order #{orderId?.slice(-8).toUpperCase()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="flex items-center justify-between">
          {trackingSteps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <div
                key={step.id}
                className="flex flex-col items-center relative"
              >
                {/* Step Circle */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-all ${
                    status === "completed"
                      ? "bg-green-500 text-white"
                      : status === "active"
                        ? "bg-blue-500 text-white animate-pulse"
                        : "bg-gray-200 text-gray-400 dark:bg-gray-700"
                  }`}
                >
                  {status === "completed" ? "✓" : step.icon}
                </div>

                {/* Step Info */}
                <div className="mt-3 text-center">
                  <p
                    className={`text-sm font-medium ${
                      status === "active"
                        ? "text-blue-600 dark:text-blue-400"
                        : status === "completed"
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {step.description}
                  </p>
                  {step.date && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(step.date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Connecting Line */}
                {index < trackingSteps.length - 1 && (
                  <div
                    className={`absolute top-6 left-12 w-full h-0.5 -z-10 ${
                      index < activeStep
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                    style={{ width: "calc(100% + 2rem)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Estimated Delivery */}
      {estimatedDelivery && currentStatus !== "delivered" && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Estimated Delivery:{" "}
              {new Date(estimatedDelivery).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Delivery Confirmation */}
      {currentStatus === "delivered" && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
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
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              🎉 Order delivered successfully!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
