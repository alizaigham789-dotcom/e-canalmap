import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Circle, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronDown, Layers, MapPin, Trash2, Save, PenTool, Pencil, Waves, Map as MapIcon, Satellite, Move, Eye, EyeOff } from "lucide-react";

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
import AllocationToolbar from "@/components/geomap/AllocationToolbar";
import AllOverlaysLayer from "@/components/geomap/AllOverlaysLayer";
import AllocationLayer from "@/components/geomap/AllocationLayer";
import AllocationDialog from "@/components/geomap/AllocationDialog";
import EditAllocationDialog from "@/components/geomap/EditAllocationDialog";
import PatchDrawLayer from "@/components/geomap/PatchDrawLayer";
import PatchDialog from "@/components/geomap/PatchDialog";
import KhalDrawLayer from "@/components/geomap/KhalDrawLayer";
import MogaDrawLayer from "@/components/geomap/MogaDrawLayer";
import { remainingKanal, acreAllocations, kanalUsedInAcre, parcelKillaCells } from "@/lib/allocationEngine";
import { patchArea, coveredAcres, khasraListFromCovered, patchesOverlap, buildGridPoints } from "@/lib/patchSnap";
import { DrawingStateManager } from "@/lib/gisEngine";
import { inverseTransform } from "@/lib/geoOverlay";
import { arrangeMogas, autoAttachPlacement, suggestNextMogas, computePlacementForMustateel } from "@/lib/mogaArrange";
import MogaMoveLayer from "@/components/geomap/MogaMoveLayer";
import MogaToolsToolbar from "@/components/geomap/MogaToolsToolbar";
import DummyMustateelLayer from "@/components/geomap/DummyMustateelLayer";
import DummyMustateelDialog from "@/components/geomap/DummyMustateelDialog";
import GeoMapHub from "@/components/geomap/GeoMapHub";
import SavedMogaClickLayer from "@/components/geomap/SavedMogaClickLayer";
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
  const queryClient = useQueryClient();
  const mapRef = useRef(null);
  const [center] = useState([32.2889, 72.3525]);
  const [zoom, setZoom] = useState(13);
  const [hybrid, setHybrid] = useState(true);
  const [viewMode, setViewMode] = useState("overlay"); // "overlay" | "view"
  const [entered, setEntered] = useState(false); // hub → sub-module entry
  const [activeTool, setActiveTool] = useState(null);
  const [filters, setFilters] = useState({ district: "", tehsil: "", village: "", rajbah: "" });

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
  const [showCanals, setShowCanals] = useState(true);
  const [activeMustateelIds, setActiveMustateelIds] = useState(() => new Set());
  const autoPlacedRef = useRef(null);
  const suppressAutoSaveRef = useRef(null); // blocks the debounced placement save while a map's placement is being deleted
  const lastSavedRef = useRef(""); // tracks last-saved allocations JSON to avoid auto-save loops
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [overlaySaved, setOverlaySaved] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [showForm1, setShowForm1] = useState(false);
  const [allocTool, setAllocTool] = useState(null); // null | "cell" | "draw" | "edit"
  const [khalTool, setKhalTool] = useState(null); // null | "draw" | "edit"
  const [mogaTool, setMogaTool] = useState(null); // null | "draw"
  const [moveTool, setMoveTool] = useState(false); // drag-to-move placed mogas
  const [allocations, setAllocations] = useState([]);
  const [allocCell, setAllocCell] = useState(null);
  const [editAllocCell, setEditAllocCell] = useState(null);
  const [patchDialog, setPatchDialog] = useState(null);
  const [activePatchId, setActivePatchId] = useState(null);
  const [registerInfo, setRegisterInfo] = useState({ village: "", tehsil: "", district: "", mouza: "", channel: "", outlet_rd: "", side: "", sub_division: "", division: "", circle: "", zone: "" });
  const [savingRegister, setSavingRegister] = useState(false);
  const [existingRegId, setExistingRegId] = useState(null);
  const [selectedMuraba, setSelectedMuraba] = useState("");
  const [dummyDialog, setDummyDialog] = useState(null); // { dummy, geo } — dummy mustateel attach

  // Measurement tools state
  const [markers, setMarkers] = useState([]); // user markers
  const [measurements, setMeasurements] = useState([]); // completed measurements
  const [draft, setDraft] = useState(null); // active drawing draft
  const [liveMeasurement, setLiveMeasurement] = useState(null); // live measurement for display
  const [mouseLatLng, setMouseLatLng] = useState(null);

  // ─── DATA ────────────────────────────────────────────────────
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: rawMaps } = useQuery({
    queryKey: ["geomap-maps"],
    queryFn: () => base44.entities.LandMap.list("-updated_date", 500),
  });

  // Per-user isolation: a regular user only sees their own maps in the GIS
  // overlay (mogas they created in the map editor). Admins see all maps.
  const maps = useMemo(() => {
    const all = rawMaps || [];
    if (!currentUser) return all;
    if (currentUser.role === "admin") return all;
    return all.filter((m) =>
      m.created_by_id === currentUser.id ||
      m.status === "approved" ||
      m.status === "published" ||
      m.is_template
    );
  }, [rawMaps, currentUser]);

  const { data: selectedMap } = useQuery({
    queryKey: ["geomap-map", selectedMapId],
    queryFn: () => base44.entities.LandMap.filter({ id: selectedMapId }).then(r => r[0]),
    enabled: !!selectedMapId,
  });

  const mapObjects = useMemo(() => {
    if (!selectedMap?.drawing_data) return [];
    return DrawingStateManager.deserialize(selectedMap.drawing_data);
  }, [selectedMap]);

  // Map View mode — synthetic transform anchored at map center (no satellite).
  // Renders the cadastral drawing in leaflet at true scale so the user can view
  // the map and run Form 1 allocation without georeferencing.
  const viewTransform = useMemo(() => {
    if (viewMode !== "view" || !mapObjects.length) return null;
    // Prefer the saved geo placement so placed mogas line up together in View mode
    if (selectedMap?.geo_placement_lat != null && selectedMap?.geo_placement_lng != null) {
      const t = computeOneClickTransform(
        { lat: selectedMap.geo_placement_lat, lng: selectedMap.geo_placement_lng },
        mapObjects,
        selectedMap.geo_rotation || 0
      );
      if (t) return t;
    }
    return computeOneClickTransform({ lat: center[0], lng: center[1] }, mapObjects, 0);
  }, [viewMode, mapObjects, selectedMap, center]);

  const activeOverlay = useMemo(() => {
    if (viewMode === "view" && viewTransform) return { transform: viewTransform, rotation: 0, placementPoint: null };
    return overlay;
  }, [viewMode, viewTransform, overlay]);

  // Parse editor settings for export (colors, killa visibility)
  const editorSettings = useMemo(() => {
    if (!selectedMap?.editor_settings) return {};
    try { return JSON.parse(selectedMap.editor_settings); } catch { return {}; }
  }, [selectedMap]);

  const districts = useMemo(() => [...new Set((maps || []).map(m => m.district).filter(Boolean))].sort(), [maps]);
  const tehsils = useMemo(() => [...new Set((maps || []).filter(m => !filters.district || m.district === filters.district).map(m => m.tehsil).filter(Boolean))].sort(), [maps, filters.district]);
  const villages = useMemo(() => [...new Set((maps || []).filter(m => (!filters.district || m.district === filters.district) && (!filters.tehsil || m.tehsil === filters.tehsil)).map(m => m.village).filter(Boolean))].sort(), [maps, filters.district, filters.tehsil]);

  // Rajbahs (canal minors) available for the selected mouza — each rajbah feeds
  // multiple mogas; selecting one shows all its mogas' maps together.
  const rajbahs = useMemo(() => [...new Set((maps || []).filter(m =>
    (!filters.district || m.district === filters.district) &&
    (!filters.tehsil || m.tehsil === filters.tehsil) &&
    (!filters.village || m.village === filters.village)
  ).map(m => m.rajbah).filter(Boolean))].sort(), [maps, filters]);

  // All maps matching the current district/tehsil/village/rajbah filter — used to show
  // every moga of the selected mouza (or rajbah) together on the satellite map.
  // All maps matching the current district/tehsil/village/rajbah filter — used to show
  // every moga of the selected mouza (or rajbah) together on the satellite map.
  // Rajbah is included so selecting a canal shows only that canal's mogas.
  const villageMaps = useMemo(() => (maps || []).filter(m =>
    (!filters.district || m.district === filters.district) &&
    (!filters.tehsil || m.tehsil === filters.tehsil) &&
    (!filters.village || m.village === filters.village) &&
    (!filters.rajbah || m.rajbah === filters.rajbah)
  ), [maps, filters]);

  // Suggested next mogas — unplaced maps of the selected mouza that can chain
  // off the already-placed mogas via mustateel Khasra continuity (555 → 556).
  const suggestions = useMemo(() => {
    if (viewMode !== "overlay") return [];
    const v = selectedMap?.village || filters.village;
    if (!v) return [];
    return suggestNextMogas(maps || [], v);
  }, [maps, selectedMap, filters.village, viewMode]);

  // Moga numbers available across the filtered maps (for the top cascade).
  const filterMogas = useMemo(() => {
    const s = new Set();
    for (const m of (maps || [])) {
      if (filters.district && m.district !== filters.district) continue;
      if (filters.tehsil && m.tehsil !== filters.tehsil) continue;
      if (filters.village && m.village !== filters.village) continue;
      if (filters.rajbah && m.rajbah !== filters.rajbah) continue;
      if (m.moga_number) s.add(String(m.moga_number));
    }
    return [...s].sort((a, b) => +a - +b);
  }, [maps, filters]);

  // Map View mode — only show mogas that have already been overlaid (placed)
  // on the satellite map. Selecting one flies to its placed location.
  // All mogas that have been placed (overlaid & saved) across EVERY editor map —
  // not just the filtered village, so saved mogas always surface in the cascade.
  const placedMogas = useMemo(() => {
    const s = new Set();
    for (const m of (maps || [])) {
      if (m.geo_placement_lat != null && m.geo_placement_lng != null && m.moga_number) {
        s.add(String(m.moga_number));
      }
    }
    return [...s].sort((a, b) => +a - +b);
  }, [maps]);

  // Top moga cascade — ONLY mogas currently placed (overlaid) on the satellite
  // map. When a moga's overlay is removed (geo_placement nulled), it disappears
  // from this dropdown immediately. Unplaced mogas are selected & placed via the
  // GIS Overlay panel's Map Select dropdown instead.
  const cascadeMogas = useMemo(() => placedMogas, [placedMogas]);

  const availableMogas = useMemo(() => {
    const s = new Set();
    // Always include the selected map's own moga number so the filter shows
    // even when mustateels don't carry a per-parcel mogaNumber tag.
    if (selectedMap?.moga_number) s.add(String(selectedMap.moga_number));
    for (const o of mapObjects) {
      if ((o.type === "chakbandi" || o.type === "mustateel") && o.mogaNumber) s.add(o.mogaNumber);
    }
    return [...s].sort((a, b) => parseInt(a) - parseInt(b));
  }, [mapObjects, selectedMap]);

  const mogaMustateels = useMemo(() => mapObjects
    .filter(o => (o.type === "mustateel" || o.type === "muraba") && o.label)
    .map(o => ({ mustNo: o.label, acreCount: parcelKillaCells(o).length }))
    .sort((a, b) => +a.mustNo - +b.mustNo), [mapObjects]);

  const patchesWithGeometry = useMemo(() => allocations.filter((a) => a.geometry), [allocations]);
  const khalsExist = useMemo(() => mapObjects.some(o => o.type === "khal"), [mapObjects]);

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

  const matchingRegister = useMemo(() => {
    const list = form1Existing || [];
    if (list.length === 0) return undefined;
    // Single register for this map → use it regardless of stored moga number
    // (older records were saved with an empty moga_number, and the map's overlay
    // can be deleted & re-added — the allocation data must survive and reload).
    if (list.length === 1) return list[0];
    // Multiple registers (one per moga) → match by moga number
    return list.find((r) => {
      const moga = String(r.moga_number || "");
      return moga === String(selectedMoga) || (!selectedMoga && moga === String(selectedMap?.moga_number || ""));
    });
  }, [form1Existing, selectedMoga, selectedMap]);

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
      sub_division: selectedMap.zilladar_section || selectedMap.section || localStorage.getItem("gis_sub_division") || "",
      division: localStorage.getItem("gis_division") || selectedMap.district || "",
      circle: localStorage.getItem("gis_circle") || "",
      zone: "",
    });
  }, [selectedMap, outletForMoga]);

  // Persist allocations to server (create or update the register record).
  // Used by the auto-save effect so every allocate/remove/edit survives reload.
  const persistAllocations = useCallback(async (allocs) => {
    if (!selectedMapId) return;
    const kanal = allocs.reduce((s, a) => s + (a.kanal || 0), 0);
    const payload = {
      map_id: selectedMapId,
      map_title: selectedMap?.title || "",
      moga_number: selectedMap?.moga_number || selectedMoga || "",
      village: registerInfo.village,
      tehsil: registerInfo.tehsil,
      district: registerInfo.district,
      mouza: registerInfo.mouza,
      channel_name: registerInfo.channel,
      outlet_rd: registerInfo.outlet_rd,
      outlet_side: registerInfo.side,
      rows_json: JSON.stringify(allocs),
      total_acres: +(kanal / 8).toFixed(3),
      total_kanal: +kanal.toFixed(2),
      status: "draft",
    };
    try {
      if (existingRegId) {
        await base44.entities.Form1Register.update(existingRegId, payload);
      } else {
        const r = await base44.entities.Form1Register.create(payload);
        if (r?.id) setExistingRegId(r.id);
      }
      lastSavedRef.current = JSON.stringify(allocs);
      queryClient.invalidateQueries({ queryKey: ["form1-register", selectedMapId] });
    } catch (e) {
      // silent — user-facing errors surface in the manual Save button flow
    }
  }, [selectedMapId, selectedMap, selectedMoga, registerInfo, existingRegId, queryClient]);

  // Load saved allocations when a register exists for this moga
  useEffect(() => {
    if (matchingRegister) {
      setExistingRegId(matchingRegister.id);
      try {
        const loaded = JSON.parse(matchingRegister.rows_json || "[]");
        setAllocations(loaded);
        lastSavedRef.current = JSON.stringify(loaded);
      } catch {
        setAllocations([]);
        lastSavedRef.current = "[]";
      }
    } else {
      setExistingRegId(null);
      setAllocations([]);
      lastSavedRef.current = "[]";
    }
  }, [matchingRegister]);

  // Auto-save — whenever allocations change (allocate/remove/edit/patch), persist
  // to the server so they survive page reloads. Skips when the change is just the
  // data loaded from the server (lastSavedRef matches) to avoid a save loop.
  useEffect(() => {
    if (!selectedMapId) return;
    const json = JSON.stringify(allocations);
    if (json === lastSavedRef.current) return;
    const timer = setTimeout(() => { persistAllocations(allocations); }, 1000);
    return () => clearTimeout(timer);
  }, [allocations, selectedMapId, persistAllocations]);

  const handleCellClick = useCallback((obj, mustNo, acre) => {
    if (kanalUsedInAcre(allocations, mustNo, acre) >= 8) {
      toast.error("یہ کلا مکمل الوٹ ہے — دوبارہ نہیں ہو سکتا");
      return;
    }
    setAllocCell({ obj, mustNo, acre });
  }, [allocations]);

  const handleAllocate = (rows) => {
    setAllocations((prev) => [...prev, ...rows]);
    setAllocCell(null);
  };

  const handleRemoveAllocation = (id) => setAllocations((prev) => prev.filter((a) => a.id !== id));

  // Click a green (allocated) patch → open its properties for editing.
  const handleEditAllocation = useCallback((obj, mustNo, acre) => {
    setEditAllocCell({ obj, mustNo, acre });
  }, []);

  // Patch an existing allocation (farmer details / kanal positions) — reflects on
  // the green patch AND the Form 1 register (shared allocations state).
  const handleUpdateAllocation = (id, changes) => {
    setAllocations((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const next = { ...a, ...changes };
      if (changes.kanal != null) next.acres = changes.kanal / 8;
      return next;
    }));
  };

  // Re-edit an entire occupier group (same CNIC/name): update farmer name, khata, etc.
  const handleUpdateGroup = (groupKey, changes) => {
    setAllocations((prev) =>
      prev.map((a) => {
        const key = a.cnic ? `cnic:${a.cnic}` : `name:${a.farmer_name || ""}||${a.father || ""}`;
        return key === groupKey ? { ...a, ...changes } : a;
      })
    );
  };

  const handleDrawComplete = useCallback((latlngs, area, khasra) => {
    const existing = allocations.filter((a) => a.geometry);
    if (patchesOverlap(latlngs, existing)) {
      toast.error("یہ پیچ پہلے سے موجود پیچ پر اوورلیپ کر رہا ہے — دوسری جگہ بنائیں");
      return;
    }
    setPatchDialog({ latlngs, area, khasra });
  }, [allocations]);

  const handleAddPatch = (row) => {
    setAllocations((prev) => [...prev, row]);
    setPatchDialog(null);
  };

  const handleSelectPatch = useCallback((id) => setActivePatchId(id), []);

  const handleUpdatePatchGeometry = useCallback((id, latlngs) => {
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const area = patchArea(latlngs);
        const covered = coveredAcres(latlngs, mapObjects, activeOverlay?.transform, selectedMoga);
        const khasra = khasraListFromCovered(covered);
        return { ...a, geometry: latlngs, kanal: area.kanal, acres: area.acres, khasra: khasra.join("; ") };
      })
    );
  }, [mapObjects, activeOverlay, selectedMoga]);

  // ─── KHAL DRAW / EDIT (GeoMap) ───────────────────────────────
  // Save a new khal drawn on the satellite map into the map's drawing_data.
  const handleKhalDrawn = useCallback(async (khal) => {
    if (!selectedMapId || !selectedMap) return;
    const currentObjs = selectedMap.drawing_data ? DrawingStateManager.deserialize(selectedMap.drawing_data) : [];
    const updated = [...currentObjs, khal];
    try {
      await base44.entities.LandMap.update(selectedMapId, { drawing_data: JSON.stringify(updated) });
      queryClient.invalidateQueries({ queryKey: ["geomap-map", selectedMapId] });
      toast.success("خال محفوظ ہو گیا");
    } catch (e) {
      toast.error("خال محفوظ نہیں ہوا");
    }
  }, [selectedMapId, selectedMap, queryClient]);

  // Update an existing khal's points (vertex drag in edit mode)
  const handleKhalUpdated = useCallback(async (khalId, newPoints) => {
    if (!selectedMapId || !selectedMap) return;
    const currentObjs = selectedMap.drawing_data ? DrawingStateManager.deserialize(selectedMap.drawing_data) : [];
    const updated = currentObjs.map(o => o.id === khalId ? { ...o, points: newPoints } : o);
    try {
      await base44.entities.LandMap.update(selectedMapId, { drawing_data: JSON.stringify(updated) });
      queryClient.invalidateQueries({ queryKey: ["geomap-map", selectedMapId] });
    } catch (e) {
      toast.error("خال اپڈیٹ نہیں ہوا");
    }
  }, [selectedMapId, selectedMap, queryClient]);

  // Delete a khal from the map's drawing_data
  const handleKhalDeleted = useCallback(async (khalId) => {
    if (!selectedMapId || !selectedMap) return;
    const currentObjs = selectedMap.drawing_data ? DrawingStateManager.deserialize(selectedMap.drawing_data) : [];
    const updated = currentObjs.filter(o => o.id !== khalId);
    try {
      await base44.entities.LandMap.update(selectedMapId, { drawing_data: JSON.stringify(updated) });
      queryClient.invalidateQueries({ queryKey: ["geomap-map", selectedMapId] });
      toast.success("خال حذف ہو گیا");
    } catch (e) {
      toast.error("خال حذف نہیں ہوا");
    }
  }, [selectedMapId, selectedMap, queryClient]);

  // ─── MOGA (OUTLET) DRAW (GeoMap) ───────────────────────────────
  // Save a new outlet (moga) drawn on the GeoMap into the map's drawing_data
  // so it appears in the Map Editor in exactly the same place (and passes
  // through the same mustateels), identical to a khal drawn here.
  const handleMogaDrawn = useCallback(async (outlet) => {
    if (!selectedMapId || !selectedMap) return;
    const currentObjs = selectedMap.drawing_data ? DrawingStateManager.deserialize(selectedMap.drawing_data) : [];
    const updated = [...currentObjs, outlet];
    try {
      await base44.entities.LandMap.update(selectedMapId, { drawing_data: JSON.stringify(updated) });
      queryClient.invalidateQueries({ queryKey: ["geomap-map", selectedMapId] });
      toast.success("موگہ محفوظ ہو گیا");
    } catch (e) {
      toast.error("موگہ محفوظ نہیں ہوا");
    }
  }, [selectedMapId, selectedMap, queryClient]);

  // Update an existing moga (outlet) — vertex drag in edit mode
  const handleMogaUpdated = useCallback(async (mogaId, newStart, newEnd) => {
    if (!selectedMapId || !selectedMap) return;
    const currentObjs = selectedMap.drawing_data ? DrawingStateManager.deserialize(selectedMap.drawing_data) : [];
    const updated = currentObjs.map(o => o.id === mogaId ? { ...o, start: newStart, end: newEnd } : o);
    try {
      await base44.entities.LandMap.update(selectedMapId, { drawing_data: JSON.stringify(updated) });
      queryClient.invalidateQueries({ queryKey: ["geomap-map", selectedMapId] });
    } catch (e) {
      toast.error("موگہ اپڈیٹ نہیں ہوا");
    }
  }, [selectedMapId, selectedMap, queryClient]);

  // Delete a moga (outlet) from the map's drawing_data
  const handleMogaDeleted = useCallback(async (mogaId) => {
    if (!selectedMapId || !selectedMap) return;
    const currentObjs = selectedMap.drawing_data ? DrawingStateManager.deserialize(selectedMap.drawing_data) : [];
    const updated = currentObjs.filter(o => o.id !== mogaId);
    try {
      await base44.entities.LandMap.update(selectedMapId, { drawing_data: JSON.stringify(updated) });
      queryClient.invalidateQueries({ queryKey: ["geomap-map", selectedMapId] });
      toast.success("موگہ حذف ہو گیا");
    } catch (e) {
      toast.error("موگہ حذف نہیں ہوا");
    }
  }, [selectedMapId, selectedMap, queryClient]);

  // Grid intersections (lat/lng) used to snap khal/moga drawing to killa grid lines
  const gridPoints = useMemo(() => buildGridPoints(mapObjects, activeOverlay?.transform, selectedMoga), [mapObjects, activeOverlay, selectedMoga]);

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
      moga_number: selectedMap?.moga_number || selectedMoga || "",
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
      // Invalidate so the panel reloads fresh data on next open (view & overlay modes)
      queryClient.invalidateQueries({ queryKey: ["form1-register", selectedMapId] });
      toast.success("Form 1 register saved");
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSavingRegister(false);
    }
  };

  // Auto-place the overlay from saved placement coordinates when a map is selected.
  // If the map has saved geo_placement, restore it at that exact location; otherwise
  // enter one-click placement mode so the user can place it fresh.
  useEffect(() => {
    if (viewMode !== "overlay") return;
    if (!selectedMap || !mapObjects.length) return;
    if (autoPlacedRef.current === selectedMap.id) return;
    autoPlacedRef.current = selectedMap.id;
    if (selectedMap.geo_placement_lat != null && selectedMap.geo_placement_lng != null) {
      const latlng = { lat: selectedMap.geo_placement_lat, lng: selectedMap.geo_placement_lng };
      const rot = selectedMap.geo_rotation || 0;
      const transform = computeOneClickTransform(latlng, mapObjects, rot);
      if (transform) {
        setOverlay({ transform, rotation: rot, placementPoint: latlng });
        setPlacementPoint(latlng);
        setOverlaySaved(true);
        if (selectedMap.geo_moga_filter) setSelectedMoga(selectedMap.geo_moga_filter);
        const bc = getBottomMustateelCorner(mapObjects);
        if (bc) setLowerLeftPoint(transform.transform(bc.x, bc.y));
        setPlacingStep(0);
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
        const valid = allLatLngs.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
        if (valid.length) {
          const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
          safeFly(m => m.flyToBounds(bounds, { padding: [80, 80], duration: 0.8 }));
        }
      }
    } else {
      // No saved placement — try to AUTO-ATTACH beside the placed mogas of the same
      // mouza (matching mustateel Khasra numbers, side-by-side, no gap, same row).
      const attach = autoAttachPlacement(maps, selectedMap);
      if (attach) {
        const attachRot = attach.rotation || 0;
        const transform = computeOneClickTransform(attach.placement, mapObjects, attachRot);
        if (transform) {
          setOverlay({ transform, rotation: attachRot, placementPoint: attach.placement });
          setPlacementPoint(attach.placement);
          setOverlaySaved(false);
          setPlacingStep(0);
          const bc = getBottomMustateelCorner(mapObjects);
          if (bc) setLowerLeftPoint(transform.transform(bc.x, bc.y));
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
          const valid = allLatLngs.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
          if (valid.length) {
            const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
            safeFly(m => m.flyToBounds(bounds, { padding: [80, 80], duration: 0.8 }));
          }
          toast.success(`نیا موگہ پہلے نقشے سے جڑ گیا — کہسڑا ${attach.matchedLabel}`);
          return;
        }
      }
      setPlacingStep(1);
      // Enter placement mode at a high zoom so the map is placed accurately over
      // high-resolution satellite tiles (clearer Earth image in the exported PDF).
      if (mapRef.current) mapRef.current.flyTo(mapRef.current.getCenter(), 18, { duration: 0.6 });
    }
  }, [selectedMap, mapObjects, maps]);

  // Map View mode — fit the whole cadastral drawing on screen (no satellite).
  // When a specific moga is selected, skip — the fly-to-moga effect handles it.
  useEffect(() => {
    if (viewMode !== "view" || !viewTransform || !mapRef.current || !mapObjects.length) return;
    if (selectedMoga) return; // a specific moga is selected → fly-to-moga effect handles it
    const collect = (objs, t, arr) => {
      for (const o of objs) {
        if (["mustateel", "muraba", "acre"].includes(o.type)) {
          const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
          for (const [cx, cy] of corners) arr.push(t.transform(cx, cy));
        } else if (o.points?.length) {
          for (const p of o.points) arr.push(t.transform(p.x, p.y));
        } else if (o.start && o.end) {
          arr.push(t.transform(o.start.x, o.start.y));
          arr.push(t.transform(o.end.x, o.end.y));
        }
      }
    };
    const allLatLngs = [];
    collect(mapObjects, viewTransform, allLatLngs);
    // When the selected map is placed, fit to ALL saved mogas of the mouza together
    if (selectedMap?.geo_placement_lat != null) {
      for (const m of villageMaps) {
        if (m.id === selectedMapId || m.geo_placement_lat == null || m.geo_placement_lng == null || !m.drawing_data) continue;
        const objs = DrawingStateManager.deserialize(m.drawing_data);
        const t = computeOneClickTransform({ lat: m.geo_placement_lat, lng: m.geo_placement_lng }, objs, m.geo_rotation || 0);
        if (t) collect(objs, t, allLatLngs);
      }
    }
    const valid = allLatLngs.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (valid.length) {
      const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
      safeFly(m => m.flyToBounds(bounds, { padding: [60, 60], maxZoom: 19, duration: 0.6 }));
    }
  }, [viewMode, viewTransform, mapObjects, villageMaps, selectedMapId, selectedMap, selectedMoga]);

  // When a moga is selected and the overlay is placed, fly to just that moga's
  // bounds (not the full map) so only the selected moga fills the screen.
  // Uses activeOverlay so it works in both View and Overlay modes.
  // The map is already switched to match the selected moga, so all its
  // mustateels/murabas belong to that moga (many older maps don't set
  // mogaNumber on each mustateel, so we don't filter by it).
  useEffect(() => {
    if (!selectedMoga || !activeOverlay?.transform || !mapRef.current) return;
    let mogaObjs = mapObjects.filter(o => o.type === "mustateel" || o.type === "muraba");
    if (selectedMoga) {
      const tagged = mogaObjs.filter(o => o.mogaNumber === selectedMoga);
      if (tagged.length > 0) mogaObjs = tagged;
    }
    if (mogaObjs.length === 0) return;
    const allLatLngs = [];
    for (const o of mogaObjs) {
      const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
      for (const [cx, cy] of corners) allLatLngs.push(activeOverlay.transform.transform(cx, cy));
    }
    const valid = allLatLngs.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (valid.length) {
      const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
      safeFly(m => m.flyToBounds(bounds, { padding: [50, 50], maxZoom: 19, duration: 0.8 }));
    }
  }, [selectedMoga, activeOverlay, mapObjects]);

  // Auto-save the overlay placement (debounced) so it persists at the exact
  // coordinate it was placed — only an explicit delete removes it. No data loss.
  useEffect(() => {
    if (!selectedMapId || !placementPoint || !overlay?.transform) return;
    const timer = setTimeout(() => {
      // Don't re-save a placement that is currently being removed (Remove Overlay)
      if (suppressAutoSaveRef.current === selectedMapId) return;
      base44.entities.LandMap.update(selectedMapId, {
        geo_placement_lat: placementPoint.lat,
        geo_placement_lng: placementPoint.lng,
        geo_rotation: overlay.rotation || 0,
        geo_moga_filter: selectedMoga || "",
      }).then(() => {
        setOverlaySaved(true);
        queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [selectedMapId, placementPoint, overlay?.rotation, selectedMoga]);

  // NOTE: Overlay is computed in handleMapClick when placing manually, or in
  // handlePlaceByCoords / handleLowerLeftDrag / handleUpperLeftDrag when coordinates
  // are adjusted. Saved placements are auto-restored on map selection (above).

  // Mustateel area verification
  const mustateelAreas = useMemo(() => {
    if (!overlay?.transform) return [];
    let musts = mapObjects.filter(o => o.type === "mustateel");
    if (selectedMoga) {
      const tagged = musts.filter(o => o.mogaNumber === selectedMoga);
      if (tagged.length > 0) musts = tagged;
    }
    return musts
      .map(o => {
        const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
        const latlngs = corners.map(([cx, cy]) => overlay.transform.transform(cx, cy));
        return { id: o.id, label: o.label || "", acres: sqMetersToUnits(polygonAreaSqMeters(latlngs)).acres, expected: parcelExpectedAcres(o) };
      });
  }, [overlay, mapObjects, selectedMoga]);

  // ─── MAP CLICK HANDLER ───────────────────────────────────────
  const handleMapClick = useCallback((latlng) => {
    if (allocTool) return; // allocation tools handle their own clicks
    if (khalTool) return;  // khal draw/edit handles its own clicks
    if (mogaTool) return;  // moga draw handles its own clicks
    // 1. One-click placement — anchor upper-left corner, rotation 0° (straight), fixed scale (10-acre mustateel)
    if (placingStep === 1 && selectedMapId) {
      setPlacementPoint(latlng);
      if (mapObjects.length > 0) {
        const transform = computeOneClickTransform(latlng, mapObjects, 0);
        if (transform) {
          setOverlay({ transform, rotation: 0, placementPoint: latlng });
          // Show the yellow lower-left handle on the bottom mustateel corner
          // so the placement is visible and can be dragged to rotate.
          const bc = getBottomMustateelCorner(mapObjects);
          if (bc) setLowerLeftPoint(transform.transform(bc.x, bc.y));
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
  }, [placingStep, selectedMapId, activeTool, placementPoint, mapObjects, allocTool, khalTool]);

  // ─── LIVE MEASUREMENT (mouse move) ─────────────────────────────
  const handleMouseMove = useCallback((latlng) => {
    if (draft || placingStep > 0) setMouseLatLng(latlng);
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
  }, [draft, placingStep]);

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

  // Guard fly operations — Leaflet throws "Cannot read properties of undefined
  // (reading '_leaflet_pos')" if flyTo/flyToBounds runs before the map's panes
  // are fully initialized (effect firing right after mount). whenReady defers
  // safely and runs immediately when the map is already ready.
  const safeFly = useCallback((fn) => {
    const map = mapRef.current;
    if (!map) return;
    map.whenReady(() => { try { fn(map); } catch {} });
  }, []);

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

  const handleSelectMap = async (id, keepMoga = false) => {
    // Persist the current overlay before switching so the placed moga stays
    // visible (AllOverlaysLayer renders saved placements) and the next moga
    // can auto-attach beside it.
    if (selectedMapId && placementPoint && id !== selectedMapId) {
      try {
        await base44.entities.LandMap.update(selectedMapId, {
          geo_placement_lat: placementPoint.lat,
          geo_placement_lng: placementPoint.lng,
          geo_rotation: overlay?.rotation || 0,
          geo_moga_filter: selectedMoga || "",
        });
        queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      } catch {}
    }
    // Auto-fill the district/tehsil/mouza/canal cascade from the selected map's
    // header data so the top dropdowns match the map being overlaid, and only
    // the selected canal's maps remain available.
    const mapData = (maps || []).find(m => m.id === id);
    if (mapData) {
      setFilters({
        district: mapData.district || "",
        tehsil: mapData.tehsil || "",
        village: mapData.village || "",
        rajbah: mapData.rajbah || "",
      });
    }
    setSelectedMapId(id);
    if (!keepMoga) setSelectedMoga("");
    setPlacementPoint(null);
    setOverlay(null);
    setLowerLeftPoint(null);
    setActiveMustateelIds(new Set());
    setOverlaySaved(false);
    setPlacingStep(0); // auto-place effect decides: restore saved placement or enter placement mode
    autoPlacedRef.current = null;
  };

  // Top cascade: pick a moga → auto-select its map; pick a muraba → focus it on the map
  const handleSelectMogaTop = (moga) => {
    setSelectedMoga(moga);
    setSelectedMuraba("");
    // Direct moga select — match within the current canal's maps first (so the
    // same moga number in another canal doesn't grab the wrong map), then fall
    // back to all maps. Filters auto-fill from the matched map's header data.
    const pool = villageMaps.length ? villageMaps : (maps || []);
    const match = pool.find(m => String(m.moga_number) === String(moga))
      || (maps || []).find(m => String(m.moga_number) === String(moga));
    if (match) {
      setFilters({
        district: match.district || "",
        tehsil: match.tehsil || "",
        village: match.village || "",
        rajbah: match.rajbah || "",
      });
    }
    if (match && match.id !== selectedMapId) {
      handleSelectMap(match.id, true);
      // Unplaced mogas now auto-attach beside the placed maps of the mouza
      // (see the auto-place effect); manual placement mode only opens when
      // no mustateel Khasra number matches the placed maps.
    }
  };

  const handleSelectMuraba = (mustNo) => {
    setSelectedMuraba(mustNo);
    const obj = mapObjects.find(o =>
      (o.type === "mustateel" || o.type === "muraba") && o.label === mustNo
    );
    // Auto-fill moga number, rajbah, mouza from the selected map / mustateel
    if (selectedMap) {
      const mogaNo = obj?.mogaNumber || selectedMap.moga_number || "";
      if (mogaNo) setSelectedMoga(String(mogaNo));
      setFilters(prev => ({
        ...prev,
        rajbah: selectedMap.rajbah || prev.rajbah,
        village: selectedMap.village || prev.village,
        district: selectedMap.district || prev.district,
        tehsil: selectedMap.tehsil || prev.tehsil,
      }));
    }
    if (obj) handleMustateelClick(obj.id);
  };

  const handleFilterSelect = (field, value) => {
    setFilters(prev => {
      const next = { ...prev, [field]: value };
      if (field === "district") { next.tehsil = ""; next.village = ""; next.rajbah = ""; }
      if (field === "tehsil") { next.village = ""; next.rajbah = ""; }
      if (field === "village") {
        next.rajbah = "";
        // Auto-fill district and tehsil from the selected mouza's maps
        const mouzaMap = (maps || []).find(m => m.village === value);
        if (mouzaMap) {
          next.district = mouzaMap.district || "";
          next.tehsil = mouzaMap.tehsil || "";
        }
      }
      return next;
    });
  };

  const handleClearOverlay = async () => {
    // Block the debounced auto-save FIRST — otherwise it can re-save the old
    // placement while the delete request is in flight and the map reappears.
    if (selectedMapId) suppressAutoSaveRef.current = selectedMapId;
    // Persistently remove the saved overlay placement so it doesn't auto-restore.
    if (selectedMapId) {
      // Optimistic: clear the placement in the caches INSTANTLY so the moga
      // disappears from AllOverlaysLayer — no waiting for the refetch to land.
      const clearedId = selectedMapId;
      queryClient.setQueryData(["geomap-maps"], (old) =>
        Array.isArray(old) ? old.map(m => m.id === clearedId ? { ...m, geo_placement_lat: null, geo_placement_lng: null, geo_rotation: 0 } : m) : old
      );
      queryClient.setQueryData(["geomap-map", clearedId], (old) => old ? { ...old, geo_placement_lat: null, geo_placement_lng: null, geo_rotation: 0 } : old);
      try {
        await base44.entities.LandMap.update(clearedId, {
          geo_placement_lat: null,
          geo_placement_lng: null,
          geo_rotation: 0,
          geo_moga_filter: "",
        });
        queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
        queryClient.invalidateQueries({ queryKey: ["geomap-map"] });
      } catch (e) {
        toast.error("Delete failed");
      }
    }
    setOverlay(null);
    setPlacementPoint(null);
    setLowerLeftPoint(null);
    setPlacingStep(0);
    setSelectedMapId("");
    setSelectedMoga("");
    setActiveMustateelIds(new Set());
    setOverlaySaved(false);
    setSelectedMuraba("");
    suppressAutoSaveRef.current = null;
  };

  const handleRePlace = () => {
    setOverlay(null);
    setPlacementPoint(null);
    setLowerLeftPoint(null);
    setPlacingStep(1);
    setActiveMustateelIds(new Set());
    setOverlaySaved(false);
    if (mapRef.current) mapRef.current.flyTo(mapRef.current.getCenter(), 18, { duration: 0.6 });
  };



  // ─── AUTO-ARRANGE MOGAS ──────────────────────────────────────
  // Uses the currently-selected (placed) map as the anchor, then matches
  // mustateel Khasra numbers across all other moga maps of the same village
  // to compute + save their geo placements automatically — merging overlaps
  // and chaining consecutive numbers into one continuous mouza map.
  const [arranging, setArranging] = useState(false);
  const handleAutoArrange = async () => {
    if (!selectedMap || !maps) return;
    if (selectedMap.geo_placement_lat == null) {
      toast.error("پہلے منتخب شدہ موگہ کو نقشے پر پلیس کریں، پھر آٹو آرینج کریں۔");
      return;
    }
    setArranging(true);
    try {
      const { results, error } = arrangeMogas(maps, selectedMap);
      if (error) { toast.error(error); setArranging(false); return; }
      // Save each computed placement to the server (inheriting the anchor's rotation)
      for (const r of results) {
        await base44.entities.LandMap.update(r.mapId, {
          geo_placement_lat: r.placement.lat,
          geo_placement_lng: r.placement.lng,
          geo_rotation: r.rotation || 0,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      toast.success(`${results.length} موگہ خودبخود آرینج ہو گیا — ملتی مستطیل اوورلیپ ہو کر ایک نقشہ بن گئی ہیں۔`);
    } catch (err) {
      toast.error("آٹو آرینج میں مسئلہ: " + (err.message || ""));
    } finally {
      setArranging(false);
    }
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

  // Save all moga placements of the selected mouza — persists every placed moga
  // so none is lost; only an explicit delete removes a map's placement.
  const [savingAllMogas, setSavingAllMogas] = useState(false);
  const handleSaveAllMogas = async () => {
    setSavingAllMogas(true);
    try {
      if (selectedMapId && placementPoint) {
        await base44.entities.LandMap.update(selectedMapId, {
          geo_placement_lat: placementPoint.lat,
          geo_placement_lng: placementPoint.lng,
          geo_rotation: overlay?.rotation || 0,
          geo_moga_filter: selectedMoga || "",
        });
        setOverlaySaved(true);
      }
      await queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      const placedCount = villageMaps.filter(m => m.geo_placement_lat != null).length;
      toast.success(`${placedCount} موگہ محفوظ ہیں — صرف ڈیلیٹ سے ہٹیں گے`);
    } catch (e) {
      toast.error("محفوظ کرنے میں مسئلہ");
    } finally {
      setSavingAllMogas(false);
    }
  };

  // Drag-to-move a placed moga — updates its saved geo placement anchor and
  // inherits the reference moga's rotation so the grid stays aligned.
  const handleMogaMoved = async (mapId, latlng) => {
    try {
      await base44.entities.LandMap.update(mapId, {
        geo_placement_lat: latlng.lat,
        geo_placement_lng: latlng.lng,
        geo_rotation: latlng.rotation != null ? latlng.rotation : 0,
      });
      queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
    } catch (e) {
      toast.error("موگہ move نہیں ہوا");
    }
  };

  // One-click place a suggested next moga at its computed chaining position.
  const handlePlaceSuggestion = async (sug) => {
    try {
      await base44.entities.LandMap.update(sug.mapId, {
        geo_placement_lat: sug.placement.lat,
        geo_placement_lng: sug.placement.lng,
        geo_rotation: sug.rotation || 0,
      });
      queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      toast.success(`موگہ ${sug.mogaNumber} کہسڑا ${sug.matchedLabel} پر جڑ گیا`);
      handleSelectMap(sug.mapId, true);
    } catch (e) {
      toast.error("موگہ پلیس نہیں ہوا");
    }
  };

  // ─── DUMMY MUSTATEEL ATTACH ───────────────────────────────────
  // Clicking a dummy cell at the edge of the placed moga opens a dialog to
  // type a Khasra number. On confirm, the unplaced moga containing that
  // mustateel is auto-placed so its matching mustateel lands on the dummy.
  const handleDummyClick = useCallback((dummy) => {
    if (!activeOverlay?.transform) return;
    const geo = activeOverlay.transform.transform(dummy.x, dummy.y);
    setDummyDialog({ dummy, geo });
  }, [activeOverlay]);

  const handleDummyConfirm = async (match, dummyGeo) => {
    const targetMap = (maps || []).find((m) => m.id === match.id);
    if (!targetMap?.drawing_data) return;
    let bObjects;
    try {
      bObjects = DrawingStateManager.deserialize(targetMap.drawing_data);
    } catch {
      toast.error("نقشہ ڈیٹا خراب ہے");
      return;
    }
    // Inherit the reference (currently placed) moga's rotation so the chained
    // moga stays on the same rotated grid — no separate rotation needed.
    const refRotation = overlay?.rotation || selectedMap?.geo_rotation || 0;
    const placement = computePlacementForMustateel(bObjects, match.must, dummyGeo, refRotation);
    if (!placement) {
      toast.error("پلیس نہیں ہوا");
      return;
    }
    // Optimistically reflect the placement in the maps cache so the new moga
    // appears on the map INSTANTLY — no waiting for a full re-fetch of all maps.
    queryClient.setQueryData(["geomap-maps"], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((m) =>
        m.id === match.id
          ? { ...m, geo_placement_lat: placement.lat, geo_placement_lng: placement.lng, geo_rotation: refRotation }
          : m
      );
    });
    try {
      await base44.entities.LandMap.update(match.id, {
        geo_placement_lat: placement.lat,
        geo_placement_lng: placement.lng,
        geo_rotation: refRotation,
      });
      toast.success(`موگہ ${match.mogaNumber} کہسڑا ${match.must.label} پر جڑ گیا`);
      queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      // Switch the active overlay to the newly placed moga so it shows on the
      // map immediately instead of staying on the previous moga.
      handleSelectMap(match.id, true);
    } catch (e) {
      // Revert the optimistic update if the save failed
      queryClient.setQueryData(["geomap-maps"], (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((m) =>
          m.id === match.id
            ? { ...m, geo_placement_lat: null, geo_placement_lng: null, geo_rotation: 0 }
            : m
        );
      });
      toast.error("محفوظ نہیں ہوا");
    }
  };

  const handleDummyRemove = async (mapId) => {
    try {
      await base44.entities.LandMap.update(mapId, {
        geo_placement_lat: null,
        geo_placement_lng: null,
        geo_rotation: 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      toast.success("موگہ ہٹا دیا گیا");
    } catch (e) {
      toast.error("ہٹایا نہیں گیا");
    }
  };

  // Capture the live satellite map + cadastral overlay as a single canvas (for export).
  // Swaps in a CORS-enabled imagery layer (ArcGIS World Imagery) so the captured canvas
  // is not tainted, fits the view to the placed overlay, then restores the map.
  const handleCaptureSatellite = async ({ bw } = {}) => {
    const map = mapRef.current;
    const transform = activeOverlay?.transform;
    if (!map || !transform) throw new Error("Place the map overlay first");
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
        scale: 3,
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
    setActiveMustateelIds(prev => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    // Zoom in to the clicked mustateel — on mobile this focuses one mustateel
    // while neighbours stay as clickable boundaries; clicking another pans to it.
    const obj = mapObjects.find(o => o.id === id);
    // Reflect the clicked mustateel in the top moga → muraba cascade so the
    // selected muraba shows next to the moga (both View & Overlay modes).
    if (obj?.label) setSelectedMuraba(String(obj.label));
    if (obj && activeOverlay?.transform && mapRef.current) {
      const corners = [[obj.x, obj.y], [obj.x + obj.w, obj.y], [obj.x + obj.w, obj.y + obj.h], [obj.x, obj.y + obj.h]];
      const latlngs = corners.map(([cx, cy]) => activeOverlay.transform.transform(cx, cy)).filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (latlngs.length) {
        const bounds = L.latLngBounds(latlngs.map(p => [p.lat, p.lng]));
        mapRef.current.flyToBounds(bounds, { padding: [20, 20], maxZoom: 20, duration: 0.6 });
      }
    }
  }, [mapObjects, activeOverlay]);

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

  if (!entered) return <GeoMapHub onSelect={(mode) => { setViewMode(mode); setEntered(true); }} />;

  return (
    <div className="fixed inset-0 bg-[#0f1923] z-40">
      <MapContainer
        center={center}
        zoom={zoom}
        maxZoom={20}
        className="w-full h-full"
        style={{ background: "#0f1923" }}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        {!capturing && <TileLayer url={tileUrl} maxZoom={20} />}
        <MapController onMapClick={handleMapClick} onMapInstance={handleMapInstance} onZoomChange={setZoom} />
        <MouseTracker />
        <GPSTracker active={gpsActive} onPosition={(pos, acc) => { setGpsPosition(pos); setGpsAccuracy(acc); }} />

        {/* GPS marker + accuracy circle */}
        {gpsAccuracyCircle}
        {gpsPosition && <Marker position={[gpsPosition.lat, gpsPosition.lng]} icon={GPS_ICON} />}

        {/* All saved (placed) mogas — always visible in both modes so previously-placed mogas stay on screen */}
        {!capturing && (viewMode === "view" || viewMode === "overlay") && (
          <AllOverlaysLayer maps={villageMaps} excludeId={selectedMapId} zoom={zoom} showCanals={showCanals} />
        )}

        {/* Click layer for saved mogas — click to select it as the active overlay */}
        {viewMode === "overlay" && !capturing && (
          <SavedMogaClickLayer maps={villageMaps} excludeId={selectedMapId} onMogaClick={(mapData) => handleSelectMap(mapData.id)} />
        )}

        {/* Moga move layer — draggable markers to reposition placed mogas */}
        {viewMode === "overlay" && moveTool && !capturing && (
          <MogaMoveLayer
            maps={maps}
            village={selectedMap?.village || filters.village}
            selectedMapId={selectedMapId}
            onMoved={handleMogaMoved}
          />
        )}

        {/* Dummy mustateel cells on every open side of the placed moga — click to attach a new moga */}
        {viewMode === "overlay" && activeOverlay?.transform && !capturing && (
          <DummyMustateelLayer
            objects={mapObjects}
            overlay={activeOverlay}
            selectedMoga={selectedMoga}
            onClick={handleDummyClick}
            maps={villageMaps}
            excludeMapId={selectedMapId}
          />
        )}

        {/* Overlay layer — all map details */}
        {layerVisible && activeOverlay?.transform && (
          <OverlayLayer
            objects={mapObjects}
            transform={activeOverlay.transform}
            zoom={zoom}
            killaVisible={killaVisible}
            mogaFilter={selectedMoga}
            activeMustateelIds={activeMustateelIds}
            gridAll={allocTool === "cell"}
            onMustateelClick={handleMustateelClick}
            showCanals={showCanals}
            colorSettings={editorSettings?.colors || {}}
          />
        )}
        {/* Chakbandi lines render in a FINAL pass — after all mustateels from
            every placed moga — so they always stay on top. Leaflet SVG stacks
            by DOM order, so a moga's mustateels can never hide another moga's
            chakbandi boundary. */}
        {!capturing && (viewMode === "view" || viewMode === "overlay") && (
          <AllOverlaysLayer maps={villageMaps} excludeId={selectedMapId} zoom={zoom} showCanals={showCanals} chakbandiOnly />
        )}
        {layerVisible && activeOverlay?.transform && (
          <OverlayLayer
            objects={mapObjects}
            transform={activeOverlay.transform}
            zoom={zoom}
            mogaFilter={selectedMoga}
            showCanals={showCanals}
            chakbandiOnly
          />
        )}

        {/* Allocation layer — clickable killa (acre) cells + allocated highlights */}
        {activeOverlay?.transform && !capturing && (
          <AllocationLayer
            objects={mapObjects}
            overlay={activeOverlay}
            selectedMoga={selectedMoga}
            allocations={allocations}
            mode={allocTool === "cell"}
            onCellClick={handleCellClick}
            onEditAllocation={handleEditAllocation}
            activeMustateelIds={activeMustateelIds}
            onMustateelClick={handleMustateelClick}
          />
        )}

        {/* Patch draw/edit layer — freehand closed polygons for farmer patches (Overlay + View) */}
        {activeOverlay?.transform && !capturing && (
          <PatchDrawLayer
            drawMode={allocTool === "draw"}
            editMode={allocTool === "edit"}
            objects={mapObjects}
            overlay={activeOverlay}
            selectedMoga={selectedMoga}
            patches={patchesWithGeometry}
            activePatchId={activePatchId}
            onDrawComplete={handleDrawComplete}
            onSelectPatch={handleSelectPatch}
            onUpdatePatchGeometry={handleUpdatePatchGeometry}
          />
        )}

        {/* Khal draw/edit layer — watercourse drawing & vertex editing.
            In View mode, drawn khals are tagged "informal" (zamindar-drawn) so
            their exact real-world location is captured; in Overlay mode they are
            "approved" (official). Informal khals render in a different colour. */}
        {(viewMode === "overlay" || viewMode === "view") && activeOverlay?.transform && !capturing && (
          <KhalDrawLayer
            drawMode={khalTool === "draw"}
            editMode={khalTool === "edit"}
            overlay={activeOverlay}
            objects={mapObjects}
            gridPoints={gridPoints}
            khalType={viewMode === "view" ? "informal" : "approved"}
            onKhalDrawn={handleKhalDrawn}
            onKhalUpdated={handleKhalUpdated}
            onKhalDeleted={handleKhalDeleted}
          />
        )}

        {/* Moga (outlet) draw layer — draw a moga on the GeoMap; saved to the
            map's drawing_data so it appears in the Map Editor at the same place. */}
        {(viewMode === "overlay" || viewMode === "view") && activeOverlay?.transform && !capturing && (
          <MogaDrawLayer
            drawMode={mogaTool === "draw"}
            editMode={khalTool === "edit"}
            overlay={activeOverlay}
            objects={mapObjects}
            gridPoints={gridPoints}
            onMogaDrawn={handleMogaDrawn}
            onMogaUpdated={handleMogaUpdated}
            onMogaDeleted={handleMogaDeleted}
          />
        )}

        {/* Corner placement marker — shows where the map corner is placed + coordinates */}
        {viewMode === "overlay" && placementPoint && !capturing && (
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
        {viewMode === "overlay" && lowerLeftPoint && !capturing && (
          <Marker
            position={[lowerLeftPoint.lat, lowerLeftPoint.lng]}
            icon={lowerLeftIcon()}
            draggable
            eventHandlers={{ dragend: (e) => handleLowerLeftDrag(e.target.getLatLng()) }}
          >
            <Tooltip permanent direction="right" className="placement-coords-tooltip">
              <div className="text-[10px] font-mono leading-tight">
                <div className="font-bold text-yellow-600 flex items-center gap-1">
                  <span>📍</span> نیچا کونا (روٹیشن ہینڈل)
                </div>
                <div className="text-slate-700">Lat: {lowerLeftPoint.lat.toFixed(6)}</div>
                <div className="text-slate-700">Lng: {lowerLeftPoint.lng.toFixed(6)}</div>
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
        onMenu={() => setEntered(false)}
        rajbahs={rajbahs}
        rajbah={filters.rajbah}
        mogas={cascadeMogas}
        selectedMoga={selectedMoga}
        onSelectMoga={handleSelectMogaTop}
        murabas={mogaMustateels.map(m => m.mustNo)}
        selectedMuraba={selectedMuraba}
        onSelectMuraba={handleSelectMuraba}
        viewMode={viewMode}
      />

      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onGPS={handleGPS}
        gpsActive={gpsActive}
        onPlaceByCoords={viewMode === "overlay" ? () => setShowCoordDialog(true) : null}
        onPlaceByCoordsLower={viewMode === "overlay" ? () => setShowLowerLeftDialog(true) : null}
        onEditPatch={() => setAllocTool((v) => (v === "edit" ? null : "edit"))}
        editActive={allocTool === "edit"}
        onKhalDraw={() => { setKhalTool((v) => (v === "draw" ? null : "draw")); setMogaTool(null); setActiveTool(null); setAllocTool(null); }}
        khalDrawActive={khalTool === "draw"}
        onKhalEdit={() => { setKhalTool((v) => (v === "edit" ? null : "edit")); setMogaTool(null); setActiveTool(null); setAllocTool(null); }}
        khalEditActive={khalTool === "edit"}
        onMogaDraw={() => { setMogaTool((v) => (v === "draw" ? null : "draw")); setKhalTool(null); setActiveTool(null); setAllocTool(null); }}
        mogaDrawActive={mogaTool === "draw"}
      />
      <Compass />

      {/* Overlay toggle — left side (overlay mode only) */}
      {viewMode === "overlay" && (
        <button
          onClick={() => setShowOverlayPanel(v => !v)}
          className={`absolute top-14 left-3 z-[1000] flex items-center gap-1.5 px-3 h-8 rounded-full shadow-xl text-xs font-bold transition-all ${showOverlayPanel ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
        >
          <Layers className="w-3.5 h-3.5" />
          GIS Overlay
        </button>
      )}

      {viewMode === "overlay" && showOverlayPanel && (
        <OverlayPanel
          maps={maps}
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
          onAutoArrange={handleAutoArrange}
          arranging={arranging}
          onSaveAllMogas={handleSaveAllMogas}
          savingAllMogas={savingAllMogas}
          villageMogaCount={(maps || []).filter(m => m.village === selectedMap?.village && m.id !== selectedMap?.id && m.geo_placement_lat == null).length}
          suggestions={suggestions}
          onPlaceSuggestion={handlePlaceSuggestion}
          onClose={() => setShowOverlayPanel(false)}
        />
      )}

      {activeOverlay && viewMode === "view" && (
        <AllocationToolbar
          killaVisible={killaVisible}
          onToggleKilla={() => setKillaVisible(v => !v)}
          onForm1={() => setShowForm1(true)}
          allocTool={allocTool}
          onSetAllocTool={setAllocTool}
        />
      )}

      {allocTool === "cell" && activeOverlay && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[1001] bg-green-600 text-white text-[11px] font-bold px-4 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> مستطیل کے کسی ایکڑ سیل پر کلک کریں — زمیندار کا حصہ الاٹ کریں
        </div>
      )}

      {allocTool === "draw" && activeOverlay && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[1001] bg-indigo-600 text-white text-[11px] font-bold px-4 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <PenTool className="w-3 h-3" /> نقشے پر کلک کر کے کلوزد پیچ بنائیں — ڈبل کلک سے مکمل کریں
        </div>
      )}

      {allocTool === "edit" && activeOverlay && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[1001] bg-orange-600 text-white text-[11px] font-bold px-4 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <Pencil className="w-3 h-3" /> کسی الوٹ شدہ پیچ پر کلک کریں — نوڈس کو کھینچ کر ایڈجسٹ کریں
        </div>
      )}

      {khalTool === "draw" && activeOverlay && (viewMode === "overlay" || viewMode === "view") && (
        <div className={`absolute bottom-36 left-1/2 -translate-x-1/2 z-[1001] text-white text-[11px] font-bold px-4 h-8 rounded-full shadow-xl flex items-center gap-1.5 ${viewMode === "view" ? "bg-orange-600" : "bg-blue-600"}`}>
          <Waves className="w-3 h-3" /> {viewMode === "view" ? "نقشے پر کلک کر کے خال (زمیندار) بنائیں — ڈبل کلک سے مکمل کریں" : "نقشے پر کلک کر کے خال بنائیں — ڈبل کلک سے مکمل کریں"}
        </div>
      )}

      {khalTool === "edit" && activeOverlay && (viewMode === "overlay" || viewMode === "view") && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[1001] bg-orange-600 text-white text-[11px] font-bold px-4 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <Pencil className="w-3 h-3" /> کسی خال پر کلک کریں — نوڈس کو کھینچ کر ایڈجسٹ کریں، × سے حذف کریں
        </div>
      )}

      {/* Always-on khal edit hint — long-press / double-click any khal to edit */}
      {(viewMode === "overlay" || viewMode === "view") && activeOverlay && !khalTool && khalsExist && (
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/90 text-white text-[10px] font-medium px-3 h-7 rounded-full shadow-xl flex items-center gap-1.5">
          <Waves className="w-3 h-3" />
          خال پر ڈبل کلک یا لانگ پریس کریں — نوڈس کھینچ کر ایڈٹ کریں
        </div>
      )}

      {/* Click mustateel hint */}
      {activeOverlay && killaVisible && activeMustateelIds.size === 0 && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[1000] bg-black/80 text-white text-[11px] font-medium px-3 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          کسی مستطیل پر کلک کریں — کلا نمبر اور گرڈ لائنز دکھائی دیں گے
        </div>
      )}

      <DrawingToolbar
        activeTool={activeTool}
        onToolChange={(t) => { setActiveTool(t); if (t) { setKhalTool(null); setMogaTool(null); } }}
        onClear={handleClearMeasurements}
        onExport={handleExport}
        onLayerToggle={() => setLayerVisible(v => !v)}
        layerVisible={layerVisible}
      />

      {/* Moga tools — Hand (pan) + Move (drag placed mogas) — overlay mode only */}
      {viewMode === "overlay" && (
        <MogaToolsToolbar
          moveTool={moveTool}
          onToggleMove={() => {
            setMoveTool((v) => !v);
            if (!moveTool) { setActiveTool(null); setKhalTool(null); }
          }}
          onHand={() => { setMoveTool(false); setActiveTool(null); setKhalTool(null); }}
        />
      )}

      {moveTool && viewMode === "overlay" && (
        <div className="absolute bottom-36 left-16 z-[1001] bg-indigo-600 text-white text-[11px] font-bold px-4 h-8 rounded-full shadow-xl flex items-center gap-1.5">
          <Move className="w-3 h-3" /> کسی پلیس شدہ موگہ کے نشان کو کھینچ کر اسے دوسری جگہ منتقل کریں
        </div>
      )}

      {/* Live measurement info */}
      <MeasurementInfo measurement={liveMeasurement} draft={draft} zoom={zoom} />

      {/* Placement hint — two-click mode with live coordinates */}
      {viewMode === "overlay" && placingStep > 0 && selectedMapId && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-[1001] text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex flex-col items-center gap-0.5 animate-pulse pointer-events-none"
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
        open={viewMode === "overlay" && showCoordDialog}
        onClose={() => setShowCoordDialog(false)}
        onPlace={handlePlaceByCoords}
        mouseLatLng={mouseLatLng}
      />

      {/* Manual coordinate input for lower-left (green) corner */}
      <CoordinateDialog
        open={viewMode === "overlay" && showLowerLeftDialog}
        onClose={() => setShowLowerLeftDialog(false)}
        onPlace={handleLowerLeftByCoords}
        mouseLatLng={lowerLeftPoint || mouseLatLng}
      />

      {/* Export dialog — PNG / PDF / SVG with moga filter (both sub-modules) */}
      <GeoMapExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        mapData={selectedMap}
        objects={mapObjects}
        colorSettings={editorSettings?.colors || {}}
        selectedMoga={selectedMoga}
        overlayReady={!!activeOverlay}
        onCaptureSatellite={handleCaptureSatellite}
      />

      {/* Farmer patch allocation dialog (cell-based) */}
      <AllocationDialog
        open={!!allocCell}
        data={allocCell}
        mustateels={mogaMustateels}
        allocations={allocations}
        info={registerInfo}
        onAllocate={handleAllocate}
        onClose={() => setAllocCell(null)}
      />

      {/* Edit an existing allocation — opened by clicking a green patch */}
      <EditAllocationDialog
        open={!!editAllocCell}
        data={editAllocCell}
        allocations={allocations}
        mustateels={mogaMustateels}
        info={registerInfo}
        onUpdate={handleUpdateAllocation}
        onAllocate={handleAllocate}
        onRemove={handleRemoveAllocation}
        onClose={() => setEditAllocCell(null)}
      />

      {/* Drawn patch farmer details dialog */}
      <PatchDialog
        open={!!patchDialog}
        data={patchDialog}
        info={registerInfo}
        onSave={handleAddPatch}
        onClose={() => setPatchDialog(null)}
      />

      {/* Dummy mustateel attach dialog — chain a new moga off an edge cell */}
      <DummyMustateelDialog
        open={!!dummyDialog}
        dummy={dummyDialog?.dummy}
        dummyGeo={dummyDialog?.geo}
        maps={maps}
        village={selectedMap?.village || filters.village}
        placedMapId={selectedMapId}
        onConfirm={handleDummyConfirm}
        onRemove={handleDummyRemove}
        onClose={() => setDummyDialog(null)}
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
        onUpdateGroup={handleUpdateGroup}
        totals={registerTotals}
        onSave={handleSaveRegister}
        saving={savingRegister}
      />

      {/* Hybrid / Satellite toggle (both sub-modules) */}
      <button
        onClick={() => setShowCanals(v => !v)}
        className={`absolute bottom-16 right-3 z-[1000] flex items-center justify-center w-9 h-9 rounded-full shadow-xl transition-colors ${showCanals ? "bg-[#1A4550] text-white" : "bg-white/20 text-white/40"}`}
        title={showCanals ? "Canals On — click to hide" : "Canals Off — click to show"}
      >
        {showCanals ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
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