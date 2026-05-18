import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileUp,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { getMyVendorKyc, submitVendorKyc } from "../../services/api";

const documents = [
  {
    key: "nidFront",
    label: "NID front",
    description: "Clear photo of the front side of the owner's national ID.",
    required: true,
  },
  {
    key: "nidBack",
    label: "NID back",
    description: "Clear photo of the back side of the owner's national ID.",
    required: true,
  },
  {
    key: "tradeLicense",
    label: "Trade license",
    description: "Business trade license or equivalent registration document.",
    required: false,
  },
];

const statusMeta = {
  approved: {
    label: "Verified",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
    message: "Your seller verification is approved. Keep documents updated if ownership changes.",
  },
  pending: {
    label: "In review",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock3,
    message: "Admin is reviewing your latest submission. You can resubmit updated files if needed.",
  },
  rejected: {
    label: "Needs resubmission",
    tone: "border-rose-200 bg-rose-50 text-rose-700",
    icon: XCircle,
    message: "Review the rejection note and upload corrected documents.",
  },
  not_submitted: {
    label: "Not submitted",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    icon: AlertCircle,
    message: "Upload the required documents so admin can verify your seller account.",
  },
};

const getDocumentName = (kyc, key) =>
  kyc?.documents?.[key]?.originalName || kyc?.documents?.[key]?.filename || "";

export default function VendorKyc() {
  const [kyc, setKyc] = useState(null);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState({
    nidFront: null,
    nidBack: null,
    tradeLicense: null,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadKyc = async () => {
    setLoading(true);
    try {
      const response = await getMyVendorKyc();
      setKyc(response.data.data);
      setNotes(response.data.data?.notes || "");
    } catch (error) {
      console.error("Failed to load KYC:", error);
      toast.error("Failed to load KYC status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKyc();
  }, []);

  const handleFileChange = (event) => {
    const { name, files: inputFiles } = event.target;
    setFiles((prev) => ({ ...prev, [name]: inputFiles?.[0] || null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!files.nidFront && !files.nidBack && !files.tradeLicense) {
      toast.error("Upload at least one document before submitting");
      return;
    }

    const formData = new FormData();
    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });
    formData.append("notes", notes);

    setSubmitting(true);
    try {
      const response = await submitVendorKyc(formData);
      setKyc(response.data.data);
      toast.success("KYC submitted for review");
      setFiles({ nidFront: null, nidBack: null, tradeLicense: null });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = kyc?.status || "not_submitted";
  const meta = statusMeta[currentStatus] || statusMeta.not_submitted;
  const StatusIcon = meta.icon;
  const uploadedCount = useMemo(
    () => documents.filter((document) => files[document.key] || getDocumentName(kyc, document.key)).length,
    [files, kyc],
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-3 text-orange-700">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Vendor verification</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-950">KYC Documents</h1>
                <p className="text-sm text-slate-600">Upload owner and business documents for admin review.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadKyc}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <section className={`rounded-lg border p-5 shadow-sm ${meta.tone}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <StatusIcon className="mt-0.5 h-5 w-5" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide">Current status</p>
                <h2 className="mt-1 text-xl font-bold">{loading ? "Loading..." : meta.label}</h2>
                <p className="mt-1 text-sm">{meta.message}</p>
              </div>
            </div>
            <span className="w-max rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
              {uploadedCount}/{documents.length} document slots filled
            </span>
          </div>
          {kyc?.reviewReason && (
            <p className="mt-4 rounded-md border border-rose-200 bg-white p-3 text-sm font-semibold text-rose-700">
              Admin note: {kyc.reviewReason}
            </p>
          )}
        </section>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Document cards</h2>
                <p className="text-sm text-slate-600">Replace only the files that need updates. Existing files remain attached.</p>
              </div>
              <span className="w-max rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Image or PDF, up to 8MB
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {documents.map((document) => {
                const selectedFile = files[document.key];
                const existingName = getDocumentName(kyc, document.key);
                const filled = Boolean(selectedFile || existingName);

                return (
                  <label
                    key={document.key}
                    className={`flex cursor-pointer flex-col rounded-lg border p-4 transition hover:bg-slate-50 ${
                      filled ? "border-emerald-200 bg-emerald-50/40" : "border-dashed border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
                          filled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {filled ? <FileCheck2 className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-950">{document.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{document.description}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        document.required ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {document.required ? "Required" : "Optional"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {selectedFile?.name || existingName || "Choose file"}
                      </p>
                      {selectedFile && <p className="mt-1 text-xs text-emerald-700">Ready to submit</p>}
                      {!selectedFile && existingName && <p className="mt-1 text-xs text-slate-500">Already uploaded</p>}
                    </div>

                    <input
                      type="file"
                      name={document.key}
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                );
              })}
            </div>

            <label className="mt-5 block text-sm">
              <span className="font-semibold text-slate-700">Reviewer notes</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="Optional note for the reviewer"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-950">Review checklist</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {[
                  "NID text and photo are readable.",
                  "Business name matches your shop or owner details.",
                  "Files are current, uncropped, and not password protected.",
                  "Bank or mobile finance details are already saved in settings.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-950">What happens next</h2>
              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                {["Admin reviews your files.", "You receive approval or a correction note.", "Approved sellers can keep operating without KYC blockers."].map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}
