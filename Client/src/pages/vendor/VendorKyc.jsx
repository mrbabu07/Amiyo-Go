import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FileUp, ShieldCheck } from "lucide-react";
import { getMyVendorKyc, submitVendorKyc } from "../../services/api";

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-orange-100 p-3 text-orange-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KYC Documents</h1>
            <p className="text-sm text-gray-600">
              Upload NID and trade license files for admin review.
            </p>
          </div>
        </div>

        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Current Status
              </p>
              <p className="mt-1 text-xl font-bold capitalize text-gray-900">
                {loading ? "Loading..." : currentStatus.replace("_", " ")}
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              {currentStatus}
            </span>
          </div>
          {kyc?.reviewReason && (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {kyc.reviewReason}
            </p>
          )}
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4">
            {[
              ["nidFront", "NID Front"],
              ["nidBack", "NID Back"],
              ["tradeLicense", "Trade License"],
            ].map(([name, label]) => (
              <label
                key={name}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-dashed border-gray-300 p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FileUp className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">Image or PDF, up to 8MB</p>
                  </div>
                </div>
                <span className="max-w-[180px] truncate text-sm text-gray-500">
                  {files[name]?.name || kyc?.documents?.[name]?.originalName || "Choose file"}
                </span>
                <input
                  type="file"
                  name={name}
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ))}

            <label className="block text-sm">
              <span className="font-medium text-gray-700">Notes</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="Optional note for the reviewer"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit KYC"}
          </button>
        </form>
      </div>
    </div>
  );
}
