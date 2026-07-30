import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Circle, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown, Layers, MapPin, Trash2, Save, FileText, MousePointerClick } from "lucide-react";

import DrawingToolbar from "@/components/geomap/DrawingToolbar";
import MapHeader from "@/components/geomap/MapHeader";
import ZoomControls from "@/components/geomap/ZoomControls";
import Compass from "@/components/geomap/Compass";
import OverlayPanel from "@/components/geomap/OverlayPanel";
import OverlayLayer from "@/components/geomap/OverlayLayer";
import MeasurementInfo from "@/components/geomap/MeasurementInfo";
import MarkerPopup from "@/components/geomap/MarkerPopup";
import CoordinateDialog from "@/components/geomap/CoordinateDialog";
import GeoMapExportDialog from "@/components/geomap/GeoMapExportDialog";
import Form1RegisterPanel from "@/components/geomap/Form1RegisterPanel";
import AllocationLayer from "@/components/geomap/AllocationLayer";
import AllocationDialog from "@/components/geomap/AllocationDialog";
import { remainingKanal, acreAllocations } from "@/lib/allocationEngine";
import { DrawingStateManager } from "@/lib/gisEngine";
import {
  computeOneClickTransform, computeTwoPointTransform, getParcelBoundingBox, getBottomMustateelCorner,
  polygonAreaSqMeters, sqMetersToUnits,
  parcelExpectedAcres, haversine, polylineLength, rectMeasurements, circleMeasurements,
  fmtArea, fmtDistFeet,
} from "@/lib/geoOverlay";
import html2canvas from "html2canvas";
import { toast } from "sonner";

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

