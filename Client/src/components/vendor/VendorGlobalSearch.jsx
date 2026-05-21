import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Search } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";
import {
  buildVendorSearchSuggestions,
  getVendorSearchSubmitPath,
  vendorSearchTypes,
} from "../../utils/vendorResourceSearch";

export default function VendorGlobalSearch({
  searchTargets = [],
  canAccessPath,
  closeSidebarOnMobile,
}) {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () =>
      buildVendorSearchSuggestions(query, searchTargets, selectedType)
        .filter((item) => {
          const basePath = item.path.split("?")[0];
          return canAccessPath?.(basePath) ?? true;
        }),
    [canAccessPath, query, searchTargets, selectedType],
  );

  useClickOutside(searchRef, () => setFocused(false));

  const resetSearch = () => {
    setQuery("");
    setFocused(false);
  };

  const openPath = (path) => {
    navigate(path);
    resetSearch();
    closeSidebarOnMobile?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    openPath(getVendorSearchSubmitPath(value, suggestions, selectedType));
  };

  const hasDropdown = focused && query.trim();

  return (
    <form
      ref={searchRef}
      onSubmit={handleSubmit}
      className="relative mx-4 hidden max-w-2xl flex-1 items-center md:flex"
    >
      <label htmlFor="vendor-search-type" className="sr-only">Search type</label>
      <select
        id="vendor-search-type"
        value={selectedType}
        onChange={(event) => setSelectedType(event.target.value)}
        className="h-10 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 text-xs font-extrabold text-slate-600 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:focus:border-primary-700"
        aria-label="Search type"
      >
        {vendorSearchTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search orders, products, returns, vouchers..."
          className="h-10 w-full rounded-r-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-primary-700"
          aria-label="Search seller center"
        />
      </div>

      {hasDropdown ? (
        <div className="absolute left-0 right-0 top-12 z-40 max-h-[70vh] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="max-h-[70vh] overflow-y-auto py-2">
            {suggestions.length ? (
              <>
                <p className="px-4 pb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                  Seller center
                </p>
                {suggestions.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => openPath(item.path)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-primary-50 focus:bg-primary-50 focus:outline-none dark:hover:bg-primary-950/30 dark:focus:bg-primary-950/30"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-slate-950 dark:text-white">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {item.description || item.path}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {item.typeLabel || "Page"}
                      </span>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <div className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                No matching seller pages
              </div>
            )}
          </div>
        </div>
      ) : null}
    </form>
  );
}
