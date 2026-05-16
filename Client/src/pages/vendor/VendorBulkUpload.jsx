import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import {
  createVendorBulkUploadJob,
  downloadVendorBulkUploadReport,
  getVendorBulkUploadJob,
} from "../../services/api";

const csvTemplate = `title,price,stock,category,description,images,sku,brand
"Men's Casual Shirt",850,100,Fashion,"High quality cotton shirt","https://example.com/img1.jpg",SHIRT-001,Local Brand
"Fresh Fish Pack",450,30,Fish,"Fresh local fish cleaned and packed","https://example.com/fish.jpg",FISH-001,Hnila Fresh`;

const fieldGuide = [
  { field: "title", required: true, type: "Text", desc: "Product name" },
  { field: "price", required: true, type: "Number", desc: "Price in BDT" },
  { field: "stock", required: true, type: "Number", desc: "Available quantity" },
  { field: "category", required: true, type: "Text", desc: "Allowed category name, slug, or id" },
  { field: "description", required: false, type: "Text", desc: "Product details" },
  { field: "images", required: false, type: "URL", desc: "Image URLs separated by |" },
  { field: "sku", required: false, type: "Text", desc: "Internal product code" },
  { field: "brand", required: false, type: "Text", desc: "Brand name" },
];

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const parseCsv = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    return headers.reduce(
      (row, header, headerIndex) => ({
        ...row,
        [header]: values[headerIndex] || "",
        rowNumber: index + 2,
      }),
      {},
    );
  });
};

const normalize = (value) => String(value || "").trim().toLowerCase();

