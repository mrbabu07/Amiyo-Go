import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const csvTemplate = `title,price,stock,category,description,images
"Men's Casual Shirt",850,100,Fashion,"High quality cotton shirt","https://example.com/img1.jpg"
"Women's Kurti Set",1200,50,Fashion,"Beautiful ethnic wear","https://example.com/img2.jpg"`;

const fieldGuide = [
  { field: "title", required: true, type: "Text", desc: "Product name (max 200 chars)" },
  { field: "price", required: true, type: "Number", desc: "Price in BDT (e.g. 850)" },
  { field: "stock", required: true, type: "Number", desc: "Available quantity" },
  { field: "category", required: true, type: "Text", desc: "Must match an approved category" },
  { field: "description", required: false, type: "Text", desc: "Product details (max 2000 chars)" },
  { field: "images", required: false, type: "URL", desc: "Image URLs separated by |" },
  { field: "sku", required: false, type: "Text", desc: "Your internal product code" },
  { field: "brand", required: false, type: "Text", desc: "Brand name" },
];

const mockHistory = [
  { date: "2026-03-01 14:30", file: "products_march.csv", total: 24, success: 22, failed: 2, status: "completed" },
  { date: "2026-02-15 09:12", file: "new_arrivals.csv", total: 15, success: 15, failed: 0, status: "completed" },
  { date: "2026-01-28 16:45", file: "inventory_update.csv", total: 50, success: 48, failed: 2, status: "completed" },
];

export default function VendorBulkUpload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith(".csv")) { toast.error("Please upload a CSV file"); return; }
    setFile(f);
    setDone(false);
    setProgress(0);
    toast.success(`"${f.name}" ready to upload`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const startUpload = () => {
    if (!file) { toast.error("Please select a CSV file first"); return; }
    setUploading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setDone(true);
          toast.success("Upload complete! 22 products added successfully.");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_upload_template.csv";
    a.click();
    toast.success("Template downloaded!");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" toastOptions={{ duration: 2500, style: { background: "#363636", color: "#fff" } }} />

      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/vendor/products" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bulk Product Upload</h1>
              <p className="text-sm text-gray-500">Add multiple products at once using a CSV file</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Step guide */}
        <div className="flex items-center gap-0 mb-8">
          {["Download Template", "Fill in Products", "Upload CSV", "Review & Confirm"].map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${i <= 2 ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"}`}>{i + 1}</div>
                <span className="text-xs text-center text-gray-500 hidden sm:block">{step}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mx-1 ${i < 2 ? "bg-orange-300" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main upload area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 — Template */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Step 1: Download Template</h3>
              <p className="text-sm text-gray-500 mb-4">Use our CSV template to ensure your data is formatted correctly.</p>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-white border-2 border-orange-400 text-orange-600 hover:bg-orange-50 px-5 py-2.5 rounded-xl font-medium text-sm transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV Template
              </button>
            </div>

            {/* Step 2 — Upload */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-1">Step 2: Upload Your CSV</h3>
              <p className="text-sm text-gray-500 mb-4">Max 500 products per upload. Max file size: 5MB.</p>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                  dragging ? "border-orange-400 bg-orange-50 scale-[1.01]" :
                  file ? "border-green-400 bg-green-50" :
                  "border-gray-300 hover:border-orange-400 hover:bg-orange-50"
                }`}
              >
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <div className="text-4xl mb-3">📄</div>
                    <p className="font-semibold text-green-700">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-5xl mb-4">☁️</div>
                    <p className="font-semibold text-gray-700">Drag & drop your CSV here</p>
                    <p className="text-sm text-gray-400 mt-1">or click to browse files</p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {(uploading || done) && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{done ? "Upload complete!" : "Uploading…"}</span>
                    <span className="font-medium text-orange-600">{progress}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-orange-500"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {done && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                      ✅ <strong>22 products</strong> added successfully. <strong>2</strong> rows had errors — <a href="#" className="underline">download error report</a>.
                    </div>
                  )}
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={startUpload}
                disabled={!file || uploading}
                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Start Upload
                  </>
                )}
              </button>
            </div>

            {/* Upload History */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Upload History</h3>
              <div className="space-y-3">
                {mockHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-sm">📄</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{h.file}</p>
                        <p className="text-xs text-gray-400">{h.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-green-600 font-medium">{h.success} ok</span>
                        {h.failed > 0 && <span className="text-red-500 ml-2">{h.failed} err</span>}
                      </p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Done</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Field guide */}
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">📋 CSV Field Guide</h3>
            <div className="space-y-3">
              {fieldGuide.map((f) => (
                <div key={f.field} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-xs bg-gray-100 text-orange-700 px-1.5 py-0.5 rounded font-mono">{f.field}</code>
                    {f.required && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Required</span>}
                    <span className="text-xs text-gray-400">{f.type}</span>
                  </div>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded-xl">
              <p className="text-xs text-yellow-800 font-medium">💡 Important</p>
              <p className="text-xs text-yellow-600 mt-1">Wrap text with commas in double quotes. Image URLs must start with https://</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
