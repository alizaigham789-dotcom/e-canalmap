import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Circle, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown, Layers, MapPin, Trash2 } from "lucide-react";

import DrawingToolbar from "@/components/geomap/DrawingToolbar";
import MapHeader from "@/components/geomap/MapHeader";
import ZoomControls from "@/components/geomap/ZoomControls";
import Compass from "@/components/geomap/Compass";
import OverlayPanel from "@/components/geomap/OverlayPanel";
import OverlayLayer from "@/components/geomap/OverlayLayer";
import MeasurementInfo from "@/components/geomap/MeasurementInfo";
import MarkerPopup from "@/components/geomap/MarkerPopup";
import CoordinateDialog from "@/components/geomap/CoordinateDialog";
import { DrawingStateManager } from "@/lib/gisEngine";
import {
  computeOneClickTransform, polygonAreaSqMeters, sqMetersToUnits,
  parcelExpectedAcres, haversine, polylineLength, rectMeasurements, circleMeasurements,
  fmtArea, fmtDistFeet,
} from "@/lib/geoOverlay";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const SAT_URL = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
const HYBRID_URL = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

// Colored marker icon factory
function coloredIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white" stroke="none"/></svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [28, 28], iconAnchor: [14, 28] });
}

// Control point marker (numbered)
function controlIcon(num) {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white;">${num}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// GPS user location marker (blue dot)
const GPS_ICON = L.divIcon({
  html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.8);"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Corner placement marker — red square with corner brackets, shows where the map's
// upper-left corner will be placed. Coordinates are shown in a permanent tooltip.
function cornerPlaceIcon() {
  return L.divIcon({
    html: `<div style="width:34px;height:34px;background:#ef4444;border:3px solid white;border-radius:8px;box-shadow:0 2px 12px rgba(239,68,68,0.7);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M4 4 L10 4 M4 4 L4 10"/><path d="M20 4 L14 4 M20 4 L20 10"/><path d="M4 20 L10 20 M4 20 L4 14"/><path d="M20 20 L14 20 M20 20 L20 14"/></svg>
    </div>`,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function MapController({ onMapClick, onMapInstance, onZoomChange }) {
  const map = useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng),
    zoomend: () => onZoomChange && onZoomChange(map.getZoom()),
  });
  useEffect(() => { if (map) { onMapInstance && onMapInstance(map); onZoomChange && onZoomChange(map.getZoom()); } }, [map]);
  return null;
}

// GPS tracker component — continuously updates user position
function GPSTracker({ active, onPosition }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onPosition(latlng, pos.coords.accuracy);
        map.flyTo([latlng.lat, latlng.lng], Math.max(map.getZoom(), 16), { duration: 0.5 });
      },
      (err) => { console.warn("GPS error:", err.message); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, map, onPosition]);
  return null;
}

