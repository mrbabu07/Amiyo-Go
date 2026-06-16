const DEPLOYED_API_URL = "https://amiyo-go-server.vercel.app/api";
const LOCAL_API_PORT = 5000;

const trimTrailingSlash = (value) => String(value || "").trim().replace(/\/+$/, "");

const isProduction = () => import.meta.env.MODE === "production" || import.meta.env.PROD;

export const getApiBaseUrl = () => {
  const raw = trimTrailingSlash(import.meta.env.VITE_API_URL);

  if (!raw) {
    return isProduction() ? DEPLOYED_API_URL : `http://localhost:${LOCAL_API_PORT}/api`;
  }

  if (isProduction() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(raw)) {
    return DEPLOYED_API_URL;
  }

  return raw.endsWith("/api") ? raw : `${raw}/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export const toApiUrl = (path = "") => {
  const value = String(path || "").trim();
  if (!value) return API_BASE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value.startsWith("/api/")
    ? value.slice(4)
    : value.startsWith("/")
      ? value
      : `/${value}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const toAssetUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw || /^(data:|blob:)/i.test(raw)) return raw;

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/uploads(\/|$)/i.test(raw)) {
    try {
      const url = new URL(raw);
      return `${API_ORIGIN}${url.pathname}${url.search}${url.hash}`;
    } catch {
      return raw.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, API_ORIGIN);
    }
  }

  if (raw.startsWith("/uploads/")) return `${API_ORIGIN}${raw}`;
  if (raw.startsWith("uploads/")) return `${API_ORIGIN}/${raw}`;

  return raw;
};

export const normalizeAssetUrlsInData = (value, seen = new WeakSet()) => {
  if (typeof value === "string") return toAssetUrl(value);
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = normalizeAssetUrlsInData(item, seen);
    });
    return value;
  }

  Object.keys(value).forEach((key) => {
    value[key] = normalizeAssetUrlsInData(value[key], seen);
  });
  return value;
};
