import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER = [23.8103, 90.4125];
const TILE_LAYERS = {
  street: {
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const extractAddressSuggestion = (payload = {}) => {
  const address = payload.address || {};
  const roadLine = [
    address.house_number,
    address.road || address.pedestrian || address.footway,
    address.neighbourhood || address.suburb || address.quarter,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    formattedAddress: payload.display_name || "",
    address: roadLine || payload.display_name || "",
    area:
      address.neighbourhood ||
      address.suburb ||
      address.quarter ||
      address.village ||
      address.hamlet ||
      address.road ||
      "",
    union: address.village || address.hamlet || "",
    upazila:
      address.municipality ||
      address.county ||
      address.city_district ||
      address.town ||
      "",
    district:
      address.state_district ||
      address.county ||
      address.city ||
      address.town ||
      "",
    city: address.city || address.town || address.state_district || "",
    division: String(address.state || "").replace(/\s+Division$/i, ""),
    zipCode: address.postcode || "",
    country: address.country || "",
  };
};

export default function AddressMapPicker({
  latitude,
  longitude,
  onChange,
  onAddressResolved,
  className = "",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState("street");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const reverseGeocode = async ({ latitude: lat, longitude: lng }) => {
    if (!onAddressResolved) return;

    try {
      setResolving(true);
      setMessage("");
      const params = new URLSearchParams({
        format: "jsonv2",
        lat: String(lat),
        lon: String(lng),
        addressdetails: "1",
        zoom: "18",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.address) {
        setMessage("Pin saved. Address suggestion was not available. Keep your typed address as the delivery address.");
        return;
      }
      onAddressResolved({
        latitude: lat,
        longitude: lng,
        ...extractAddressSuggestion(payload),
      });
      setMessage("Pin saved. Address suggestion is shown below the map; your typed fields were not changed.");
    } catch (error) {
      console.error("Failed to resolve map address:", error);
      setMessage("Pin saved. Address lookup is unavailable right now.");
    } finally {
      setResolving(false);
    }
  };

  const commitLocation = (position) => {
    const next = {
      latitude: Number(position.lat.toFixed(6)),
      longitude: Number(position.lng.toFixed(6)),
    };
    markerRef.current?.setLatLng([next.latitude, next.longitude]);
    onChange?.(next);
    reverseGeocode(next);
  };

  const addTileLayer = (style, map = mapRef.current) => {
    if (!map) return;
    const config = TILE_LAYERS[style] || TILE_LAYERS.street;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 19,
    }).addTo(map);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const lat = Number(latitude) || DEFAULT_CENTER[0];
    const lng = Number(longitude) || DEFAULT_CENTER[1];
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: latitude && longitude ? 15 : 11,
      scrollWheelZoom: false,
    });

    addTileLayer("street", map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

    marker.on("dragend", () => commitLocation(marker.getLatLng()));
    map.on("click", (event) => commitLocation(event.latlng));
    map.whenReady(() => setMapReady(true));

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => map.invalidateSize(), 0);
    setTimeout(() => map.invalidateSize(), 250);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!mapRef.current || !markerRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 14));
  }, [latitude, longitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Your browser does not support current location.");
      return;
    }

    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        mapRef.current?.setView([next.lat, next.lng], 16);
        commitLocation(next);
        setLocating(false);
      },
      (error) => {
        console.error("Failed to read current location:", error);
        setMessage("Could not use current location. Please click your delivery point on the map.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const setPinAtCenter = () => {
    if (!mapRef.current) return;
    commitLocation(mapRef.current.getCenter());
  };

  const changeMapStyle = (style) => {
    setMapStyle(style);
    addTileLayer(style);
  };

  const searchLocation = async (event) => {
    event?.preventDefault?.();
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setMessage("Type an area, road, landmark, or district name first.");
      return;
    }

    try {
      setSearching(true);
      setMessage("");
      const params = new URLSearchParams({
        format: "jsonv2",
        q: query,
        countrycodes: "bd",
        addressdetails: "1",
        limit: "6",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
        setSearchResults([]);
        setMessage("No location found. Try a nearby area, road, or district name.");
        return;
      }
      setSearchResults(rows);
      setMessage("Select a search result below, then adjust the pin if needed.");
    } catch (error) {
      console.error("Failed to search location:", error);
      setMessage("Location search is unavailable right now. You can still tap the map.");
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    mapRef.current?.setView([lat, lng], 16);
    markerRef.current?.setLatLng([lat, lng]);
    const next = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      ...extractAddressSuggestion(result),
    };
    onChange?.({ latitude: next.latitude, longitude: next.longitude });
    onAddressResolved?.(next);
    setSearchResults([]);
    setMessage("Location selected. You can drag the marker or tap another point to adjust.");
  };

  const clearPin = () => {
    onChange?.({ latitude: "", longitude: "" });
    setSearchResults([]);
    setMessage("Pin cleared. Search or tap the map to set a new delivery point.");
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng(DEFAULT_CENTER);
      mapRef.current.setView(DEFAULT_CENTER, 11);
    }
  };

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-gray-100 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Set exact delivery pin</p>
            <p className="text-xs text-gray-500">
              Search, switch satellite view, tap anywhere on the map, or drag the marker.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex">
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="inline-flex items-center justify-center rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700 transition hover:border-primary-300 hover:bg-primary-100 disabled:cursor-wait disabled:opacity-70"
            >
              {locating ? "Locating..." : "Use current location"}
            </button>
            <button
              type="button"
              onClick={setPinAtCenter}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              Pin map center
            </button>
          </div>
          </div>

          <form onSubmit={searchLocation} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search area, road, landmark, district..."
              className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="submit"
              disabled={searching}
              className="min-h-11 rounded-xl bg-primary-600 px-5 text-sm font-black text-white transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
              {searchResults.map((result) => (
                <button
                  key={`${result.place_id}-${result.lat}-${result.lon}`}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-800 transition hover:bg-white hover:text-primary-700"
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {Object.entries(TILE_LAYERS).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => changeMapStyle(key)}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  mapStyle === key
                    ? "bg-primary-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:bg-primary-50"
                }`}
              >
                {config.label} view
              </button>
            ))}
            <button
              type="button"
              onClick={clearPin}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
            >
              Clear / change pin
            </button>
          </div>
        </div>
        <div className="relative bg-slate-100">
          {!mapReady && (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
              Loading map...
            </div>
          )}
          <div ref={containerRef} className="h-80 min-h-80 w-full sm:h-96" />
          <div className="pointer-events-none absolute left-3 top-3 z-[401] rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm">
            Tap map to change pin
          </div>
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-[401] -translate-x-1/2 rounded-full bg-gray-950/85 px-4 py-2 text-xs font-black text-white shadow-lg">
            Move map, then press "Pin map center"
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {latitude && longitude
            ? `Selected: ${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
            : "No delivery pin selected yet. Please tap the map for accurate delivery."}
        </p>
        <p>{resolving ? "Reading address from map..." : "Map tiles use free OpenStreetMap."}</p>
      </div>
      {message && (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {message}
        </p>
      )}
    </div>
  );
}
