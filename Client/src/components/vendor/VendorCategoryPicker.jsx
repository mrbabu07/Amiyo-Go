import { useMemo, useState } from "react";
import { Check, ChevronRight, Search, Tags } from "lucide-react";

const normalizeId = (id) => (id ? id.toString() : "");

const buildPath = (category, byId) => {
  const path = [category];
  let parentId = normalizeId(category.parentId);
  const seen = new Set();

  while (parentId && byId.has(parentId) && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    path.unshift(parent);
    parentId = normalizeId(parent.parentId);
  }

  return path;
};

const levelLabel = (depth) => {
  if (depth === 0) return "Main category";
  if (depth === 1) return "Section";
  return "Subcategory";
};

const commissionLabel = (category) => {
  const rate = category?.effectiveCommissionRate ?? category?.commissionRate ?? 0;
  return Number(rate) > 0 ? `${rate}% commission` : "No commission";
};

export default function VendorCategoryPicker({
  categories = [],
  value,
  onChange,
  selectedCategory,
  vendorName,
}) {
  const [query, setQuery] = useState("");
  const [activeRoot, setActiveRoot] = useState("all");

  const categoryOptions = useMemo(() => {
    const byId = new Map(categories.map((item) => [normalizeId(item._id), item]));

    return categories
      .map((category) => {
        const path = buildPath(category, byId);
        const root = path[0] || category;
        const childCount = categories.filter(
          (item) => normalizeId(item.parentId) === normalizeId(category._id),
        ).length;

        return {
          ...category,
          rootId: normalizeId(root._id),
          rootName: root.name,
          path,
          pathLabel: path.map((item) => item.name).join(" > "),
          depth: path.length - 1,
          childCount,
        };
      })
      .sort(
        (a, b) =>
          a.rootName.localeCompare(b.rootName) ||
          a.pathLabel.localeCompare(b.pathLabel),
      );
  }, [categories]);

  const rootFilters = useMemo(() => {
    const roots = new Map();
    categoryOptions.forEach((category) => {
      if (!roots.has(category.rootId)) {
        roots.set(category.rootId, {
          id: category.rootId,
          name: category.rootName,
          count: 0,
        });
      }
      roots.get(category.rootId).count += 1;
    });

    return [...roots.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryOptions]);

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();

    return categoryOptions.filter((category) => {
      const matchesRoot = activeRoot === "all" || category.rootId === activeRoot;
      const matchesSearch =
        !search ||
        category.name.toLowerCase().includes(search) ||
        category.pathLabel.toLowerCase().includes(search) ||
        category.slug?.toLowerCase().includes(search);

      return matchesRoot && matchesSearch;
    });
  }, [activeRoot, categoryOptions, query]);

  const selectedMeta = categoryOptions.find(
    (category) => normalizeId(category._id) === normalizeId(value),
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <Tags className="h-5 w-5" />
              </span>
              <div>
                <label className="block text-sm font-semibold text-slate-950">
                  Product Category *
                </label>
                <p className="text-sm text-slate-500">
                  Choose the exact category where customers will find this item.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Seller
            </span>
            <span className="font-semibold text-slate-900">
              {vendorName || "Vendor store"}
            </span>
          </div>
        </div>

        {selectedMeta && (
          <div className="mt-4 rounded-lg border border-cyan-100 bg-cyan-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                  Selected category
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {selectedMeta.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-600">
                  {selectedMeta.path.map((item, index) => (
                    <span key={item._id} className="inline-flex items-center gap-1">
                      {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-800 ring-1 ring-cyan-100">
                {commissionLabel(selectedMeta)}
              </span>
            </div>
          </div>
        )}
      </div>

      <input
        className="sr-only"
        tabIndex={-1}
        required
        value={value || ""}
        onChange={() => {}}
        aria-label="Selected product category"
      />

      <div className="space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search category, section, or subcategory"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveRoot("all")}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              activeRoot === "all"
                ? "border-cyan-600 bg-cyan-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
            }`}
          >
            All ({categoryOptions.length})
          </button>
          {rootFilters.map((root) => (
            <button
              type="button"
              key={root.id}
              onClick={() => setActiveRoot(root.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activeRoot === root.id
                  ? "border-cyan-600 bg-cyan-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
              }`}
            >
              {root.name} ({root.count})
            </button>
          ))}
        </div>

        {categories.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No category access found for this vendor. Ask admin to approve category
            access from the vendor management page.
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No categories match your search.
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-200">
            <div className="divide-y divide-slate-100">
              {filteredOptions.map((category) => {
                const isSelected = normalizeId(category._id) === normalizeId(value);
                return (
                  <button
                    type="button"
                    key={category._id}
                    onClick={() => onChange(category._id)}
                    className={`flex w-full items-start gap-3 p-3 text-left transition ${
                      isSelected
                        ? "bg-cyan-50"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-cyan-600 bg-cyan-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">
                          {category.name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {levelLabel(category.depth)}
                        </span>
                        {category.childCount > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {category.childCount} child categories
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {category.pathLabel}
                      </span>
                    </span>

                    <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      {commissionLabel(category)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
