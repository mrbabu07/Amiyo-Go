import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Loading from "../../components/Loading";
import {
  createAdminBanner,
  deleteAdminBanner,
  getAdminBanners,
  updateAdminBanner,
} from "../../services/api";

const defaultForm = {
  title: "",
  subtitle: "",
  placement: "home_hero",
  linkUrl: "",
  ctaLabel: "",
  badgeText: "",
  status: "active",
  position: 0,
  activeFrom: "",
  activeTo: "",
  image: null,
  mobileImage: null,
};

const placements = [
  ["home_hero", "Home carousel"],
  ["home_secondary", "Home secondary"],
  ["category_banner", "Category banner"],
  ["shop_directory", "Shop directory"],
  ["checkout_trust", "Checkout trust"],
];

const statusTone = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  scheduled: "border-sky-200 bg-sky-50 text-sky-700",
  inactive: "border-slate-200 bg-slate-50 text-slate-600",
};

const getId = (item) => item?._id?.toString?.() || item?._id || item?.id || "";

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
};

const buildFormData = (form) => {
  const formData = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    formData.append(key, value);
  });
  return formData;
};

export default function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ placement: "", status: "all", search: "" });
  const [form, setForm] = useState(defaultForm);

  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((item) => item.status === "active").length;
    const scheduled = banners.filter((item) => item.status === "scheduled").length;
    const placementsCount = new Set(banners.map((item) => item.placement)).size;
    return { total, active, scheduled, placementsCount };
  }, [banners]);

  useEffect(() => {
    loadBanners();
  }, [filters.placement, filters.status]);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const response = await getAdminBanners({
        placement: filters.placement,
        status: filters.status,
        search: filters.search,
        limit: 100,
      });
      setBanners(response.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm(defaultForm);
  };

  const editBanner = (banner) => {
    setEditing(banner);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      placement: banner.placement || "home_hero",
      linkUrl: banner.linkUrl || "",
      ctaLabel: banner.ctaLabel || "",
      badgeText: banner.badgeText || "",
      status: banner.status || "active",
      position: Number(banner.position || 0),
      activeFrom: toDateInput(banner.activeFrom),
      activeTo: toDateInput(banner.activeTo),
      image: null,
      mobileImage: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveBanner = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("Banner title is required");
    if (!editing && !form.image) return toast.error("Upload a banner image");

    setSaving(true);
    try {
      const payload = buildFormData(form);
      if (editing) {
        await updateAdminBanner(getId(editing), payload);
        toast.success("Banner updated");
      } else {
        await createAdminBanner(payload);
        toast.success("Banner created");
      }
      resetForm();
      await loadBanners();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const removeBanner = async (banner) => {
    if (!confirm(`Delete banner "${banner.title}"?`)) return;
    try {
      await deleteAdminBanner(getId(banner));
      toast.success("Banner deleted");
      await loadBanners();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete banner");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Marketing control</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Banner Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Upload, schedule, and hide frontend banners from one admin workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Plus className="h-4 w-4" />
            New banner
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Total banners", stats.total],
            ["Active", stats.active],
            ["Scheduled", stats.scheduled],
            ["Placements", stats.placementsCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={saveBanner} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-black text-slate-950 dark:text-white">{editing ? "Edit banner" : "Create banner"}</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Title
            <input className="input-control" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Subtitle
            <input className="input-control" value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Placement
            <select className="input-control" value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value })}>
              {placements.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            CTA label
            <input className="input-control" value={form.ctaLabel} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Link URL
            <input className="input-control" value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Badge text
            <input className="input-control" value={form.badgeText} onChange={(event) => setForm({ ...form, badgeText: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Status
            <select className="input-control" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Position
            <input className="input-control" type="number" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Active from
            <input className="input-control" type="datetime-local" value={form.activeFrom} onChange={(event) => setForm({ ...form, activeFrom: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Active to
            <input className="input-control" type="datetime-local" value={form.activeTo} onChange={(event) => setForm({ ...form, activeTo: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Desktop image
            <input className="input-control" type="file" accept="image/*" onChange={(event) => setForm({ ...form, image: event.target.files?.[0] || null })} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Mobile image
            <input className="input-control" type="file" accept="image/*" onChange={(event) => setForm({ ...form, mobileImage: event.target.files?.[0] || null })} />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {editing ? "Update banner" : "Create banner"}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              className="input-control pl-9"
              placeholder="Search banners"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadBanners();
              }}
            />
          </label>
          <select className="input-control" value={filters.placement} onChange={(event) => setFilters({ ...filters, placement: event.target.value })}>
            <option value="">All placements</option>
            {placements.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="input-control" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="button" onClick={loadBanners} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Search
          </button>
        </div>

        {banners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No banners found.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {banners.map((banner) => (
              <article key={getId(banner)} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-[3/1] bg-slate-100">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
                  )}
                  <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone[banner.status] || statusTone.inactive}`}>
                    {banner.status || "inactive"}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">{banner.placement}</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{banner.title}</h3>
                      {banner.subtitle && <p className="mt-1 text-sm text-slate-500">{banner.subtitle}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editBanner(banner)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeBanner(banner)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    <span>Position {banner.position || 0}</span>
                    {banner.ctaLabel && <span>{banner.ctaLabel}</span>}
                    {banner.linkUrl && <span className="truncate">{banner.linkUrl}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
