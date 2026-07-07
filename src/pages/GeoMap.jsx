import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown, Layers } from "lucide-react";

import DrawingToolbar from "@/components/geomap/DrawingToolbar";
import MapHeader from "@/components/geomap/MapHeader";
import ZoomControls from "@/components/geomap/ZoomControls";
import Compass from "@/components/geomap/Compass";
import OverlayPanel from "@/components/geomap/OverlayPanel";
import { DrawingStateManager } from "@/lib/gisEngine";
import {
  getOverlayRefPoint, parcelToLatLngs, polylineToLatLngs,
  polygonAreaAcres, parcelExpectedAcres,
} from "@/lib/geoOverlay";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const SAT_URL = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
const HYBRID_URL = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

const ANCHOR_ICON = L.divIcon({
  html: '<div style="width:24px;height:24px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:move;"></div>',
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  draggable: true,
});

function MapController({ onMapClick, onMapReady, onMapInstance }) {
  const map = useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng),
  });
  useEffect(() => { if (map) onMapInstance && onMapInstance(map); }, [map, onMapInstance]);
  return null;
}

export default function GeoMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [center] = useState([32.2889, 72.3525]);
  const [hybrid, setHybrid] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [draft, setDraft] = useState([]);
  const [filters, setFilters] = useState({ district: "", tehsil: "", village: "" });

  // Overlay state
  const [showOverlayPanel, setShowOverlayPanel] = useState(true);
  const [selectedMapId, setSelectedMapId] = useState("");
  const [selectedMoga, setSelectedMoga] = useState("");
  const [overlay, setOverlay] = useState(null); // { anchor:{lat,lng}, rotation, placing }

  // Load all maps for dropdowns
  const { data: maps } = useQuery({
    queryKey: ["geomap-maps"],
    queryFn: () => base44.entities.LandMap.list("-updated_date", 500),
  });

  // Load the selected map's drawing data
  const { data: selectedMap } = useQuery({
    queryKey: ["geomap-map", selectedMapId],
    queryFn: () => base44.entities.LandMap.filter({ id: selectedMapId }).then(r => r[0]),
    enabled: !!selectedMapId,
  });

  const mapObjects = useMemo(() => {
    if (!selectedMap?.drawing_data) return [];
    return DrawingStateManager.deserialize(selectedMap.drawing_data);
  }, [selectedMap]);

  const districts = useMemo(() => [...new Set((maps || []).map(m => m.district).filter(Boolean))].sort(), [maps]);
  const tehsils = useMemo(() => [...new Set((maps || []).filter(m => !filters.district || m.district === filters.district).map(m => m.tehsil).filter(Boolean))].sort(), [maps, filters.district]);
  const villages = useMemo(() => [...new Set((maps || []).filter(m => (!filters.district || m.district === filters.district) && (!filters.tehsil || m.tehsil === filters.tehsil)).map(m => m.village).filter(Boolean))].sort(), [maps, filters.district, filters.tehsil]);

  // Available mogas in the selected map
  const availableMogas = useMemo(() => {
    const s = new Set();
    for (const o of mapObjects) {
      if ((o.type === "chakbandi" || o.type === "mustateel") && o.mogaNumber) s.add(o.mogaNumber);
    }
    return [...s].sort((a, b) => parseInt(a) - parseInt(b));
  }, [mapObjects]);

  // Filter objects by selected moga
  const overlayObjects = useMemo(() => {
    if (!selectedMoga) return mapObjects;
    return mapObjects.filter(o => {
      if (o.type === "chakbandi") return o.mogaNumber === selectedMoga;
      if (o.type === "mustateel") return o.mogaNumber === selectedMoga || !o.mogaNumber;
      return ["canal", "khal", "road", "mouza"].includes(o.type);
    });
  }, [mapObjects, selectedMoga]);

  // Reference point (rotation pivot) for the overlay
  const refPoint = useMemo(() => getOverlayRefPoint(overlayObjects), [overlayObjects]);

  // Convert overlay objects to geo polygons/polylines
  const overlayGeo = useMemo(() => {
    if (!overlay || !overlay.anchor) return { parcels: [], lines: [] };
    const { lat, lng } = overlay.anchor;
    const rot = overlay.rotation || 0;
    const parcels = overlayObjects
      .filter(o => ["mustateel", "muraba", "acre"].includes(o.type))
      .map(o => {
        const latlngs = parcelToLatLngs(o, { lat, lng }, refPoint.x, refPoint.y, rot);
        return { id: o.id, type: o.type, label: o.label || "", latlngs, acres: polygonAreaAcres(latlngs), expected: parcelExpectedAcres(o) };
      });
    const lines = overlayObjects
      .filter(o => ["canal", "khal", "road", "chakbandi", "mouza"].includes(o.type) && o.points?.length >= 2)
      .map(o => ({ id: o.id, type: o.type, name: o.name || "", latlngs: polylineToLatLngs(o, { lat, lng }, refPoint.x, refPoint.y, rot) }));
    return { parcels, lines };
  }, [overlay, overlayObjects, refPoint]);

  const handleMapInstance = useCallback((m) => { mapRef.current = m; }, []);

  const handleMapClick = useCallback((latlng) => {
    // If overlay placing mode is active, set the anchor
    if (overlay?.placing) {
      setOverlay(prev => ({ ...prev, anchor: latlng, placing: false }));
      mapRef.current?.flyTo(latlng, mapRef.current?.getZoom() || 15);
      return;
    }
    // Otherwise, handle drawing tools
    if (!activeTool) return;
    if (activeTool === "marker") {
      setShapes(prev => [...prev, { id: Date.now(), type: "marker", latlng, color: "#ef4444" }]);
    } else if (activeTool === "polygon") {
      setDraft(prev => [...prev, latlng]);
    } else if (activeTool === "circle") {
      setShapes(prev => [...prev, { id: Date.now(), type: "circle", latlng, color: "#ef4444" }]);
    } else if (activeTool === "square") {
      setDraft(prev => {
        if (prev.length === 0) return [latlng];
        const start = prev[0];
        setShapes(s => [...s, { id: Date.now(), type: "rect", points: [[start.lat, start.lng], [start.lat, latlng.lng], [latlng.lat, latlng.lng], [latlng.lat, start.lng]], color: "#ef4444" }]);
        return [];
      });
    }
  }, [activeTool, overlay]);

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
  const handleSearch = () => { if (selectedMap) mapRef.current?.flyTo(center, 15); };

  const handleFilterSelect = (field, value) => {
    setFilters(prev => {
      const next = { ...prev, [field]: value };
      if (field === "district") { next.tehsil = ""; next.village = ""; }
      if (field === "tehsil") { next.village = ""; }
      return next;
    });
  };

  const handleSelectMap = (id) => {
    setSelectedMapId(id);
    setSelectedMoga("");
    // Initialize overlay with anchor at current center, ready for placing
    setOverlay({ anchor: null, rotation: 0, placing: true });
  };

  const handleAnchorDrag = useCallback((e) => {
    const latlng = e.target.getLatLng();
    setOverlay(prev => prev ? { ...prev, anchor: { lat: latlng.lat, lng: latlng.lng } } : prev);
  }, []);

  const handleClearShapes = () => { setShapes([]); setDraft([]); };
  const handleClearOverlay = () => { setOverlay(null); setSelectedMapId(""); setSelectedMoga(""); };

  const tileUrl = hybrid ? HYBRID_URL : SAT_URL;

  const lineColors = {
    canal: "#0284c7", khal: "#2563eb", road: "#b45309",
    chakbandi: "#22c55e", mouza: "#000000",
  };

  return (
    <div className="fixed inset-0 bg-[#0f1923] z-40">
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full"
        style={{ background: "#0f1923" }}
        doubleClickZoom={false}
      >
        <TileLayer url={tileUrl} attribution="Google Earth" />
        <MapController onMapClick={handleMapClick} onMapInstance={handleMapInstance} />

        {/* Overlay parcels (mustateels/murabas/acres) */}
        {overlayGeo.parcels.map(p => (
          <Polygon
            key={p.id}
            positions={p.latlngs.map(l => [l.lat, l.lng])}
            pathOptions={{
              color: p.type === "mustateel" ? "#ef4444" : p.type === "muraba" ? "#f97316" : "#eab308",
              fillColor: p.type === "mustateel" ? "#ef4444" : p.type === "muraba" ? "#f97316" : "#eab308",
              fillOpacity: 0.35,
              weight: 2,
            }}
          >
          </Polygon>
        ))}

        {/* Overlay lines (canals/khals/roads/chakbandi) */}
        {overlayGeo.lines.map(l => (
          <Polyline
            key={l.id}
            positions={l.latlngs.map(pt => [pt.lat, pt.lng])}
            pathOptions={{ color: lineColors[l.type] || "#666", weight: l.type === "canal" ? 4 : 2, dashArray: l.type === "mouza" ? "10,6" : null }}
          />
        ))}

        {/* Overlay anchor marker (draggable) */}
        {overlay?.anchor && (
          <Marker
            position={[overlay.anchor.lat, overlay.anchor.lng]}
            icon={ANCHOR_ICON}
            draggable
            eventHandlers={{ dragend: handleAnchorDrag }}
          />
        )}

        {/* Free-draw shapes */}
        {shapes.map((s) => {
          if (s.type === "polygon") return <Polygon key={s.id} positions={s.points.map(p => [p.lat, p.lng])} pathOptions={{ color: s.color, fillColor: s.color, fillOpacity: 0.4 }} />;
          if (s.type === "rect") return <Polygon key={s.id} positions={s.points} pathOptions={{ color: s.color, fillColor: s.color, fillOpacity: 0.4 }} />;
          if (s.type === "marker") return <Marker key={s.id} position={[s.latlng.lat, s.latlng.lng]} />;
          return null;
        })}

        {draft.length > 0 && (
          <>
            <Polyline positions={draft.map(p => [p.lat, p.lng])} pathOptions={{ color: "#ef4444", dashArray: "6,4" }} />
            {draft.length >= 3 && (
              <Polygon positions={[...draft, draft[0]].map(p => [p.lat, p.lng])} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.2, dashArray: "6,4" }} />
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

      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onCenter={handleCenter} onSearch={handleSearch} />
      <Compass />

      {/* Overlay toggle button */}
      <button
        onClick={() => setShowOverlayPanel(v => !v)}
        className={`absolute top-14 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 px-3 h-8 rounded-full shadow-xl text-xs font-bold transition-all ${showOverlayPanel ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
      >
        <Layers className="w-3.5 h-3.5" />
        Moga Overlay
      </button>

      {showOverlayPanel && (
        <OverlayPanel
          maps={maps || []}
          selectedMapId={selectedMapId}
          onSelectMap={handleSelectMap}
          availableMogas={availableMogas}
          selectedMoga={selectedMoga}
          onSelectMoga={setSelectedMoga}
          overlay={overlay}
          onPlaceMode={() => setOverlay(prev => prev ? { ...prev, placing: true } : prev)}
          onRotationChange={(deg) => setOverlay(prev => prev ? { ...prev, rotation: deg } : prev)}
          onClear={handleClearOverlay}
          mustateelAreas={overlayGeo.parcels.filter(p => p.type === "mustateel")}
          onClose={() => setShowOverlayPanel(false)}
        />
      )}

      <DrawingToolbar activeTool={activeTool} onToolChange={setActiveTool} onClear={handleClearShapes} />

      {activeTool === "polygon" && draft.length >= 3 && (
        <button onClick={finishPolygon} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-4 h-9 bg-green-600 text-white text-xs font-bold rounded-full shadow-xl hover:bg-green-500 transition-colors">
          ✓ Finish Mustateel ({draft.length} pts)
        </button>
      )}
      {activeTool === "polygon" && draft.length < 3 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-3 h-8 bg-black/80 text-white text-[11px] font-medium rounded-full shadow-xl flex items-center">
          Click to add {3 - draft.length} more point(s)…
        </div>
      )}

      {/* Hybrid / Satellite toggle */}
      <button
        onClick={() => setHybrid(v => !v)}
        className="absolute bottom-5 right-3 z-[1000] flex items-center gap-1.5 px-4 h-9 bg-[#1A4550] text-white text-xs font-bold rounded-full shadow-xl hover:bg-[#2C5E6D] transition-colors"
      >
        {hybrid ? "Hybrid Satellite" : "Satellite"}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {/* Overlay info badge */}
      {overlay?.anchor && overlayGeo.parcels.length > 0 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-3 h-8 rounded-full shadow-md flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          {overlayGeo.parcels.length} parcels · {overlayGeo.parcels.reduce((s, p) => s + p.acres, 0).toFixed(1)} acres · drag blue pin to move · rotate in panel
        </div>
      )}
    </div>
  );
}