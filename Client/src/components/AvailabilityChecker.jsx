import { useEffect, useState } from "react";
import { getProductById } from "../services/api";

const estimateDeliveryTime = (divisionName) => {
  const normalized = divisionName.toLowerCase();
  if (normalized.includes("chattogram") || normalized.includes("chittagong")) {
    return "1-2 days";
  }
  if (normalized.includes("dhaka")) return "2-3 days";
  return "3-5 days";
};

const normalizeDivisions = (payload) => {
  if (!Array.isArray(payload)) return [];
  const table = payload.find((item) => item?.name === "divisions" && Array.isArray(item.data));
  if (table) return table.data;
  return payload.filter((item) => item?.id && item?.name);
};

export default function AvailabilityChecker({ productId, onLocationSelect }) {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [locations, setLocations] = useState([]);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [divisionResponse, productResponse] = await Promise.all([
          fetch("/divisions.json"),
          productId ? getProductById(productId) : Promise.resolve(null),
        ]);
        const divisions = await divisionResponse.json();
        if (!active) return;
        setLocations(normalizeDivisions(divisions));
        setProduct(productResponse?.data?.data || productResponse?.data || null);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load availability data:", error);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [productId]);

  const checkAvailability = async (locationId) => {
    setChecking(true);
    setSelectedLocation(locationId);

    const location = locations.find((item) => String(item.id) === String(locationId));
    const stock = Number(product?.stock) || 0;
    const available = stock > 0 && product?.isActive !== false;

    setAvailability({
      available,
      location: location?.name || "selected area",
      deliveryTime: location ? estimateDeliveryTime(location.name) : "3-5 days",
      stock,
    });
    setChecking(false);

    if (onLocationSelect) {
      onLocationSelect(locationId);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Check Availability in Your Area
      </h4>

      <div className="space-y-3">
        <select
          value={selectedLocation}
          onChange={(e) => checkAvailability(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Select your division</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>

        {checking && (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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
              <div>
                <p
                  className={`font-medium ${
                    availability.available
                      ? "text-green-900 dark:text-green-100"
                      : "text-red-900 dark:text-red-100"
                  }`}
                >
                  {availability.available ? "Available" : "Not Available"} in {availability.location}
                </p>
                {availability.available ? (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {availability.stock} units in stock
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Delivery: {availability.deliveryTime}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    This product is currently out of stock.
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
