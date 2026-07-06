import React, { useState, useRef, useCallback } from "react";
import { Satellite, MapPin, Crosshair, Layers, Loader2, Navigation, Eye, EyeOff } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const TILE_LAYERS = {
  satellite: {
    name: "Google Earth",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: "Google Earth",
  },
  streets: {
    name: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "OpenStreetMap",
  },
  esri: {
    name: "Esri Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri",
  },
};

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng),
  });
  return null;
}

function LocationFinder({ onFound }) {
  const map = useMap();
  const find = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.flyTo(latlng, 16);
        onFound && onFound(latlng);
      },
      () => {}
    );
  };
  return (
    <button
      onClick={find}
      className="absolute top-3 right-3 z-[1000] w-9 h-9 bg-white border border-slate-200 rounded-lg shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
      title="Find My Location"
    >
      <Crosshair className="w-4 h-4" />
    </button>
  );
}

export default function GeoMap() {
  const [tileLayer, setTileLayer] = useState("satellite");
  const [showLabels, setShowLabels] = useState(true);
  const [markers, setMarkers] = useState([]);
  const [center] = useState([32.2889, 72.3525]); // Khushab area
  const [loadingTile, setLoadingTile] = useState(false);

  const handleMapClick = useCallback((latlng) => {
    setMarkers(prev => [...prev, { id: Date.now(), latlng, label: `Point ${prev.length + 1}` }]);
  }, []);

  const removeMarker = (id) => setMarkers(prev => prev.filter(m => m.id !== id));

  const currentTile = TILE_LAYERS[tileLayer];

  return (
    <ModuleShell title="GEO MAP" titleUrdu="جیو میپ" Icon={Satellite} gradient="from-sky-400 to-blue-300">
      {/* Tile Layer Switcher */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
          {Object.entries(TILE_LAYERS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setTileLayer(key); setLoadingTile(true); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tileLayer === key ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {val.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowLabels(v => !v)}
          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1.5"
        >
          {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {showLabels ? "Labels" : "No Labels"}
        </button>
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-200" style={{ height: "65vh" }}>
        {loadingTile && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            <span className="text-xs text-slate-600">Loading {currentTile.name}…</span>
          </div>
        )}
        <MapContainer
          center={center}
          zoom={13}
          className="w-full h-full"
          style={{ background: "#0f1923" }}
        >
          <TileLayer
            key={tileLayer + (showLabels ? "-labels" : "")}
            url={
              tileLayer === "satellite" && showLabels
                ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                : currentTile.url
            }
            attribution={currentTile.attribution}
            eventHandlers={{
              load: () => setLoadingTile(false),
            }}
          />
          <MapClickHandler onMapClick={handleMapClick} />
          <LocationFinder />
          {markers.map(m => (
            <Marker key={m.id} position={m.latlng}>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Markers List */}
      {markers.length > 0 && (
        <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-bold text-slate-700">{markers.length} Marker(s)</span>
            <button
              onClick={() => setMarkers([])}
              className="ml-auto text-[10px] text-red-400 hover:text-red-600"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {markers.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600">
                  <span className="font-bold text-slate-700">{i + 1}.</span> {m.latlng.lat.toFixed(5)}, {m.latlng.lng.toFixed(5)}
                </span>
                <button
                  onClick={() => removeMarker(m.id)}
                  className="text-slate-300 hover:text-red-500 text-[10px]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 mt-3 text-center">
        Click on the map to drop pins • Use the crosshair button to find your GPS location
      </p>
    </ModuleShell>
  );
}