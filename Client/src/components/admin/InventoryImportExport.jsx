import { useState } from "react";
import { getProducts, updateProduct } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function InventoryImportExport({ onImportComplete }) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const { success, error } = useToast();

  const exportInventoryCSV = async () => {
    setExporting(true);
    try {
      const response = await getProducts();
      const products = response.data.data || [];

      // Create CSV content
      const headers = [
        "Product ID",
        "Product Name",
        "Current Stock",
        "Price",
        "Category",
      ];
      const csvContent = [
        headers.join(","),
        ...products.map((product) =>
          [
            product._id,
            `"${product.title.replace(/"/g, '""')}"`, // Escape quotes in product names
            product.stock || 0,
            product.price || 0,
            `"${product.category?.name || "Uncategorized"}"`,
          ].join(","),
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `inventory-export-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      success(`Exported ${products.length} products to CSV`);
    } catch (err) {
      error("Failed to export inventory");
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const importInventoryCSV = async (file) => {
    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        error("CSV file must contain at least a header row and one data row");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const productIdIndex = headers.findIndex(
        (h) => h.includes("product id") || h.includes("id"),
      );
      const stockIndex = headers.findIndex(
        (h) => h.includes("stock") || h.includes("quantity"),
      );

      if (productIdIndex === -1 || stockIndex === -1) {
        error("CSV must contain 'Product ID' and 'Stock' columns");
        return;
      }

      const results = {
        total: 0,
        updated: 0,
        failed: 0,
        errors: [],
      };

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i]
          .split(",")
          .map((cell) => cell.trim().replace(/^"|"$/g, ""));
        results.total++;

        try {
          const productId = row[productIdIndex];
          const newStock = parseInt(row[stockIndex]);

          if (!productId || isNaN(newStock) || newStock < 0) {
            results.failed++;
            results.errors.push(
              `Row ${i + 1}: Invalid product ID or stock value`,
            );
            continue;
          }

          await updateProduct(productId, { stock: newStock });
          results.updated++;
        } catch (err) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: ${err.response?.data?.error || "Update failed"}`,
          );
        }
      }

      setImportResults(results);

      if (results.updated > 0) {
        success(`Successfully updated ${results.updated} products`);
        if (onImportComplete) onImportComplete();
      }

      if (results.failed > 0) {
        error(`Failed to update ${results.failed} products`);
      }
    } catch (err) {
      error("Failed to process CSV file");
      console.error("Import failed:", err);
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "text/csv") {
      importInventoryCSV(file);
    } else {
      error("Please select a valid CSV file");
    }
    // Reset file input
    event.target.value = "";
  };

  const downloadTemplate = () => {
    const templateContent = [
      "Product ID,Product Name,Current Stock,Price,Category",
      '60f7b3b4e1234567890abcde,"Sample Product",50,29.99,"Electronics"',
      '60f7b3b4e1234567890abcdf,"Another Product",25,19.99,"Clothing"',
    ].join("\n");

    const blob = new Blob([templateContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory-template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Import/Export Inventory
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Export Inventory
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Download current inventory data as CSV file
          </p>
          <button
            onClick={exportInventoryCSV}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Exporting...
              </>
            ) : (
              <>
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export CSV
              </>
            )}
          </button>
        </div>

        {/* Import Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Import Inventory
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload CSV file to update stock levels in bulk
          </p>

          <div className="space-y-2">
            <label className="block">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={importing}
                className="hidden"
              />
              <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {importing ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
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
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                      />
                    </svg>
                    Import CSV
                  </>
                )}
              </div>
            </label>

            <button
              onClick={downloadTemplate}
              className="w-full text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 underline"
            >
              Download CSV Template
            </button>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h5 className="font-medium text-gray-900 dark:text-white mb-2">
            Import Results
          </h5>
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {importResults.total}
              </p>
              <p className="text-gray-600 dark:text-gray-400">Total Rows</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {importResults.updated}
              </p>
              <p className="text-gray-600 dark:text-gray-400">Updated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {importResults.failed}
              </p>
              <p className="text-gray-600 dark:text-gray-400">Failed</p>
            </div>
          </div>

          {importResults.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                Errors:
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importResults.errors.slice(0, 10).map((error, index) => (
                  <p
                    key={index}
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    {error}
                  </p>
                ))}
                {importResults.errors.length > 10 && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    ... and {importResults.errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h5 className="font-medium text-blue-800 dark:text-blue-400 mb-2">
          CSV Format Instructions
        </h5>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• CSV must contain 'Product ID' and 'Stock' columns</li>
          <li>• Product ID should match existing product IDs in your system</li>
          <li>• Stock values must be non-negative integers</li>
          <li>• Use the template for proper formatting</li>
          <li>• Maximum 1000 rows per import</li>
        </ul>
      </div>
    </div>
  );
}
