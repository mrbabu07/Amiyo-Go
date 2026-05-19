const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Amiyo-Go-Marketplace/1.0";

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Geocoding request failed:", error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const geocodeAddress = async (addressString) => {
  const query = String(addressString || "").trim();
  if (!query) return null;

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
  });
  const rows = await fetchJson(`${NOMINATIM_BASE_URL}/search?${params.toString()}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.lat || !row?.lon) return null;

  return {
    lat: Number(row.lat),
    lng: Number(row.lon),
    formattedAddress: row.display_name || query,
  };
};

const reverseGeocode = async (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "json",
  });
  const row = await fetchJson(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`);
  if (!row?.display_name) return null;

  return {
    formattedAddress: row.display_name,
  };
};

module.exports = {
  geocodeAddress,
  reverseGeocode,
};
