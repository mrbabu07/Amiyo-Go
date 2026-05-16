import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  createNewsletterBroadcast,
  getNewsletterBroadcasts,
  getNewsletterSubscribers,
  sendNewsletterBroadcast,
} from "../../services/api";

const emptyForm = {
  subject: "",
  previewText: "",
  html: "",
  scheduledAt: "",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const statusClass = (status) => {
  const map = {
    sent: "bg-green-50 text-green-700 border-green-200",
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    sending: "bg-orange-50 text-orange-700 border-orange-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    partial_failed: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[status] || "bg-gray-50 text-gray-700 border-gray-200";
};

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const activeSubscribers = useMemo(
    () => subscribers.filter((subscriber) => subscriber.isActive !== false).length,
    [subscribers],
  );

  const loadData = async () => {
    try {
      const [subscriberRes, broadcastRes] = await Promise.all([
        getNewsletterSubscribers({ limit: 100 }),
        getNewsletterBroadcasts({ limit: 50 }),
      ]);
      setSubscribers(subscriberRes.data.data || []);
      setBroadcasts(broadcastRes.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load newsletter data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitBroadcast = async (sendNow = false) => {
    if (!form.subject.trim() || !form.html.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    setSaving(true);
    try {
      await createNewsletterBroadcast({
        ...form,
        scheduledAt: form.scheduledAt || null,
        sendNow,
      });
      toast.success(sendNow ? "Newsletter sent" : "Newsletter saved");
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save newsletter");
    } finally {
      setSaving(false);
    }
  };

  const sendExisting = async (id) => {
    const loadingToast = toast.loading("Sending newsletter...");
    try {
      await sendNewsletterBroadcast(id);
      toast.success("Newsletter sent", { id: loadingToast });
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send newsletter", { id: loadingToast });
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading newsletter workspace...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Broadcasts</h1>
          <p className="mt-1 text-sm text-gray-500">{activeSubscribers} active subscribers</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Compose</h2>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                SMTP
              </span>
            </div>

            <div className="space-y-4">
              <input
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="Subject"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              <input
                value={form.previewText}
                onChange={(event) => updateField("previewText", event.target.value)}
                placeholder="Preview text"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              <textarea
                value={form.html}
                onChange={(event) => updateField("html", event.target.value)}
                placeholder="<h2>Spring offers</h2><p>Your message...</p>"
                rows={12}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) => updateField("scheduledAt", event.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => submitBroadcast(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={saving || !form.scheduledAt}
                    onClick={() => submitBroadcast(false)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Schedule
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => submitBroadcast(true)}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                  >
                    Send Now
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Subscribers</h2>
            <div className="mt-4 max-h-[560px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="border-b px-2 py-2">Email</th>
                    <th className="border-b px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber._id} className="border-b last:border-0">
                      <td className="px-2 py-2 text-gray-900">{subscriber.email}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${subscriber.isActive === false ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-700"}`}>
                          {subscriber.isActive === false ? "Unsubscribed" : "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Broadcasts</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="border-b px-3 py-2">Subject</th>
                  <th className="border-b px-3 py-2">Status</th>
                  <th className="border-b px-3 py-2">Schedule</th>
                  <th className="border-b px-3 py-2">Sent</th>
                  <th className="border-b px-3 py-2">Opens</th>
                  <th className="border-b px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((broadcast) => (
                  <tr key={broadcast._id} className="border-b last:border-0">
                    <td className="px-3 py-3 font-medium text-gray-900">{broadcast.subject}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(broadcast.status)}`}>
                        {broadcast.status || "draft"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{formatDate(broadcast.scheduledAt)}</td>
                    <td className="px-3 py-3 text-gray-600">{broadcast.sentCount || 0}/{broadcast.recipientCount || 0}</td>
                    <td className="px-3 py-3 text-gray-600">{broadcast.openCount || 0}</td>
                    <td className="px-3 py-3 text-right">
                      {!["sent", "sending"].includes(broadcast.status) && (
                        <button
                          type="button"
                          onClick={() => sendExisting(broadcast._id)}
                          className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                        >
                          Send
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