export default function VendorBulkUpload() {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [job, setJob] = useState(null);
  const fileRef = useRef();

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      [category._id, category.name, category.title, category.slug]
        .filter(Boolean)
        .forEach((key) => map.set(normalize(key), category));
    });
    return map;
  }, [categories]);

  const rowDiagnostics = useMemo(() => {
    const titleCounts = new Map();
    const skuCounts = new Map();

    rows.forEach((row) => {
      const titleKey = normalize(row.title);
      const skuKey = normalize(row.sku);
      if (titleKey) {
        titleCounts.set(titleKey, (titleCounts.get(titleKey) || 0) + 1);
      }
      if (skuKey) {
        skuCounts.set(skuKey, (skuCounts.get(skuKey) || 0) + 1);
      }
    });

    return rows.map((row) => {
      const issues = [];
      const category = categoryMap.get(normalize(row.category));
      const titleKey = normalize(row.title);
      const skuKey = normalize(row.sku);

      if (!row.title) issues.push("Title is required");
      if (!row.price || Number.isNaN(Number(row.price)) || Number(row.price) <= 0) {
        issues.push("Valid price is required");
      }
      if (row.stock === "" || Number.isNaN(Number(row.stock)) || Number(row.stock) < 0) {
        issues.push("Valid stock is required");
      }
      if (!row.category) {
        issues.push("Category is required");
      } else if (!category) {
        issues.push(`Category not allowed or not found: ${row.category}`);
      }
      if (titleKey && titleCounts.get(titleKey) > 1) {
        issues.push("Duplicate product title in this CSV");
      }
      if (skuKey && skuCounts.get(skuKey) > 1) {
        issues.push("Duplicate SKU in this CSV");
      }

      return {
        rowNumber: row.rowNumber,
        title: row.title || "Untitled",
        issues,
        isValid: issues.length === 0,
      };
    });
  }, [categoryMap, rows]);

  const rowDiagnosticsMap = useMemo(
    () => new Map(rowDiagnostics.map((item) => [item.rowNumber, item])),
    [rowDiagnostics],
  );

  const uploadSummary = useMemo(
    () => ({
      totalRows: rowDiagnostics.length,
      validRows: rowDiagnostics.filter((row) => row.isValid).length,
      invalidRows: rowDiagnostics.filter((row) => !row.isValid).length,
      duplicateRows: rowDiagnostics.filter((row) =>
        row.issues.some((issue) => issue.includes("Duplicate")),
      ).length,
      categoryErrors: rowDiagnostics.filter((row) =>
        row.issues.some((issue) => issue.includes("Category")),
      ).length,
    }),
    [rowDiagnostics],
  );

  const loadCategories = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors/my-categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load categories");
      setCategories(data.data || []);
    } catch (error) {
      toast.error(error.message || "Failed to load allowed categories");
    }
  }, [user]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const text = await selectedFile.text();
    const parsedRows = parseCsv(text);
    setFile(selectedFile);
    setRows(parsedRows);
    setResults([]);
    setJob(null);
    toast.success(`${parsedRows.length} rows ready to upload`);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const validateRow = (row) => {
    return rowDiagnosticsMap.get(row.rowNumber)?.issues?.[0] || "";
  };

  const uploadRows = async () => {
    if (!user || rows.length === 0) {
      toast.error("Please select a CSV file first");
      return;
    }

    setUploading(true);
    setResults([]);

    try {
      const response = await createVendorBulkUploadJob(file);
      const jobId = response.data?.data?.jobId;
      if (!jobId) throw new Error("Bulk upload job was not created");

      toast.success("Bulk upload job started");
      let latest = null;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        const jobResponse = await getVendorBulkUploadJob(jobId);
        latest = jobResponse.data?.data;
        setJob(latest);
        if (["completed", "failed"].includes(latest?.status)) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!latest || !["completed", "failed"].includes(latest.status)) {
        toast("Import is still running. You can refresh this page later.");
      } else if (latest.status === "failed") {
        toast.error(latest.error || "Bulk upload failed");
      } else {
        setResults([
          {
            rowNumber: "-",
            title: `${latest.imported || 0} imported, ${latest.failed || 0} failed`,
            status: latest.failed ? "failed" : "success",
            error: latest.failed ? "Download the validation report for row details." : "",
          },
        ]);
        toast.success(`${latest.imported || 0} products imported for approval`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vendor_bulk_upload_template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrorReport = async () => {
    if (!job?._id) return;
    const response = await downloadVendorBulkUploadReport(job._id);
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bulk_upload_report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter((result) => result.status === "success").length;
  const failedCount = results.filter((result) => result.status === "failed").length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 2500, style: { background: "#363636", color: "#fff" } }} />

      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/vendor/products" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bulk Product Upload</h1>
              <p className="text-sm text-gray-500">Create real vendor products from a CSV file</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-1 font-semibold text-gray-900">Step 1: Download Template</h3>
              <p className="mb-4 text-sm text-gray-500">Use your assigned category name, slug, or id in the category column.</p>
              <button
                onClick={downloadTemplate}
                className="rounded-xl border-2 border-orange-400 bg-white px-5 py-2.5 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
              >
                Download CSV Template
              </button>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-1 font-semibold text-gray-900">Step 2: Upload CSV</h3>
              <p className="mb-4 text-sm text-gray-500">Products are submitted for admin approval after upload.</p>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                  dragging
                    ? "scale-[1.01] border-orange-400 bg-orange-50"
                    : file
                      ? "border-green-400 bg-green-50"
                      : "border-gray-300 hover:border-orange-400 hover:bg-orange-50"
                }`}
              >
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(event) => handleFile(event.target.files[0])} />
                <div className="mb-4 text-5xl text-gray-400">CSV</div>
                <p className="font-semibold text-gray-700">{file ? file.name : "Drag and drop your CSV here"}</p>
                <p className="mt-1 text-sm text-gray-400">{file ? `${rows.length} rows parsed` : "or click to browse files"}</p>
              </div>

              <button
                onClick={uploadRows}
                disabled={!file || uploading || categories.length === 0}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Start Upload"}
              </button>
              {categories.length === 0 && (
                <p className="mt-2 text-xs text-red-600">No assigned categories found. Ask admin to assign categories before bulk upload.</p>
              )}
            </div>

            {rows.length > 0 && (
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Step 3: Pre-upload Check</h3>
                    <p className="text-sm text-gray-500">We validate every row before sending it. Invalid rows are skipped and listed in the result report.</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {uploadSummary.totalRows} rows
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: "Valid", value: uploadSummary.validRows, tone: "bg-green-50 text-green-700" },
                    { label: "Needs Fix", value: uploadSummary.invalidRows, tone: "bg-red-50 text-red-700" },
                    { label: "Duplicates", value: uploadSummary.duplicateRows, tone: "bg-amber-50 text-amber-700" },
                    { label: "Category Issues", value: uploadSummary.categoryErrors, tone: "bg-blue-50 text-blue-700" },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl px-4 py-3 ${item.tone}`}>
                      <p className="text-xs uppercase tracking-wide">{item.label}</p>
                      <p className="mt-1 text-2xl font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="grid grid-cols-[90px_1fr_120px] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>Row</span>
                    <span>Product</span>
                    <span>Status</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {rowDiagnostics.slice(0, 12).map((row) => (
                      <div key={row.rowNumber} className="border-t border-gray-100 px-4 py-3">
                        <div className="grid grid-cols-[90px_1fr_120px] gap-3">
                          <span className="text-sm font-medium text-gray-900">{row.rowNumber}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{row.title}</p>
                            {!row.isValid && (
                              <p className="mt-1 text-xs text-red-600">{row.issues.join(" | ")}</p>
                            )}
                          </div>
                          <div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                row.isValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                            >
                              {row.isValid ? "Ready" : "Fix row"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {rowDiagnostics.length > 12 && (
                  <p className="mt-3 text-xs text-gray-500">
                    Showing the first 12 rows here. The upload result report will include every row after submission.
                  </p>
                )}
              </div>
            )}

            {results.length > 0 && (
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Upload Result</h3>
                    <p className="text-sm text-gray-500">{successCount} success, {failedCount} failed</p>
                  </div>
                  {failedCount > 0 && (
                    <button onClick={downloadErrorReport} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                      Download Errors
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-auto rounded-lg border border-gray-100">
                  {results.map((result) => (
                    <div key={`${result.rowNumber}-${result.title}`} className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Row {result.rowNumber}: {result.title}</p>
                        {result.error && <p className="text-xs text-red-600">{result.error}</p>}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${result.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {result.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-fit rounded-xl bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <h3 className="mb-4 font-semibold text-gray-900">CSV Field Guide</h3>
            <div className="space-y-3">
              {fieldGuide.map((field) => (
                <div key={field.field} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="mb-0.5 flex items-center gap-2">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-orange-700">{field.field}</code>
                    {field.required && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">Required</span>}
                    <span className="text-xs text-gray-400">{field.type}</span>
                  </div>
                  <p className="text-xs text-gray-500">{field.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-yellow-50 p-3">
              <p className="text-xs font-medium text-yellow-800">Important</p>
              <p className="mt-1 text-xs text-yellow-700">Wrap text containing commas in double quotes. Separate multiple images with a vertical bar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