export default function GeoMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [center] = useState([32.2889, 72.3525]);
  const [zoom, setZoom] = useState(13);
  const [hybrid, setHybrid] = useState(true);
  const [activeTool, setActiveTool] = useState(null);
  const [filters, setFilters] = useState({ district: "", tehsil: "", village: "" });

  // GPS
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // Coordinate input dialog for placement
  const [showCoordDialog, setShowCoordDialog] = useState(false);

  // Overlay / georeferencing
  const [showOverlayPanel, setShowOverlayPanel] = useState(true);
  const [selectedMapId, setSelectedMapId] = useState("");
  const [selectedMoga, setSelectedMoga] = useState("");
  const [placementPoint, setPlacementPoint] = useState(null); // single geo point = overlay upper-left corner
  const [placing, setPlacing] = useState(false); // single-click placement mode
  const [overlay, setOverlay] = useState(null); // { transform, rotation, placementPoint }
  const [killaVisible, setKillaVisible] = useState(true);
  const [layerVisible, setLayerVisible] = useState(true);

  // Measurement tools state
  const [markers, setMarkers] = useState([]); // user markers
  const [measurements, setMeasurements] = useState([]); // completed measurements
  const [draft, setDraft] = useState(null); // active drawing draft
  const [liveMeasurement, setLiveMeasurement] = useState(null); // live measurement for display
  const [mouseLatLng, setMouseLatLng] = useState(null);

  // ─── DATA ────────────────────────────────────────────────────
  const { data: maps } = useQuery({
    queryKey: ["geomap-maps"],
    queryFn: () => base44.entities.LandMap.list("-updated_date", 500),
  });

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

  const availableMogas = useMemo(() => {
    const s = new Set();
    for (const o of mapObjects) {
      if ((o.type === "chakbandi" || o.type === "mustateel") && o.mogaNumber) s.add(o.mogaNumber);
    }
    return [...s].sort((a, b) => parseInt(a) - parseInt(b));
  }, [mapObjects]);

  // ─── OVERLAY COMPUTATION ──────────────────────────────────────
  // One-click placement: the clicked point becomes the upper-left corner
  // of the cadastral map, scaled so one mustateel = exactly 10 acres.
  useEffect(() => {
    if (!placementPoint || !selectedMapId || mapObjects.length === 0) return;
    const transform = computeOneClickTransform(placementPoint, mapObjects, 0);
    if (!transform) return;
    setOverlay({ transform, rotation: 0, placementPoint });
    // Fit map to overlay bounds
    const allLatLngs = [];
    for (const o of mapObjects) {
      if (["mustateel", "muraba", "acre"].includes(o.type)) {
        const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
        for (const [cx, cy] of corners) allLatLngs.push(transform.transform(cx, cy));
      } else if (o.points?.length) {
        for (const p of o.points) allLatLngs.push(transform.transform(p.x, p.y));
      } else if (o.start && o.end) {
        allLatLngs.push(transform.transform(o.start.x, o.start.y));
        allLatLngs.push(transform.transform(o.end.x, o.end.y));
      }
    }
    if (allLatLngs.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(allLatLngs.map(p => [p.lat, p.lng]));
      mapRef.current.flyToBounds(bounds, { padding: [80, 80], duration: 1 });
    }
  }, [placementPoint, selectedMapId, mapObjects]);

  // Mustateel area verification
  const mustateelAreas = useMemo(() => {
    if (!overlay?.transform) return [];
    return mapObjects
      .filter(o => o.type === "mustateel")
      .map(o => {
        const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
        const latlngs = corners.map(([cx, cy]) => overlay.transform.transform(cx, cy));
        return { id: o.id, label: o.label || "", acres: sqMetersToUnits(polygonAreaSqMeters(latlngs)).acres, expected: parcelExpectedAcres(o) };
      });
  }, [overlay, mapObjects]);

  // ─── MAP CLICK HANDLER ───────────────────────────────────────
  const handleMapClick = useCallback((latlng) => {
    // 1. Single-click placement — clicked point becomes the overlay's upper-left corner
    if (placing && selectedMapId) {
      setPlacementPoint(latlng);
      setPlacing(false);
      return;
    }

    // 2. Measurement tools
    if (!activeTool) return;

    if (activeTool === "marker") {
      setMarkers(prev => [...prev, { id: Date.now(), latlng, title: "", color: "#ef4444" }]);
    } else if (activeTool === "line") {
      setDraft(prev => {
        if (!prev) return { type: "line", points: [latlng] };
        return { ...prev, points: [...prev.points, latlng] };
      });
    } else if (activeTool === "polygon") {
      setDraft(prev => {
        if (!prev) return { type: "polygon", points: [latlng] };
        return { ...prev, points: [...prev.points, latlng] };
      });
    } else if (activeTool === "rectangle") {
      setDraft(prev => {
        if (!prev || prev.points.length === 0) return { type: "rectangle", points: [latlng] };
        const c1 = prev.points[0];
        const c2 = latlng;
        const rect = { type: "rectangle", points: [c1, c2] };
        const m = rectMeasurements(c1, c2);
        setMeasurements(me => [...me, { id: Date.now(), ...rect, measurement: { type: "rectangle", ...m } }]);
        return null;
      });
    } else if (activeTool === "circle") {
      setDraft(prev => {
        if (!prev) return { type: "circle", center: latlng, radius: 0 };
        // Second click finalizes with current radius
        const r = haversine(prev.center.lat, prev.center.lng, latlng.lat, latlng.lng);
        const m = circleMeasurements(prev.center.lat, prev.center.lng, r);
        setMeasurements(me => [...me, { id: Date.now(), center: prev.center, radius: r, measurement: { type: "circle", ...m } }]);
        return null;
      });
    }
  }, [placing, selectedMapId, activeTool]);

  // ─── LIVE MEASUREMENT (mouse move) ─────────────────────────────
  const handleMouseMove = useCallback((latlng) => {
    setMouseLatLng(latlng);
    if (!draft) { setLiveMeasurement(null); return; }

    if (draft.type === "line" && draft.points.length >= 1) {
      const last = draft.points[draft.points.length - 1];
      const d = haversine(last.lat, last.lng, latlng.lat, latlng.lng);
      const total = polylineLength([...draft.points, latlng]);
      setLiveMeasurement({ type: "line", length: total, segment: d });
    } else if (draft.type === "polygon" && draft.points.length >= 1) {
      const pts = [...draft.points, latlng];
      const area = polygonAreaSqMeters(pts);
      const perim = polylineLength(pts);
      setLiveMeasurement({ type: "polygon", area, perimeter: perim });
    } else if (draft.type === "circle" && draft.center) {
      const r = haversine(draft.center.lat, draft.center.lng, latlng.lat, latlng.lng);
      setLiveMeasurement({ type: "circle", radius: r, ...circleMeasurements(draft.center.lat, draft.center.lng, r) });
    } else if (draft.type === "rectangle" && draft.points?.length === 1) {
      const m = rectMeasurements(draft.points[0], latlng);
      setLiveMeasurement({ type: "rectangle", ...m });
    } else {
      setLiveMeasurement(null);
    }
  }, [draft]);

  // ─── FINISH DRAWING (double-click) ───────────────────────────
  const handleDoubleClick = useCallback(() => {
    if (!draft) return;
    if (draft.type === "line" && draft.points.length >= 2) {
      const len = polylineLength(draft.points);
      setMeasurements(me => [...me, { id: Date.now(), type: "line", points: draft.points, measurement: { type: "line", length: len } }]);
    } else if (draft.type === "polygon" && draft.points.length >= 3) {
      const area = polygonAreaSqMeters(draft.points);
      const perim = polylineLength([...draft.points, draft.points[0]]);
      setMeasurements(me => [...me, { id: Date.now(), type: "polygon", points: draft.points, measurement: { type: "polygon", area, perimeter: perim } }]);
    }
    setDraft(null);
    setLiveMeasurement(null);
  }, [draft]);

  // Mouse move tracker for live measurements
  function MouseTracker() {
    useMapEvents({
      mousemove: (e) => handleMouseMove(e.latlng),
      dblclick: () => handleDoubleClick(),
    });
    return null;
  }

  // ─── HANDLERS ─────────────────────────────────────────────────
  const handleMapInstance = useCallback((m) => { mapRef.current = m; }, []);

  const handleZoomIn = () => mapRef.current?.flyTo(mapRef.current.getCenter(), mapRef.current.getZoom() + 1);
  const handleZoomOut = () => mapRef.current?.flyTo(mapRef.current.getCenter(), mapRef.current.getZoom() - 1);

  const handleGPS = () => {
    if (gpsActive) { setGpsActive(false); setGpsPosition(null); return; }
    if (!navigator.geolocation) { alert("GPS not available"); return; }
    setGpsActive(true);
  };

  // Open coordinate dialog — lets user type lat/lng to place the map corner
  const handlePlaceByCoords = (coords) => {
    if (!selectedMapId) return;
    setPlacementPoint(coords);
    setPlacing(false);
    setOverlay(null);
  };

  const handleSelectMap = (id) => {
    setSelectedMapId(id);
    setSelectedMoga("");
    setPlacementPoint(null);
    setOverlay(null);
    setPlacing(!!id); // enter single-click placement mode when a map is chosen
  };

  const handleFilterSelect = (field, value) => {
    setFilters(prev => {
      const next = { ...prev, [field]: value };
      if (field === "district") { next.tehsil = ""; next.village = ""; }
      if (field === "tehsil") { next.village = ""; }
      return next;
    });
  };

  const handleClearOverlay = () => {
    setOverlay(null);
    setPlacementPoint(null);
    setPlacing(false);
    setSelectedMapId("");
    setSelectedMoga("");
  };

  const handleRePlace = () => {
    setOverlay(null);
    setPlacementPoint(null);
    setPlacing(true);
  };

  const handleClearMeasurements = () => { setMeasurements([]); setDraft(null); setLiveMeasurement(null); };
  const handleDeleteMeasurement = (id) => { setMeasurements(prev => prev.filter(m => m.id !== id)); };

  const handleMarkerUpdate = (id, changes) => { setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...changes } : m)); };
  const handleMarkerDelete = (id) => { setMarkers(prev => prev.filter(m => m.id !== id)); };

  const handleExport = () => {
    if (!mapRef.current) return;
    // Simple screenshot via leaflet-image would need a package; for now alert
    alert("Export: Use your browser's screenshot tool (Ctrl+Shift+S) or print to PDF via browser.");
  };

  const handleRotationChange = (deg) => {
    setOverlay(prev => {
      if (!prev?.placementPoint || mapObjects.length === 0) return prev;
      const transform = computeOneClickTransform(prev.placementPoint, mapObjects, deg);
      return transform ? { transform, rotation: deg, placementPoint: prev.placementPoint } : prev;
    });
  };

  const tileUrl = hybrid ? HYBRID_URL : SAT_URL;

  // ─── GPS accuracy circle ──────────────────────────────────────
  const gpsAccuracyCircle = gpsPosition && gpsAccuracy ? (
    <Circle center={[gpsPosition.lat, gpsPosition.lng]} radius={gpsAccuracy} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 1 }} />
  ) : null;

  // Draft preview rendering
  const draftPreview = useMemo(() => {
    if (!draft) return null;
    if (draft.type === "line" && draft.points.length >= 1) {
      const pts = [...draft.points];
      if (mouseLatLng) pts.push(mouseLatLng);
      return <Polyline positions={pts.map(p => [p.lat, p.lng])} pathOptions={{ color: "#ef4444", weight: 3, dashArray: "6,4" }} />;
    }
    if (draft.type === "polygon" && draft.points.length >= 1) {
      const pts = [...draft.points];
      if (mouseLatLng) pts.push(mouseLatLng);
      return <>
        <Polyline positions={pts.map(p => [p.lat, p.lng])} pathOptions={{ color: "#ef4444", weight: 2, dashArray: "6,4" }} />
        {pts.length >= 3 && <Polygon positions={pts.map(p => [p.lat, p.lng])} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.15, dashArray: "6,4" }} />}
      </>;
    }
    if (draft.type === "circle" && draft.center) {
      const r = mouseLatLng ? haversine(draft.center.lat, draft.center.lng, mouseLatLng.lat, mouseLatLng.lng) : 0;
      return <Circle center={[draft.center.lat, draft.center.lng]} radius={r} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.12, weight: 2, dashArray: "6,4" }} />;
    }
    if (draft.type === "rectangle" && draft.points?.length === 1 && mouseLatLng) {
      const c1 = draft.points[0];
      const corners = [[c1.lat, c1.lng], [c1.lat, mouseLatLng.lng], [mouseLatLng.lat, mouseLatLng.lng], [mouseLatLng.lat, c1.lng]];
      return <Polygon positions={corners} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.12, weight: 2, dashArray: "6,4" }} />;
    }
    return null;
  }, [draft, mouseLatLng]);

  return (
    <div className="fixed inset-0 bg-[#0f1923] z-40">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        style={{ background: "#0f1923" }}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} />
        <MapController onMapClick={handleMapClick} onMapInstance={handleMapInstance} onZoomChange={setZoom} />
        <MouseTracker />
        <GPSTracker active={gpsActive} onPosition={(pos, acc) => { setGpsPosition(pos); setGpsAccuracy(acc); }} />

        {/* GPS marker + accuracy circle */}
        {gpsAccuracyCircle}
        {gpsPosition && <Marker position={[gpsPosition.lat, gpsPosition.lng]} icon={GPS_ICON} />}

        {/* Overlay layer — all map details */}
        {layerVisible && overlay?.transform && (
          <OverlayLayer
            objects={mapObjects}
            transform={overlay.transform}
            zoom={zoom}
            killaVisible={killaVisible}
            mogaFilter={selectedMoga}
          />
        )}

        {/* Corner placement marker — shows where the map corner is placed + coordinates */}
        {placementPoint && (
          <Marker position={[placementPoint.lat, placementPoint.lng]} icon={cornerPlaceIcon()}>
            <Tooltip permanent direction="right" className="placement-coords-tooltip">
              <div className="text-[10px] font-mono leading-tight">
                <div className="font-bold text-red-600 flex items-center gap-1">
                  <span>📍</span> کونہ پوائنٹ (Corner)
                </div>
                <div className="text-slate-700">Lat: {placementPoint.lat.toFixed(6)}</div>
                <div className="text-slate-700">Lng: {placementPoint.lng.toFixed(6)}</div>
              </div>
            </Tooltip>
          </Marker>
        )}

        {/* Completed measurements — click to delete */}
        {measurements.map(m => {
          const delOpts = { color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.15, weight: 3 };
          if (m.type === "line") return (
            <Polyline key={m.id} positions={m.points.map(p => [p.lat, p.lng])} pathOptions={delOpts} eventHandlers={{ click: () => handleDeleteMeasurement(m.id) }}>
              <Tooltip permanent direction="top"><span className="text-xs font-bold text-red-600">{fmtDistFeet(m.measurement.length)}</span></Tooltip>
            </Polyline>
          );
          if (m.type === "polygon") return (
            <Polygon key={m.id} positions={m.points.map(p => [p.lat, p.lng])} pathOptions={delOpts} eventHandlers={{ click: () => handleDeleteMeasurement(m.id) }}>
              <Tooltip permanent direction="top"><span className="text-xs font-bold text-red-600">{fmtArea(m.measurement.area)}</span></Tooltip>
            </Polygon>
          );
          if (m.type === "rectangle") return (
            <Polygon key={m.id} positions={[[m.points[0].lat, m.points[0].lng], [m.points[0].lat, m.points[1].lng], [m.points[1].lat, m.points[1].lng], [m.points[1].lat, m.points[0].lng]]} pathOptions={delOpts} eventHandlers={{ click: () => handleDeleteMeasurement(m.id) }}>
              <Tooltip permanent direction="top"><span className="text-xs font-bold text-red-600">{fmtArea(m.measurement.area)}</span></Tooltip>
            </Polygon>
          );
          if (m.type === "circle") return (
            <Circle key={m.id} center={[m.center.lat, m.center.lng]} radius={m.radius} pathOptions={delOpts} eventHandlers={{ click: () => handleDeleteMeasurement(m.id) }}>
              <Tooltip permanent direction="top"><span className="text-xs font-bold text-red-600">{fmtArea(m.measurement.area)}</span></Tooltip>
            </Circle>
          );
          return null;
        })}

        {/* Draft preview */}
        {draftPreview}

        {/* User markers with popup */}
        {markers.map(m => (
          <Marker key={m.id} position={[m.latlng.lat, m.latlng.lng]} icon={coloredIcon(m.color)}>
            <MarkerPopup marker={m} onUpdate={handleMarkerUpdate} onDelete={handleMarkerDelete} />
          </Marker>
        ))}
      </MapContainer>

      {/* UI Overlays */}
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

      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onGPS={handleGPS} gpsActive={gpsActive} onPlaceByCoords={() => setShowCoordDialog(true)} />
      <Compass />

      {/* Overlay toggle */}
      <button
        onClick={() => setShowOverlayPanel(v => !v)}
        className={`absolute top-14 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 px-3 h-8 rounded-full shadow-xl text-xs font-bold transition-all ${showOverlayPanel ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
      >
        <Layers className="w-3.5 h-3.5" />
        GIS Overlay
      </button>

      {showOverlayPanel && (
        <OverlayPanel
          maps={maps || []}
          selectedMapId={selectedMapId}
          onSelectMap={handleSelectMap}
          availableMogas={availableMogas}
          selectedMoga={selectedMoga}
          onSelectMoga={setSelectedMoga}
          placing={placing}
          overlayReady={!!overlay}
          overlay={overlay}
          onRotationChange={handleRotationChange}
          onRePlace={handleRePlace}
          onClear={handleClearOverlay}
          mustateelAreas={mustateelAreas}
          onClose={() => setShowOverlayPanel(false)}
        />
      )}

      {/* Killa visibility toggle */}
      {overlay && (
        <button
          onClick={() => setKillaVisible(v => !v)}
          className={`absolute top-14 right-[20rem] z-[1000] px-2 h-8 rounded-full shadow-xl text-[10px] font-bold transition-all ${killaVisible ? "bg-emerald-500 text-white" : "bg-white text-slate-400"}`}
        >
          Killa #{killaVisible ? "On" : "Off"}
        </button>
      )}

      <DrawingToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onClear={handleClearMeasurements}
        onExport={handleExport}
        onLayerToggle={() => setLayerVisible(v => !v)}
        layerVisible={layerVisible}
      />

      {/* Live measurement info */}
      <MeasurementInfo measurement={liveMeasurement} draft={draft} zoom={zoom} />

      {/* Placement hint — single-click mode with live coordinates */}
      {placing && selectedMapId && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-[1001] bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex flex-col items-center gap-0.5 animate-pulse">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            نقشہ پر کلک کریں — کونہ پوائنٹ یہیں لگے گا
          </div>
          {mouseLatLng && (
            <div className="text-[10px] font-mono text-blue-100">
              Lat: {mouseLatLng.lat.toFixed(6)} · Lng: {mouseLatLng.lng.toFixed(6)}
            </div>
          )}
        </div>
      )}

      {/* Active tool hint */}
      {activeTool && !liveMeasurement && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] bg-black/80 text-white text-[11px] font-medium px-3 h-8 rounded-full shadow-xl flex items-center">
          {activeTool === "line" && "Click points to measure distance (ft) · Double-click to finish"}
          {activeTool === "polygon" && "Click to add vertices · Double-click to finish (shows acres/kanal)"}
          {activeTool === "rectangle" && "Click two opposite corners (shows acres/kanal)"}
          {activeTool === "circle" && "Click center, then click edge (shows acres/kanal)"}
          {activeTool === "marker" && "Click to place a marker"}
        </div>
      )}

      {/* Delete hint — always visible when measurements exist */}
      {measurements.length > 0 && !activeTool && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] bg-red-600/90 text-white text-[11px] font-medium px-3 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <Trash2 className="w-3 h-3" />
          Click any measurement to delete · {measurements.length} active
        </div>
      )}

      {/* Coordinate input dialog — type lat/lng to place map */}
      <CoordinateDialog
        open={showCoordDialog}
        onClose={() => setShowCoordDialog(false)}
        onPlace={handlePlaceByCoords}
        mouseLatLng={mouseLatLng}
      />

      {/* Hybrid / Satellite toggle */}
      <button
        onClick={() => setHybrid(v => !v)}
        className="absolute bottom-5 right-3 z-[1000] flex items-center gap-1.5 px-4 h-9 bg-[#1A4550] text-white text-xs font-bold rounded-full shadow-xl hover:bg-[#2C5E6D] transition-colors"
      >
        {hybrid ? "Hybrid Satellite" : "Pure Satellite"}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}