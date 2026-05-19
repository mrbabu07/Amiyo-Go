import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import {
  getAdminSearchResourceDetail,
  searchAdminResources,
} from '../../services/api';
import {
  AdminQueueDetailSection,
  AdminQueueDrawer,
  AdminQueueKeyValue,
} from './AdminQueuePrimitives';
import {
  buildAdminSearchSuggestions,
  getAdminSearchSubmitPath,
} from '../../utils/adminResourceSearch';

const resourceLabels = {
  order: 'Order',
  vendor: 'Vendor',
  product: 'Product',
  customer: 'Customer',
  return: 'Return',
  support: 'Support',
};

const badgeToneClass = {
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
};

const ResourceBadge = ({ badge }) => (
  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${badgeToneClass[badge.tone] || badgeToneClass.neutral}`}>
    {badge.label}
  </span>
);

const DetailBody = ({ loading, error, detail }) => {
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading details
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        {error}
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="space-y-4">
      {(detail.sections || []).map((section) => (
        <AdminQueueDetailSection key={section.title} title={section.title}>
          {(section.items || []).map((item) => (
            <AdminQueueKeyValue key={`${section.title}-${item.label}`} label={item.label} value={item.value} />
          ))}
        </AdminQueueDetailSection>
      ))}
    </div>
  );
};

export default function AdminGlobalSearch({
  searchTargets,
  canAccessPath,
  closeSidebarOnMobile,
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const requestRef = useRef(0);

  const routeMatches = useMemo(
    () => buildAdminSearchSuggestions(query, searchTargets)
      .filter((item) => {
        const basePath = item.path.split('?')[0];
        return canAccessPath(basePath) || item.path === '/';
      }),
    [canAccessPath, query, searchTargets],
  );

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResources([]);
      setLoading(false);
      return undefined;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const response = await searchAdminResources({ q: value, limit: 4, totalLimit: 18 });
        if (requestRef.current === requestId) {
          setResources(response.data?.data?.results || []);
        }
      } catch {
        if (requestRef.current === requestId) setResources([]);
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const resetSearch = () => {
    setQuery('');
    setResources([]);
  };

  const openResource = async (result) => {
    setDrawerOpen(true);
    setSelectedDetail(result);
    setDetailError('');
    setDetailLoading(true);

    try {
      const response = await getAdminSearchResourceDetail(result.type, result.id);
      setSelectedDetail(response.data?.data || result);
    } catch (error) {
      setDetailError(error?.response?.data?.error || 'Failed to load this resource');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    if (resources[0]) {
      openResource(resources[0]);
      return;
    }

    navigate(getAdminSearchSubmitPath(value, routeMatches));
    resetSearch();
    closeSidebarOnMobile?.();
  };

  const hasDropdown = query.trim() && (resources.length > 0 || routeMatches.length > 0 || loading);

  return (
    <>
      <form onSubmit={handleSubmit} className="relative mx-4 hidden max-w-2xl flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search orders, vendors, products, customers, returns, tickets..."
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:border-orange-700"
          aria-label="Search admin resources"
        />

        {hasDropdown ? (
          <div className="absolute left-0 right-0 top-12 z-40 max-h-[70vh] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="max-h-[70vh] overflow-y-auto py-2">
              {loading ? (
                <div className="flex items-center px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching marketplace records
                </div>
              ) : null}

              {resources.length ? (
                <div className="px-2">
                  <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                    Resources
                  </p>
                  {resources.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => openResource(result)}
                      className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-orange-50 focus:bg-orange-50 focus:outline-none dark:hover:bg-orange-950/30 dark:focus:bg-orange-950/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">
                          {result.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                          {result.subtitle || result.id}
                        </span>
                        {result.badges?.length ? (
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {result.badges.map((badge) => <ResourceBadge key={`${result.id}-${badge.label}`} badge={badge} />)}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {resourceLabels[result.type] || result.type}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {routeMatches.length ? (
                <div className="mt-2 border-t border-slate-100 px-2 pt-2 dark:border-slate-800">
                  <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">
                    Admin pages
                  </p>
                  {routeMatches.slice(0, 4).map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        resetSearch();
                        closeSidebarOnMobile?.();
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-900 dark:text-white">{item.name}</span>
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{item.description || item.path}</span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              ) : null}

              {!loading && !resources.length && !routeMatches.length ? (
                <div className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  No matching admin resources
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </form>

      <AdminQueueDrawer
        open={drawerOpen}
        title={selectedDetail?.title || 'Resource detail'}
        subtitle={selectedDetail?.subtitle}
        badges={selectedDetail?.badges || []}
        onClose={() => setDrawerOpen(false)}
        footer={selectedDetail?.actions?.length ? (
          <div className="flex flex-wrap justify-end gap-2">
            {selectedDetail.actions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                onClick={() => {
                  setDrawerOpen(false);
                  resetSearch();
                  closeSidebarOnMobile?.();
                }}
                className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                  action.variant === 'primary'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      >
        <DetailBody loading={detailLoading} error={detailError} detail={selectedDetail} />
      </AdminQueueDrawer>
    </>
  );
}
