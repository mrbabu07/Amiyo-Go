import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { useCurrency } from "../../hooks/useCurrency";
import Loading from "../../components/Loading";
import { getCurrentUserToken } from "../../utils/auth";

export default function AdminDeliverySettings() {
  const { success, error } = useToast();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/delivery-settings`,
      );
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error("Error fetching delivery settings:", err);
      error("Failed to load delivery settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await getCurrentUserToken();

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/delivery-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settings),
        },
      );

      const data = await response.json();
      if (data.success) {
        success("Delivery settings updated successfully!");
        setSettings(data.data);
      } else {
        error(data.error || "Failed to update settings");
      }
    } catch (err) {
      console.error("Error saving delivery settings:", err);
      error("Failed to save delivery settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return <Loading />;
  }

  // Convert USD to BDT for display
  const usdToBdt = (usd) => usd * 110;
  const bdtToUsd = (bdt) => bdt / 110;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🚚 Delivery Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure delivery charges, free delivery threshold, and delivery
          areas
        </p>
      </div>

      <div className="space-y-6">
        {/* Free Delivery Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Free Delivery
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Set minimum order value for free delivery
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.freeDeliveryEnabled}
                onChange={(e) =>
                  handleChange("freeDeliveryEnabled", e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {settings?.freeDeliveryEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Free Delivery Threshold (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ৳
                  </span>
                  <input
                    type="number"
                    value={Math.round(
                      usdToBdt(settings?.freeDeliveryThreshold || 0),
                    )}
                    onChange={(e) =>
                      handleChange(
                        "freeDeliveryThreshold",
                        bdtToUsd(parseFloat(e.target.value) || 0),
                      )
                    }
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="11000"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current: {formatPrice(settings?.freeDeliveryThreshold || 0)} (
                  {Math.round(usdToBdt(settings?.freeDeliveryThreshold || 0))}{" "}
                  BDT)
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                      💡 Customer Experience
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Customers will see "FREE delivery on orders over{" "}
                      {formatPrice(settings?.freeDeliveryThreshold || 0)}" and a
                      progress bar showing how much more they need to add.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Standard Delivery Charge */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Standard Delivery Charge
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delivery Charge (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ৳
                </span>
                <input
                  type="number"
                  value={Math.round(
                    usdToBdt(settings?.standardDeliveryCharge || 0),
                  )}
                  onChange={(e) =>
                    handleChange(
                      "standardDeliveryCharge",
                      bdtToUsd(parseFloat(e.target.value) || 0),
                    )
                  }
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="100"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Current: {formatPrice(settings?.standardDeliveryCharge || 0)} (
                {Math.round(usdToBdt(settings?.standardDeliveryCharge || 0))}{" "}
                BDT)
              </p>
            </div>
          </div>
        </div>

        {/* Express Delivery */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Express Delivery
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Faster delivery option with additional charge
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.expressDeliveryEnabled}
                onChange={(e) =>
                  handleChange("expressDeliveryEnabled", e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {settings?.expressDeliveryEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Express Delivery Charge (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ৳
                </span>
                <input
                  type="number"
                  value={Math.round(
                    usdToBdt(settings?.expressDeliveryCharge || 0),
                  )}
                  onChange={(e) =>
                    handleChange(
                      "expressDeliveryCharge",
                      bdtToUsd(parseFloat(e.target.value) || 0),
                    )
                  }
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="200"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Current: {formatPrice(settings?.expressDeliveryCharge || 0)} (
                {Math.round(usdToBdt(settings?.expressDeliveryCharge || 0))}{" "}
                BDT)
              </p>
            </div>
          )}
        </div>

        {/* Estimated Delivery Time */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Estimated Delivery Time
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Days
              </label>
              <input
                type="number"
                value={settings?.estimatedDeliveryDays?.min || 2}
                onChange={(e) =>
                  handleNestedChange(
                    "estimatedDeliveryDays",
                    "min",
                    parseInt(e.target.value) || 2,
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Days
              </label>
              <input
                type="number"
                value={settings?.estimatedDeliveryDays?.max || 5}
                onChange={(e) =>
                  handleNestedChange(
                    "estimatedDeliveryDays",
                    "max",
                    parseInt(e.target.value) || 5,
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="1"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Customers will see: "Standard delivery:{" "}
            {settings?.estimatedDeliveryDays?.min}-
            {settings?.estimatedDeliveryDays?.max} business days"
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Ready to save changes?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Changes will apply immediately to all customers
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-4">
            📱 Customer Preview
          </h3>
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Delivery Charge
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatPrice(settings?.standardDeliveryCharge || 0)}
                </span>
              </div>
              {settings?.freeDeliveryEnabled && (
                <div className="text-xs text-green-600 dark:text-green-400">
                  ✨ FREE on orders over{" "}
                  {formatPrice(settings?.freeDeliveryThreshold || 0)}
                </div>
              )}
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                🚚 Almost there for FREE delivery!
                <br />
                Add {formatPrice(
                  (settings?.freeDeliveryThreshold || 0) - 80,
                )}{" "}
                more to get free delivery
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
