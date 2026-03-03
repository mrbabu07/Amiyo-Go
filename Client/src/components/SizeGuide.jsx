import { useState } from "react";
import Modal from "./Modal";

const SizeGuide = ({ product, isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [userMeasurements, setUserMeasurements] = useState({
    height: "",
    weight: "",
    chest: "",
    waist: "",
    hips: "",
  });
  const [recommendedSize, setRecommendedSize] = useState(null);

  // Size charts for different categories
  const sizeCharts = {
    general: {
      title: "General Size Guide",
      sizes: [
        { size: "XS", chest: "32-34", waist: "26-28", hips: "34-36" },
        { size: "S", chest: "34-36", waist: "28-30", hips: "36-38" },
        { size: "M", chest: "36-38", waist: "30-32", hips: "38-40" },
        { size: "L", chest: "38-40", waist: "32-34", hips: "40-42" },
        { size: "XL", chest: "40-42", waist: "34-36", hips: "42-44" },
        { size: "XXL", chest: "42-44", waist: "36-38", hips: "44-46" },
      ],
    },
    mens: {
      title: "Men's Clothing",
      sizes: [
        { size: "S", chest: "34-36", waist: "28-30", neck: "14-14.5" },
        { size: "M", chest: "38-40", waist: "32-34", neck: "15-15.5" },
        { size: "L", chest: "42-44", waist: "36-38", neck: "16-16.5" },
        { size: "XL", chest: "46-48", waist: "40-42", neck: "17-17.5" },
        { size: "XXL", chest: "50-52", waist: "44-46", neck: "18-18.5" },
      ],
    },
    womens: {
      title: "Women's Clothing",
      sizes: [
        { size: "XS", chest: "30-32", waist: "24-26", hips: "34-36" },
        { size: "S", chest: "32-34", waist: "26-28", hips: "36-38" },
        { size: "M", chest: "34-36", waist: "28-30", hips: "38-40" },
        { size: "L", chest: "36-38", waist: "30-32", hips: "40-42" },
        { size: "XL", chest: "38-40", waist: "32-34", hips: "42-44" },
      ],
    },
    shoes: {
      title: "Shoe Size Guide",
      sizes: [
        { size: "6", us: "6", uk: "5.5", eu: "39", cm: "24" },
        { size: "7", us: "7", uk: "6.5", eu: "40", cm: "25" },
        { size: "8", us: "8", uk: "7.5", eu: "41", cm: "26" },
        { size: "9", us: "9", uk: "8.5", eu: "42", cm: "27" },
        { size: "10", us: "10", uk: "9.5", eu: "43", cm: "28" },
        { size: "11", us: "11", uk: "10.5", eu: "44", cm: "29" },
        { size: "12", us: "12", uk: "11.5", eu: "45", cm: "30" },
      ],
    },
  };

  // Determine category based on product
  const getProductCategory = () => {
    if (!product) return "general";
    const category = product.category?.name?.toLowerCase() || "";
    if (category.includes("men")) return "mens";
    if (category.includes("women")) return "womens";
    if (category.includes("shoe") || category.includes("footwear"))
      return "shoes";
    return "general";
  };

  // Size recommendation algorithm
  const calculateRecommendedSize = () => {
    if (!userMeasurements.chest || !userMeasurements.waist) {
      return null;
    }

    const category = getProductCategory();
    const chart = sizeCharts[category];
    const chest = parseInt(userMeasurements.chest);
    const waist = parseInt(userMeasurements.waist);

    for (const sizeInfo of chart.sizes) {
      const chestRange = sizeInfo.chest?.split("-").map((n) => parseInt(n));
      const waistRange = sizeInfo.waist?.split("-").map((n) => parseInt(n));

      if (chestRange && waistRange) {
        if (
          chest >= chestRange[0] &&
          chest <= chestRange[1] &&
          waist >= waistRange[0] &&
          waist <= waistRange[1]
        ) {
          return sizeInfo.size;
        }
      }
    }

    return null;
  };

  const handleCalculateSize = () => {
    const recommended = calculateRecommendedSize();
    setRecommendedSize(recommended);
  };

  const currentChart = sizeCharts[selectedCategory] || sizeCharts.general;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Size Guide & Fit Predictor">
      <div className="space-y-6">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b">
          {Object.entries(sizeCharts).map(([key, chart]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                selectedCategory === key
                  ? "bg-primary-500 text-white"
                  : "text-gray-600 hover:text-primary-500 hover:bg-gray-50"
              }`}
            >
              {chart.title}
            </button>
          ))}
        </div>

        {/* Size Chart */}
        <div className="overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4">{currentChart.title}</h3>
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-900">
                  Size
                </th>
                {selectedCategory === "shoes" ? (
                  <>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">
                      US
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">
                      UK
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">
                      EU
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">
                      CM
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">
                      Chest (inches)
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">
                      Waist (inches)
                    </th>
                    {currentChart.sizes[0]?.hips && (
                      <th className="px-4 py-2 text-left font-medium text-gray-900">
                        Hips (inches)
                      </th>
                    )}
                    {currentChart.sizes[0]?.neck && (
                      <th className="px-4 py-2 text-left font-medium text-gray-900">
                        Neck (inches)
                      </th>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {currentChart.sizes.map((sizeInfo, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="px-4 py-2 font-medium">{sizeInfo.size}</td>
                  {selectedCategory === "shoes" ? (
                    <>
                      <td className="px-4 py-2">{sizeInfo.us}</td>
                      <td className="px-4 py-2">{sizeInfo.uk}</td>
                      <td className="px-4 py-2">{sizeInfo.eu}</td>
                      <td className="px-4 py-2">{sizeInfo.cm}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">{sizeInfo.chest}</td>
                      <td className="px-4 py-2">{sizeInfo.waist}</td>
                      {sizeInfo.hips && (
                        <td className="px-4 py-2">{sizeInfo.hips}</td>
                      )}
                      {sizeInfo.neck && (
                        <td className="px-4 py-2">{sizeInfo.neck}</td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fit Predictor */}
        {selectedCategory !== "shoes" && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Fit Predictor
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Enter your measurements to get a personalized size recommendation
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chest (inches)
                </label>
                <input
                  type="number"
                  value={userMeasurements.chest}
                  onChange={(e) =>
                    setUserMeasurements((prev) => ({
                      ...prev,
                      chest: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="e.g., 36"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waist (inches)
                </label>
                <input
                  type="number"
                  value={userMeasurements.waist}
                  onChange={(e) =>
                    setUserMeasurements((prev) => ({
                      ...prev,
                      waist: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="e.g., 32"
                />
              </div>
            </div>

            <button
              onClick={handleCalculateSize}
              disabled={!userMeasurements.chest || !userMeasurements.waist}
              className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Calculate My Size
            </button>

            {recommendedSize && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="font-medium text-green-800">
                    Recommended Size:{" "}
                    <span className="text-xl">{recommendedSize}</span>
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Based on your measurements, this size should provide the best
                  fit.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Measurement Tips */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">📏 How to Measure</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Chest:</strong> Measure around the fullest part of your
              chest, keeping the tape horizontal.
            </p>
            <p>
              <strong>Waist:</strong> Measure around your natural waistline,
              keeping the tape comfortably loose.
            </p>
            <p>
              <strong>Hips:</strong> Measure around the fullest part of your
              hips, about 8 inches below your waist.
            </p>
          </div>
        </div>

        {/* Size Disclaimer */}
        <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="font-medium text-yellow-800 mb-1">⚠️ Important Note</p>
          <p>
            Sizes may vary between brands and styles. These are general
            guidelines. When in doubt, we recommend ordering one size up or
            contacting our customer service for personalized advice.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default SizeGuide;
