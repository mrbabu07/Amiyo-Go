import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const defaultPosition = [23.8103, 90.4125];

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position?.length === 2) {
      map.setView(position, map.getZoom());
    }
  }, [map, position]);

  return null;
}

export function ShopLocationMap({ lat, lng, shopName, address }) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      style={{ height: "320px", width: "100%", borderRadius: "12px" }}
      scrollWheelZoom={false}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[latitude, longitude]}>
        <Popup>
          <strong>{shopName}</strong>
          <br />
          {address}
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export function LocationPicker({
  defaultLat = defaultPosition[0],
  defaultLng = defaultPosition[1],
  onLocationChange,
}) {
  const initial = [
    Number.isFinite(Number(defaultLat)) ? Number(defaultLat) : defaultPosition[0],
    Number.isFinite(Number(defaultLng)) ? Number(defaultLng) : defaultPosition[1],
  ];
  const [position, setPosition] = useState(initial);

  useEffect(() => {
    setPosition(initial);
  }, [defaultLat, defaultLng]);

  function ClickHandler() {
    useMapEvents({
      click(event) {
        const { lat, lng } = event.latlng;
        setPosition([lat, lng]);
        onLocationChange?.({ lat, lng });
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: "400px", width: "100%", borderRadius: "12px" }}
      scrollWheelZoom={false}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <RecenterMap position={position} />
      <ClickHandler />
      <Marker
        position={position}
        draggable
        eventHandlers={{
          dragend(event) {
            const { lat, lng } = event.target.getLatLng();
            setPosition([lat, lng]);
            onLocationChange?.({ lat, lng });
          },
        }}
      />
    </MapContainer>
  );
}
