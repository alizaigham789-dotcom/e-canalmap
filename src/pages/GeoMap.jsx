import React, { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, CircleMarker, Rectangle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown } from "lucide-react";

import DrawingToolbar from "@/components/geomap/DrawingToolbar";
import MapHeader from "@/components/geomap/MapHeader";
import ZoomControls from "@/components/geomap/ZoomControls";
import Compass from "@/components/geomap/Compass";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const SAT_URL = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
const HYBRID_URL = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

function MapController({ onMapClick, onMapReady }) {
  const map = useMap();
  useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng, map),
    ready: () => onMapReady && onMapReady(map),
  });
  return null;
}

export default function GeoMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [center] = useState([32.2889, 72.3525]); // Khushab area
  const [hybrid, setHybrid] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [shapes, setShapes] = useState([]); // {id, type, points: [{lat,lng}], latlng, radius, color}
  const [draft, setDraft] = useState([]); // draft polygon points
  const [filters, setFilters] = useState({ district: "", tehsil: "", village: "" });

  // Load all maps to populate district/tehsil/village dropdowns
  const { data: maps } = useQuery({
    queryKey: ["geomap-maps"],
    queryFn: () => base44.entities.LandMap.list("-updated_date", 500),
  });

  const districts = useMemo(() => [...new Set((maps || []).map(m => m.district).filter(Boolean))].sort(), [maps]);
  const tehsils = useMemo(() => [...new Set((maps || []).filter(m => !filters.district || m.district === filters.district).map(m => m.tehsil).filter(Boolean))].sort(), [maps, filters.district]);
  const villages = useMemo(() => [...new Set((maps || []).filter(m => (!filters.district || m.district === filters.district) && (!filters.tehsil || m.tehsil === filters.tehsil)).map(m => m.village).filter(Boolean))].sort(), [maps, filters.district, filters.tehsil]);

  // If a village is selected, center the map on it
  const selectedMap = useMemo(() => (maps || []).find(m => m.village === filters.village && (!filters.district || m.district === filters.district)), [maps, filters]);

  const handleMapReady = useCallback((map) => { mapRef.current = map; }, []);

  const handleMapClick = useCallback((latlng) => {
    if (!activeTool) return;
    if (activeTool === "marker") {
      setShapes(prev => [...prev, { id: Date.now(), type: "marker", latlng, color: "#ef4444" }]);
    } else if (activeTool === "polygon") {
      setDraft(prev => [...prev, latlng]);
    } else if (activeTool === "circle") {
      setShapes(prev => [...prev, { id: Date.now(), type: "circle", latlng, radius: 200, color: "#ef4444" }]);
    } else if (activeTool === "square") {
      // Two-click rectangle: first click sets corner, second completes
      setDraft(prev => {
        if (prev.length === 0) return [latlng];
        const start = prev[0];
        const rect = [
          [start.lat, start.lng],
          [start.lat, latlng.lng],
          [latlng.lat, latlng.lng],
          [latlng.lat, start.lng],
        ];
        setShapes(s => [...s, { id: Date.now(), type: "rect", points: rect, color: "#ef4444" }]);
        return [];
      });
    }
  }, [activeTool]);

  // Finish polygon draft (double-click on map or button)
  const finishPolygon = useCallback(() => {
    if (draft.length >= 3) {
      setShapes(prev => [...prev, { id: Date.now(), type: "polygon", points: draft, color: "#ef4444" }]);
    }
    setDraft([]);
  }, [draft]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleCenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 16),
        () => {}
      );
    }
  };
  const handleSearch = () => {
    if (selectedMap) {
      // Try to parse viewport from the map record
      mapRef.current?.flyTo(center, 15);
    }
  };

  const handleFilterSelect = (field, value) => {
    setFilters(prev => {
      const next = { ...prev, [field]: value };
      if (field === "district") { next.tehsil = ""; next.village = ""; }
      if (field === "tehsil") { next.village = ""; }
      return next;
    });
  };

  const handleClearShapes = () => { setShapes([]); setDraft([]); };

  const tileUrl = hybrid ? HYBRID_URL : SAT_URL;

  return (
    <div className="fixed inset-0 bg-[#0f1923] z-40">
      {/* Map — full screen */}
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full"
        style={{ background: "#0f1923" }}
        doubleClickZoom={false}
      >
        <TileLayer url={tileUrl} attribution="Google Earth" />
        <MapController onMapClick={handleMapClick} onMapReady={handleMapReady} />

        {/* Render shapes */}
        {shapes.map((s) => {
          if (s.type === "polygon") return <Polygon key={s.id} positions={s.points.map(p => [p.lat, p.lng])} pathOptions={{ color: s.color, fillColor: s.color, fillOpacity: 0.4 }} />;
          if (s.type === "rect") return <Polygon key={s.id} positions={s.points} pathOptions={{ color: s.color, fillColor: s.color, fillOpacity: 0.4 }} />;
          if (s.type === "circle") return <CircleMarker key={s.id} center={[s.latlng.lat, s.latlng.lng]} radius={30} pathOptions={{ color: s.color, fillColor: s.color, fillOpacity: 0.4 }} />;
          if (s.type === "marker") return <Marker key={s.id} position={[s.latlng.lat, s.latlng.lng]} />;
          return null;
        })}

        {/* Draft polygon preview */}
        {draft.length > 0 && (
          <>
            <Polyline positions={draft.map(p => [p.lat, p.lng])} pathOptions={{ color: "#ef4444", dashArray: "6,4" }} />
            {draft.length >= 3 && (
              <Polygon
                positions={[...draft, draft[0]].map(p => [p.lat, p.lng])}
                pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.2, dashArray: "6,4" }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Overlay UI */}
      <MapHeader
        districts={districts}
        tehsils={tehsils}
        villages={villages}
        district={filters.district}
        tehsil={filters.tehsil}
        village={filters.village}
        onSelect={handleFilterSelect}
        onMenu={() => navigate("/")}
      />

      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenter={handleCenter}
        onSearch={handleSearch}
      />

      <Compass />

      <DrawingToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onClear={handleClearShapes}
      />

      {/* Finish polygon button (when drawing) */}
      {activeTool === "polygon" && draft.length >= 3 && (
        <button
          onClick={finishPolygon}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-4 h-9 bg-green-600 text-white text-xs font-bold rounded-full shadow-xl hover:bg-green-500 transition-colors"
        >
          ✓ Finish Mustateel ({draft.length} pts)
        </button>
      )}

      {/* Draft hint */}
      {activeTool === "polygon" && draft.length < 3 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-3 h-8 bg-black/80 text-white text-[11px] font-medium rounded-full shadow-xl flex items-center">
          Click to add {3 - draft.length} more point(s)…
        </div>
      )}

      {/* Hybrid / Satellite toggle — bottom-right pill */}
      <button
        onClick={() => setHybrid(v => !v)}
        className="absolute bottom-5 right-3 z-[1000] flex items-center gap-1.5 px-4 h-9 bg-[#1A4550] text-white text-xs font-bold rounded-full shadow-xl hover:bg-[#2C5E6D] transition-colors"
      >
        {hybrid ? "Hybrid Satellite" : "Satellite"}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {/* Shape count badge */}
      {shapes.length > 0 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-3 h-8 rounded-full shadow-md flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          {shapes.length} shape(s) drawn
        </div>
      )}
    </div>
  );
}