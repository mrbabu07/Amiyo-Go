import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER = [23.8103, 90.4125];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function AddressMapPicker({ latitude, longitude, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const lat = Number(latitude) || DEFAULT_CENTER[0];
    const lng = Number(longitude) || DEFAULT_CENTER[1];
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: latitude && longitude ? 15 : 11,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    const updateLocation = (position) => {
      const next = {
        latitude: Number(position.lat.toFixed(6)),
        longitude: Number(position.lng.toFixed(6)),
      };
      marker.setLatLng([next.latitude, next.longitude]);
      onChange?.(next);
    };

    marker.on("dragend", () => updateLocation(marker.getLatLng()));
    map.on("click", (event) => updateLocation(event.latlng));

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!mapRef.current || !markerRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 14));
  }, [latitude, longitude]);

  return (
    <div>
      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-lg border border-gray-200" />
      <p className="mt-2 text-xs text-gray-500">
        Click the map or drag the marker to save a delivery pin. Map tiles use free OpenStreetMap.
      </p>
    </div>
  );
}
