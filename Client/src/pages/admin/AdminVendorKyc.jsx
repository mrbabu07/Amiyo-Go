import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, RefreshCw, XCircle } from "lucide-react";
import { getAdminVendorKycQueue, reviewAdminVendorKyc } from "../../services/api";
import { Pagination } from "../../components/ui/data";

export default function AdminVendorKyc() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyVendorId, setBusyVendorId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const response = await getAdminVendorKycQueue({ status });
      setItems(response.data.data || []);
    } catch (error) {
      console.error("Failed to load KYC queue:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    setPage(1);
  }, [status]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const review = async (vendorId, nextStatus) => {
    const reason =
      nextStatus === "rejected"
        ? window.prompt("Reason for rejecting these KYC documents?")
        : "";

    if (reason === null) return;

    setBusyVendorId(vendorId);
    try {
      await reviewAdminVendorKyc(vendorId, { status: nextStatus, reason });
      await loadQueue();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to review KYC");
    } finally {
      setBusyVendorId(null);
    }
  };

  const renderDocument = (label, document) => {
    if (!document?.url) return null;

    return (
      <a
        href={document.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <FileText className="h-4 w-4" />
        {label}
      </a>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/admin"
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor KYC Review</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review submitted NID and trade license documents.
          </p>
        </div>
        <button
          onClick={loadQueue}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mb-4">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800">
            Loading KYC submissions...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800">
            No KYC submissions found.
          </div>
        ) : (
          paginatedItems.map((item) => {
            const documents = item.kyc?.documents || {};
            const vendorId = item.vendorId;

            return (
              <section
                key={vendorId}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.shopName}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {item.email || item.phone || "No contact saved"}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      {item.kyc?.status || "not_submitted"}
                    </span>
                  </div>

                  {item.kyc?.status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={busyVendorId === vendorId}
                        onClick={() => review(vendorId, "approved")}
                        className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        disabled={busyVendorId === vendorId}
                        onClick={() => review(vendorId, "rejected")}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {renderDocument("NID Front", documents.nidFront)}
                  {renderDocument("NID Back", documents.nidBack)}
                  {renderDocument("Trade License", documents.tradeLicense)}
                </div>

                {item.kyc?.notes && (
                  <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                    {item.kyc.notes}
                  </p>
                )}
              </section>
            );
          })
        )}
      </div>
      {!loading && items.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={items.length}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