// Lower-left anchor marker — green, draggable. Lets the user fine-tune the
// overlay's rotation/scale by dragging this second point (bottom-left of mustateel).
function lowerLeftIcon() {
  return L.divIcon({
    html: `<div style="width:34px;height:34px;background:#eab308;border:3px solid white;border-radius:8px;box-shadow:0 2px 12px rgba(234,179,8,0.7);display:flex;align-items:center;justify-content:center;cursor:grab;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M4 20 L10 20 M4 20 L4 14"/></svg>
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
  const [showLowerLeftDialog, setShowLowerLeftDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Overlay / georeferencing
  const [showOverlayPanel, setShowOverlayPanel] = useState(true);
  const [selectedMapId, setSelectedMapId] = useState("");
  const [selectedMoga, setSelectedMoga] = useState("");
  const [placementPoint, setPlacementPoint] = useState(null); // marker 1 — overlay upper-left corner
  const [lowerLeftPoint, setLowerLeftPoint] = useState(null); // marker 2 — lower-left corner for rotation/scale
  const [placingStep, setPlacingStep] = useState(0); // 0=none, 1=placing marker 1, 2=placing marker 2
  const [overlay, setOverlay] = useState(null); // { transform, rotation, placementPoint }
  const [killaVisible, setKillaVisible] = useState(true);
  const [layerVisible, setLayerVisible] = useState(true);
  const [activeMustateelId, setActiveMustateelId] = useState(null);
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [overlaySaved, setOverlaySaved] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [showForm1, setShowForm1] = useState(false);
  const [allocationMode, setAllocationMode] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [allocCell, setAllocCell] = useState(null);
  const [registerInfo, setRegisterInfo] = useState({ village: "", tehsil: "", district: "", mouza: "", channel: "", outlet_rd: "", side: "", sub_division: "", division: "", circle: "", zone: "" });
  const [savingRegister, setSavingRegister] = useState(false);
  const [existingRegId, setExistingRegId] = useState(null);

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

  // Parse editor settings for export (colors, killa visibility)
  const editorSettings = useMemo(() => {
    if (!selectedMap?.editor_settings) return {};
    try { return JSON.parse(selectedMap.editor_settings); } catch { return {}; }
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

  // ─── FORM 1 ALLOCATION (Farmer Patch Selection) ───────────────
  const outletForMoga = useMemo(
    () => mapObjects.find((o) => o.type === "outlet" && String(o.mogha_number) === String(selectedMoga)),
    [mapObjects, selectedMoga]
  );

  const { data: form1Existing } = useQuery({
    queryKey: ["form1-register", selectedMapId, selectedMoga],
    queryFn: () => base44.entities.Form1Register.filter({ map_id: selectedMapId }),
    enabled: !!selectedMapId,
  });

  const matchingRegister = useMemo(
    () => (form1Existing || []).find((r) => String(r.moga_number) === String(selectedMoga)),
    [form1Existing, selectedMoga]
  );

  // Pre-fill register header info from the map editor header line
  useEffect(() => {
    if (!selectedMap) return;
    setRegisterInfo({
      village: selectedMap.village || "",
      tehsil: selectedMap.tehsil || "",
      district: selectedMap.district || "",
      mouza: selectedMap.village || "",
      channel: selectedMap.rajbah || "",
      outlet_rd: outletForMoga?.mogha_number ? String(outletForMoga.mogha_number) : (selectedMap.moga_number || ""),
      side: outletForMoga?.mogha_side || selectedMap.mogha_side || "",
      sub_division: selectedMap.zilladar_section || selectedMap.section || "",
      division: selectedMap.district || "",
      circle: "",
      zone: "",
    });
  }, [selectedMap, outletForMoga]);

  // Load saved allocations when a register exists for this moga
  useEffect(() => {
    if (matchingRegister) {
      setExistingRegId(matchingRegister.id);
      try {
        setAllocations(JSON.parse(matchingRegister.rows_json || "[]"));
      } catch {
        setAllocations([]);
      }
    } else {
      setExistingRegId(null);
      setAllocations([]);
    }
  }, [matchingRegister]);

  const handleCellClick = useCallback((obj, mustNo, acre) => {
    setAllocCell({ obj, mustNo, acre });
  }, []);

  const handleAllocate = (row) => {
    setAllocations((prev) => [...prev, row]);
    setAllocCell(null);
  };

  const handleRemoveAllocation = (id) => setAllocations((prev) => prev.filter((a) => a.id !== id));

  const registerTotals = useMemo(() => {
    const kanal = allocations.reduce((s, a) => s + (a.kanal || 0), 0);
    return { kanal, acres: kanal / 8 };
  }, [allocations]);

  const handleSaveRegister = async () => {
    if (!selectedMapId) {
      toast.error("No map selected");
      return;
    }
    setSavingRegister(true);
    const payload = {
      map_id: selectedMapId,
      map_title: selectedMap?.title || "",
      moga_number: selectedMoga || "",
      village: registerInfo.village,
      tehsil: registerInfo.tehsil,
      district: registerInfo.district,
      mouza: registerInfo.mouza,
      channel_name: registerInfo.channel,
      outlet_rd: registerInfo.outlet_rd,
      outlet_side: registerInfo.side,
      rows_json: JSON.stringify(allocations),
      total_acres: +registerTotals.acres.toFixed(3),
      total_kanal: +registerTotals.kanal.toFixed(2),
      status: "draft",
    };
    try {
      if (existingRegId) {
        await base44.entities.Form1Register.update(existingRegId, payload);
      } else {
        const r = await base44.entities.Form1Register.create(payload);
        if (r?.id) setExistingRegId(r.id);
      }
      toast.success("Form 1 register saved");
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSavingRegister(false);
    }
  };

  // NOTE: Overlay is computed in handleMapClick when the second marker is placed,
  // or in handlePlaceByCoords / handleLowerLeftDrag / handleUpperLeftDrag when
  // coordinates are adjusted. Saved placements are preserved on the entity for
  // reference but do not auto-place.

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
    // 1. One-click placement — anchor upper-left corner, rotation 0° (straight), fixed scale (10-acre mustateel)
    if (placingStep === 1 && selectedMapId) {
      setPlacementPoint(latlng);
      setLowerLeftPoint(null);
      if (mapObjects.length > 0) {
        const transform = computeOneClickTransform(latlng, mapObjects, 0);
        if (transform) {
          setOverlay({ transform, rotation: 0, placementPoint: latlng });
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
          const validLatLngs = allLatLngs.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
          if (validLatLngs.length > 0 && mapRef.current) {
            const bounds = L.latLngBounds(validLatLngs.map(p => [p.lat, p.lng]));
            mapRef.current.flyToBounds(bounds, { padding: [80, 80], duration: 1 });
          }
        }
      }
      setPlacingStep(0);
      return;
    }

    // 2. Measurement tools
    if (!activeTool) return;

    if (activeTool === "marker") {
      setMarkers(prev => [...prev, { id: Date.now(), latlng, title: "", color: "#ef4444" }]);
    } else if (activeTool === "line") {
      setDraft(prev => {
        if (!prev || prev.type !== "line" || !Array.isArray(prev.points)) return { type: "line", points: [latlng] };
        return { ...prev, points: [...prev.points, latlng] };
      });
    } else if (activeTool === "polygon") {
      setDraft(prev => {
        if (!prev || prev.type !== "polygon" || !Array.isArray(prev.points)) return { type: "polygon", points: [latlng] };
        return { ...prev, points: [...prev.points, latlng] };
      });
    } else if (activeTool === "rectangle") {
      setDraft(prev => {
        if (!prev || prev.type !== "rectangle" || !prev.points || prev.points.length === 0) return { type: "rectangle", points: [latlng] };
        const c1 = prev.points[0];
        const c2 = latlng;
        const rect = { type: "rectangle", points: [c1, c2] };
        const m = rectMeasurements(c1, c2);
        setMeasurements(me => [...me, { id: Date.now(), ...rect, measurement: { type: "rectangle", ...m } }]);
        return null;
      });
    } else if (activeTool === "circle") {
      setDraft(prev => {
        if (!prev || prev.type !== "circle") return { type: "circle", center: latlng, radius: 0 };
        // Second click finalizes with current radius
        const r = haversine(prev.center.lat, prev.center.lng, latlng.lat, latlng.lng);
        const m = circleMeasurements(prev.center.lat, prev.center.lng, r);
        setMeasurements(me => [...me, { id: Date.now(), center: prev.center, radius: r, measurement: { type: "circle", ...m } }]);
        return null;
      });
    }
  }, [placingStep, selectedMapId, activeTool, placementPoint, mapObjects]);

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

  // Manual coordinate input for the upper-left (red) corner marker (marker 1)
  const handlePlaceByCoords = (coords) => {
    if (!selectedMapId) return;
    setPlacementPoint(coords);
    const rot = overlay?.rotation || 0;
    if (mapObjects.length > 0) {
      const transform = computeOneClickTransform(coords, mapObjects, rot);
      if (transform) setOverlay({ transform, rotation: rot, placementPoint: coords });
    }
    setPlacingStep(0);
  };

  // Dragging marker 1 (upper-left) — translate both markers, recompute overlay
  const handleUpperLeftDrag = (newLatLng) => {
    if (!placementPoint) return;
    const dx = newLatLng.lat - placementPoint.lat;
    const dy = newLatLng.lng - placementPoint.lng;
    setPlacementPoint(newLatLng);
    if (lowerLeftPoint) {
      const newLL = { lat: lowerLeftPoint.lat + dx, lng: lowerLeftPoint.lng + dy };
      setLowerLeftPoint(newLL);
      if (mapObjects.length > 0) {
        const transform = computeTwoPointTransform(newLatLng, newLL, mapObjects);
        if (transform) setOverlay({ transform, rotation: transform.rotationDeg || 0, placementPoint: newLatLng });
      }
    }
  };

  // Manual coordinate input for the lower-left (green) corner marker
  const handleLowerLeftByCoords = (coords) => {
    handleLowerLeftDrag(coords);
  };

  const handleSelectMap = (id) => {
    setSelectedMapId(id);
    setSelectedMoga("");
    setPlacementPoint(null);
    setOverlay(null);
    setLowerLeftPoint(null);
    setActiveMustateelId(null);
    setOverlaySaved(false);
    setPlacingStep(id ? 1 : 0); // enter two-click placement mode
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
    setLowerLeftPoint(null);
    setPlacingStep(0);
    setSelectedMapId("");
    setSelectedMoga("");
    setActiveMustateelId(null);
    setOverlaySaved(false);
  };

  const handleRePlace = () => {
    setOverlay(null);
    setPlacementPoint(null);
    setLowerLeftPoint(null);
    setPlacingStep(1);
    setActiveMustateelId(null);
    setOverlaySaved(false);
  };

  // Save overlay placement to server so it persists across sessions
  const handleSaveOverlay = async () => {
    if (!selectedMapId || !placementPoint) return;
    setSavingOverlay(true);
    try {
      await base44.entities.LandMap.update(selectedMapId, {
        geo_placement_lat: placementPoint.lat,
        geo_placement_lng: placementPoint.lng,
        geo_rotation: overlay?.rotation || 0,
        geo_moga_filter: selectedMoga || "",
      });
      setOverlaySaved(true);
    } catch (err) {
      alert("Save failed: " + (err.message || "unknown error"));
    } finally {
      setSavingOverlay(false);
    }
  };

  // Capture the live satellite map + cadastral overlay as a single canvas (for export).
  // Swaps in a CORS-enabled imagery layer (ArcGIS World Imagery) so the captured canvas
  // is not tainted, fits the view to the placed overlay, then restores the map.
  const handleCaptureSatellite = async ({ bw } = {}) => {
    const map = mapRef.current;
    if (!map || !overlay?.transform) throw new Error("Place the map overlay first");
    const allLatLngs = [];
    for (const o of mapObjects) {
      if (["mustateel", "muraba", "acre"].includes(o.type)) {
        const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
        for (const [cx, cy] of corners) allLatLngs.push(overlay.transform.transform(cx, cy));
      } else if (o.points?.length) {
        for (const p of o.points) allLatLngs.push(overlay.transform.transform(p.x, p.y));
      } else if (o.start && o.end) {
        allLatLngs.push(overlay.transform.transform(o.start.x, o.start.y));
        allLatLngs.push(overlay.transform.transform(o.end.x, o.end.y));
      }
    }
    const valid = allLatLngs.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (valid.length === 0) throw new Error("No overlay bounds");
    const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
    const savedCenter = map.getCenter();
    const savedZoom = map.getZoom();
    setCapturing(true);
    const arcgisUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    const tileLayer = L.tileLayer(arcgisUrl, { crossOrigin: true, maxZoom: 19 });
    tileLayer.addTo(map);
    map.fitBounds(bounds, { padding: [60, 60], animate: false });
    try {
      await new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        tileLayer.once("load", finish);
        setTimeout(finish, 6000);
      });
      await new Promise((r) => setTimeout(r, 500));
      const canvas = await html2canvas(map.getContainer(), {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: "#0f1923",
      });
      if (bw) {
        const ctx = canvas.getContext("2d");
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          d[i] = d[i + 1] = d[i + 2] = g;
        }
        ctx.putImageData(img, 0, 0);
      }
      return canvas;
    } finally {
      map.removeLayer(tileLayer);
      map.flyTo(savedCenter, savedZoom, { animate: false });
      setCapturing(false);
    }
  };

  // Click on mustateel → toggle killa display for that parcel
  const handleMustateelClick = useCallback((id) => {
    setActiveMustateelId(prev => prev === id ? null : id);
  }, []);

  const handleClearMeasurements = () => { setMeasurements([]); setDraft(null); setLiveMeasurement(null); };
  const handleDeleteMeasurement = (id) => { setMeasurements(prev => prev.filter(m => m.id !== id)); };

  const handleMarkerUpdate = (id, changes) => { setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...changes } : m)); };
  const handleMarkerDelete = (id) => { setMarkers(prev => prev.filter(m => m.id !== id)); };

  const handleExport = () => {
    if (!selectedMapId || !mapObjects.length) { alert("Select a map first"); return; }
    setShowExportDialog(true);
  };

  const handleRotationChange = (deg) => {
    if (!placementPoint || mapObjects.length === 0) return;
    const transform = computeOneClickTransform(placementPoint, mapObjects, deg);
    if (transform) setOverlay({ transform, rotation: deg, placementPoint });
  };

  // Two-point fine adjustment — user drags the lower-left (green) marker to
  // re-orient the overlay. Scale + rotation derived from the two anchor points.
  const handleLowerLeftDrag = (latlng) => {
    setLowerLeftPoint(latlng);
    if (!placementPoint || mapObjects.length === 0) return;
    const transform = computeTwoPointTransform(placementPoint, latlng, mapObjects);
    if (transform) setOverlay({ transform, rotation: transform.rotationDeg || 0, placementPoint });
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
        {!capturing && <TileLayer url={tileUrl} />}
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
            activeMustateelId={activeMustateelId}
            onMustateelClick={handleMustateelClick}
          />
        )}

        {/* Allocation layer — clickable killa (acre) cells + allocated highlights */}
        {overlay?.transform && !capturing && (
          <AllocationLayer
            objects={mapObjects}
            overlay={overlay}
            selectedMoga={selectedMoga}
            allocations={allocations}
            mode={allocationMode}
            onCellClick={handleCellClick}
          />
        )}

        {/* Corner placement marker — shows where the map corner is placed + coordinates */}
        {placementPoint && !capturing && (
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

        {/* Lower-left anchor marker — shown only while placing (rotation set via slider / coordinate button after placement) */}
        {lowerLeftPoint && !overlay && !capturing && (
          <Marker
            position={[lowerLeftPoint.lat, lowerLeftPoint.lng]}
            icon={lowerLeftIcon()}
            draggable
            eventHandlers={{ dragend: (e) => handleLowerLeftDrag(e.target.getLatLng()) }}
          >
            <Tooltip permanent direction="right" className="placement-coords-tooltip">
              <div className="text-[10px] font-mono leading-tight">
                <div className="font-bold text-yellow-600 flex items-center gap-1">
                  <span>📍</span> نیچا کونا پلیس مارکر
                </div>
                <div className="text-red-600 font-semibold">Lat: {lowerLeftPoint.lat.toFixed(6)}</div>
                <div className="text-red-600 font-semibold">Lng: {lowerLeftPoint.lng.toFixed(6)}</div>
              </div>
            </Tooltip>
          </Marker>
        )}

        {/* Completed measurements — click to delete · coordinates shown */}
        {!capturing && measurements.map(m => {
          const delOpts = { color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.15, weight: 3 };
          let coord;
          if (m.type === "circle") coord = m.center;
          else if (m.type === "polygon") {
            const c = m.points.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
            coord = { lat: c.lat / m.points.length, lng: c.lng / m.points.length };
          } else if (m.points) coord = m.points[0];
          const coordStr = coord ? `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}` : "";
          if (m.type === "line") return (
            <Polyline key={m.id} positions={m.points.map(p => [p.lat, p.lng])} pathOptions={delOpts} eventHandlers={{ click: () => handleDeleteMeasurement(m.id) }}>
              <Tooltip permanent direction="top">
                <div className="text-xs font-bold text-red-600 leading-tight">
                  <div>{fmtDistFeet(m.measurement.length)}</div>
                  <div className="text-[8px] font-mono text-slate-600">{coordStr}</div>
                </div>
              </Tooltip>
            </Polyline>
          );
          if (m.type === "polygon") return (
            <Polygon key={m.id} positions={m.points.map(p => [p.lat, p.lng])} pathOptions={delOpts} eventHandlers={{ click: () => handleDeleteMeasurement(m.id) }}>
              <Tooltip permanent direction="top">
                <div className="text-xs font-bold text-red-600 leading-tight">
                  <div>{fmtArea(m.measurement.area)}</div>
                  <div className="text-[8px] font-mono text-slate-600">{coordStr}</div>
                </div>
              </Tooltip>
            </Polygon>
          );
          if (m.type === "rectangle") return (
            <Polygon key={m.id} positions={[[m.points[0].lat, m.points[0].lng], [m.points[0].lat, m.points[1].lng], [m.points[1].lat, m.points[1].lng], [m.points[1].lat, m.points[0].lng]]} pathOptions={delOpts} eventHandlers={{ click: () => handleDeleteMeasurement(m.id) }}>
              <Tooltip permanent direction="top">
                <div className="text-xs font-bold text-red-600 leading-tight">
                  <div>{fmtArea(m.measurement.area)}</div>
                  <div className="text-[8px] font-mono text-slate-600">{coordStr}</div>
                </div>
              </Tooltip>
            </Polygon>
          );
          if (m.type === "circle") return (
            <Circle key={m.id} center={[m.center.lat, m.center.lng]} radius={m.radius} pathOptions={delOpts} eventHandlers={{ click: () => handleDeleteMeasurement(m.id) }}>
              <Tooltip permanent direction="top">
                <div className="text-xs font-bold text-red-600 leading-tight">
                  <div>{fmtArea(m.measurement.area)}</div>
                  <div className="text-[8px] font-mono text-slate-600">{coordStr}</div>
                </div>
              </Tooltip>
            </Circle>
          );
          return null;
        })}

        {/* Draft preview */}
        {!capturing && draftPreview}

        {/* User markers with popup */}
        {!capturing && markers.map(m => (
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

      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onGPS={handleGPS} gpsActive={gpsActive} onPlaceByCoords={() => setShowCoordDialog(true)} onPlaceByCoordsLower={() => setShowLowerLeftDialog(true)} />
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
          placing={placingStep > 0}
          overlayReady={!!overlay}
          overlay={overlay}
          onRotationChange={handleRotationChange}
          onRePlace={handleRePlace}
          onClear={handleClearOverlay}
          onSave={handleSaveOverlay}
          saving={savingOverlay}
          saved={overlaySaved}
          mustateelAreas={mustateelAreas}
          onEditUpperCorner={() => setShowCoordDialog(true)}
          onEditLowerCorner={() => setShowLowerLeftDialog(true)}
          onExport={() => setShowExportDialog(true)}
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

      {overlay && (
        <button
          onClick={() => setShowForm1(true)}
          className="absolute top-14 right-[27rem] z-[1000] px-3 h-8 rounded-full shadow-xl text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-all flex items-center gap-1"
        >
          <FileText className="w-3 h-3" />
          Form 1 Register
        </button>
      )}

      {overlay && (
        <button
          onClick={() => setAllocationMode((v) => !v)}
          className={`absolute top-14 right-[34rem] z-[1000] px-3 h-8 rounded-full shadow-xl text-[10px] font-bold transition-all flex items-center gap-1 ${allocationMode ? "bg-green-600 text-white" : "bg-white text-slate-600"}`}
        >
          <MousePointerClick className="w-3 h-3" />
          {allocationMode ? "Allocating ON" : "Allocate Patches"}
        </button>
      )}

      {allocationMode && overlay && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[1001] bg-green-600 text-white text-[11px] font-bold px-4 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> مستطیل کے کسی ایکڑ سیل پر کلک کریں — زمیندار کا حصہ الاٹ کریں
        </div>
      )}

      {/* Click mustateel hint */}
      {overlay && killaVisible && !activeMustateelId && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[1000] bg-black/80 text-white text-[11px] font-medium px-3 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          کسی مستطیل پر کلک کریں — کلا نمبر اور گرڈ لائنز دکھائی دیں گے
        </div>
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

      {/* Placement hint — two-click mode with live coordinates */}
      {placingStep > 0 && selectedMapId && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-[1001] text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex flex-col items-center gap-0.5 animate-pulse"
          style={{ background: "#dc2626" }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            نقشہ کا اوپری کونا لگائیں — سیدھا، 0°
          </div>
          {mouseLatLng && (
            <div className="text-[10px] font-mono opacity-90">
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

      {/* Manual coordinate input for lower-left (green) corner */}
      <CoordinateDialog
        open={showLowerLeftDialog}
        onClose={() => setShowLowerLeftDialog(false)}
        onPlace={handleLowerLeftByCoords}
        mouseLatLng={lowerLeftPoint || mouseLatLng}
      />

      {/* Export dialog — PNG / PDF / SVG with moga filter */}
      <GeoMapExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        mapData={selectedMap}
        objects={mapObjects}
        colorSettings={editorSettings?.colors || {}}
        selectedMoga={selectedMoga}
        overlayReady={!!overlay}
        onCaptureSatellite={handleCaptureSatellite}
      />

      {/* Farmer patch allocation dialog */}
      <AllocationDialog
        open={!!allocCell}
        data={allocCell}
        remaining={allocCell ? remainingKanal(allocations, allocCell.mustNo, allocCell.acre) : 0}
        existing={allocCell ? acreAllocations(allocations, allocCell.mustNo, allocCell.acre) : []}
        info={registerInfo}
        onAllocate={handleAllocate}
        onClose={() => setAllocCell(null)}
      />

      {/* Form 1 Register */}
      <Form1RegisterPanel
        open={showForm1}
        onClose={() => setShowForm1(false)}
        mapData={selectedMap}
        selectedMoga={selectedMoga}
        info={registerInfo}
        setInfo={setRegisterInfo}
        allocations={allocations}
        onRemove={handleRemoveAllocation}
        totals={registerTotals}
        onSave={handleSaveRegister}
        saving={savingRegister}
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