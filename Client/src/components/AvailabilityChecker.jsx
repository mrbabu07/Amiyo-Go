import { useState } from "react";

export default function AvailabilityChecker({ productId, onLocationSelect }) {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null);

  const locations = [
    { id: "dhaka", name: "Dhaka", deliveryTime: "1-2 days" },
    { id: "chittagong", name: "Chittagong", deliveryTime: "2-3 days" },
    { id: "sylhet", name: "Sylhet", deliveryTime: "3-4 days" },
    { id: "rajshahi", name: "Rajshahi", deliveryTime: "3-4 days" },
    { id: "khulna", name: "Khulna", deliveryTime: "3-5 days" },
    { id: "barisal", name: "Barisal", deliveryTime: "4-5 days" },
  ];

  const checkAvailability = async (locationId) => {
    setChecking(true);
    setSelectedLocation(locationId);

    // Simulate API call
    setTimeout(() => {
      const location = locations.find((loc) => loc.id === locationId);
      setAvailability({
        available: Math.random() > 0.2, // 80% chance available
        location: location.name,
        deliveryTime: location.deliveryTime,
        stock: Math.floor(Math.random() * 10) + 1,
      });
      setChecking(false);

      if (onLocationSelect) {
        onLocationSelect(locationId);
      }
    }, 1000);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
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
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Check Availability in Your Area
      </h4>

      <div className="space-y-3">
        <select
          value={selectedLocation}
          onChange={(e) => checkAvailability(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Select your location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>

        {checking && (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <svg
              className="w-4 h-4 animate-spin"
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
            <span className="text-sm">Checking availability...</span>
          </div>
        )}

        {availability && !checking && (
          <div
            className={`p-3 rounded-lg border ${
              availability.available
                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
            }`}
          >
            <div className="flex items-start gap-2">
              <svg
                className={`w-5 h-5 mt-0.5 ${
                  availability.available ? "text-green-600" : "text-red-600"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {availability.available ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                )}
              </svg>
              <div>
                <p
                  className={`font-medium ${
                    availability.available
                      ? "text-green-900 dark:text-green-100"
                      : "text-red-900 dark:text-red-100"
                  }`}
                >
                  {availability.available ? "✅ Available" : "❌ Not Available"}{" "}
                  in {availability.location}
                </p>
                {availability.available && (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      📦 {availability.stock} units in stock
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      🚚 Delivery: {availability.deliveryTime}
                    </p>
                  </div>
                )}
                {!availability.available && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Try selecting a different location or check back later
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
