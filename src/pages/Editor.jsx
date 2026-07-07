import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GISCanvas from "@/components/editor/GISCanvas";
import ToolPanel from "@/components/editor/ToolPanel";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import LayerPanel from "@/components/editor/LayerPanel";
import MogaFilterPanel from "@/components/editor/MogaFilterPanel";
import StatusBar from "@/components/editor/StatusBar";
import EditorHeader from "@/components/editor/EditorHeader";
import ExportDialog from "@/components/editor/ExportDialog";
import LegendPanel from "@/components/editor/LegendPanel";
import MapScanDialog from "@/components/editor/MapScanDialog";
import AICommandPanel from "@/components/editor/AICommandPanel";

import ColorSettingsPanel from "@/components/editor/ColorSettingsPanel";
import PrintPreview from "@/components/editor/PrintPreview";
import {
  DrawingStateManager,
  createAcre, createMustateel, createMuraba, createCanal, createKhal, createRoad, createOutlet, createChakbandi, createMouza,
  createDamageMarker, createDamageMarkerLine, findNonOverlappingPosition, snapToNearestBoundary, autoAssignLabel, rectsOverlap, duplicateObjects,
  saveToClipboard, loadFromClipboard, hasClipboard,
} from "@/lib/gisEngine";
import { Layers, BookOpen, Palette, Printer, Magnet, Pen, Grid3x3, Group, Save, Camera, Download, Loader2, X, Eye, EyeOff, Copy, Clipboard, SquareStack, BoxSelect, Upload, FileDown, Frame, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SnapSettingsPanel from "@/components/editor/SnapSettingsPanel";
import MapDetailsDialog from "@/components/editor/MapDetailsDialog";
// DamageMarkerDialog removed — damage tool is now a simple line draw

const DEFAULT_LAYERS = {
  acre: { visible: true, locked: false },
  mustateel: { visible: true, locked: false },
  muraba: { visible: true, locked: false },
  canal: { visible: true, locked: false },
  chakbandi: { visible: true, locked: false },
  outlet: { visible: true, locked: false },
  khal: { visible: true, locked: false },
  road: { visible: true, locked: false },
  mouza: { visible: true, locked: false },
  grass: { visible: true, locked: false },
};

const DEFAULT_COLORS = {
  acreStroke: "#eab308",
  acreFill: "rgba(234,179,8,0.08)",
  mustateelStroke: "#ef4444",
  mustateelFill: "rgba(245,158,11,0.10)",
  murabaStroke: "#ef4444",
  murabaFill: "rgba(249,115,22,0.08)",
  canalStroke: "#0284c7",
  canalFill: "rgba(14,165,233,0.35)",
  khalStroke: "#2563eb",
  roadStroke: "#b45309",
  chakbandiStroke: "#22c55e",
  mouzaStroke: "#000000",
  labelColor: "#000000",
  outletStroke: "#06b6d4",
};

export default function Editor() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const mapId = urlParams.get("id");

  const [activeTool, setActiveTool] = useState("select");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 80 });
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [selectedId, setSelectedId] = useState(null);
  const [snapPos, setSnapPos] = useState(null);
  const [showLayers, setShowLayers] = useState(false);
  const [visibleMogas, setVisibleMogas] = useState({});
  const [printMogaFilter, setPrintMogaFilter] = useState("");
  const [showLegend, setShowLegend] = useState(false);
  const [killaVisibility, setKillaVisibility] = useState({ mustateel: true, muraba: true });
  const [killaNumbersGlobal, setKillaNumbersGlobal] = useState(true);
  const [mustateelStartNum, setMustateelStartNum] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [showAICommand, setShowAICommand] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showSnap, setShowSnap] = useState(false);
  const [snapSettings, setSnapSettings] = useState({ gridSnap: true, spineSnap: true, mogaSnap: true });
  const [freehandMode, setFreehandMode] = useState(false);
  const [gridFlags, setGridFlags] = useState({ showMustateel: true, showMuraba: false });
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [showMapDetails, setShowMapDetails] = useState(false);
  // damage marker is now a simple line — no dialog state needed
  const [canalDraft, setCanalDraft] = useState(null);
  const [chakbandiDraft, setChakbandiDraft] = useState(null);
  const [outletDraft, setOutletDraft] = useState(null);
  const [khalDraft, setKhalDraft] = useState(null);
  const [roadDraft, setRoadDraft] = useState(null);
  const [mouzaDraft, setMouzaDraft] = useState(null);
  const [objects, setObjects] = useState([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [colorSettings, setColorSettings] = useState(DEFAULT_COLORS);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [pageBorderStyle, setPageBorderStyle] = useState("none");
  const [legendPos, setLegendPos] = useState(null); // null = default position; {x, y} when dragged
  const legendDragRef = useRef(null); // { offsetX, offsetY }

  const dsmRef = useRef(new DrawingStateManager([]));
  const autoSaveTimer = useRef(null);
  const canvasRef = useRef(null);
  const clipboardRef = useRef([]);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const mustateelStartNumRef = useRef(mustateelStartNum);
  // Draft refs — allow finish handlers to read current draft without side-effects in state updaters
  const canalDraftRef = useRef(null);
  const chakbandiDraftRef = useRef(null);
  const khalDraftRef = useRef(null);
  const roadDraftRef = useRef(null);
  const mouzaDraftRef = useRef(null);
  const outletDraftRef = useRef(null);
  canalDraftRef.current = canalDraft;
  chakbandiDraftRef.current = chakbandiDraft;
  khalDraftRef.current = khalDraft;
  roadDraftRef.current = roadDraft;
  mouzaDraftRef.current = mouzaDraft;
  outletDraftRef.current = outletDraft;
  zoomRef.current = zoom;
  panRef.current = pan;
  mustateelStartNumRef.current = mustateelStartNum;

  // Always-current save function — avoids stale closures in debounced autosave & unmount
  const saveRef = useRef(() => {});
  saveRef.current = () => {
    if (!mapId) return;
    const parcels = dsmRef.current.getByType("mustateel").length +
      dsmRef.current.getByType("muraba").length;
    saveMutation.mutate({
      drawing_data: dsmRef.current.serialize(),
      total_parcels: parcels,
      viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
    });
  };

  const { data: mapData } = useQuery({
    queryKey: ["map", mapId],
    queryFn: () => base44.entities.LandMap.filter({ id: mapId }).then(r => r[0]),
    enabled: !!mapId,
  });

  const loadedMapIdRef = useRef(null);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.LandMap.update(mapId, data),
    onSuccess: () => {
      toast.success("Map saved", { duration: 1500 });
      // Update cache silently — DO NOT invalidate/refetch (causes load effect to overwrite local edits)
      queryClient.setQueryData(["map", mapId], (old) => old ? { ...old, ...{
        drawing_data: dsmRef.current.serialize(),
        total_parcels: dsmRef.current.getByType("mustateel").length + dsmRef.current.getByType("muraba").length,
        viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      } } : old);
    },
    onError: () => toast.error("Save failed"),
  });

  // Load map data ONLY on first load for a given map ID.
  // Guard prevents refetches from overwriting unsaved local edits.
  useEffect(() => {
    if (!mapData || mapData.id === loadedMapIdRef.current) return;
    loadedMapIdRef.current = mapData.id;
    if (mapData.drawing_data) {
      const loaded = DrawingStateManager.deserialize(mapData.drawing_data);
      dsmRef.current = new DrawingStateManager(loaded);
      setObjects([...dsmRef.current.objects]);
      syncUndoRedo();
    }
    if (mapData.viewport) {
      try {
        const vp = JSON.parse(mapData.viewport);
        if (vp.zoom) setZoom(vp.zoom);
        if (vp.pan) setPan(vp.pan);
      } catch {}
    }
  }, [mapData]);

  const syncUndoRedo = () => {
    setCanUndo(dsmRef.current.historyIdx > 0);
    setCanRedo(dsmRef.current.historyIdx < dsmRef.current.history.length - 1);
  };

  const syncObjects = () => {
    setObjects([...dsmRef.current.objects]);
    syncUndoRedo();
    scheduleAutoSave();
  };

  const scheduleAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveRef.current(), 400);
  };

  // Track current mapId for unmount save (cleanup has [] deps, can't read fresh mapId)
  const mapIdRef = useRef(mapId);
  mapIdRef.current = mapId;

  // Save on unmount / navigate away — direct API call so it survives unmount.
  // Also removes stale query cache so fresh data is loaded on next visit.
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      const currentMapId = mapIdRef.current;
      if (!currentMapId) return;
      const parcels = dsmRef.current.getByType("mustateel").length +
        dsmRef.current.getByType("muraba").length;
      base44.entities.LandMap.update(currentMapId, {
        drawing_data: dsmRef.current.serialize(),
        total_parcels: parcels,
        viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      }).then(() => {
        queryClient.removeQueries({ queryKey: ["map", currentMapId] });
      }).catch(() => {});
    };
  }, []);

  const handleAddObject = useCallback((type, data) => {
    if (type === "__delete__") {
      dsmRef.current.remove(data.id);
      if (selectedId === data.id) setSelectedId(null);
      syncObjects();
      return;
    }
    const layerKey = type;
    if (layers[layerKey]?.locked) { toast.warning(`${type} layer is locked`); return; }

    let obj;
    if (type === "damageMarker") {
      // handled by drag-line in canvas; this path used for simple click fallback
      obj = createDamageMarker(data.x, data.y);
      dsmRef.current.add(obj);
      setSelectedId(obj.id);
      syncObjects();
      return;
    }
    if (type === "damageMarkerLine") {
      obj = createDamageMarkerLine(data.start, data.end);
      dsmRef.current.add(obj);
      setSelectedId(obj.id);
      syncObjects();
      return;
    }
    if (type === "acre") obj = createAcre(data.x, data.y);
    else if (type === "mustateel") {
      const proto = createMustateel(0, 0);
      const snap = snapToNearestBoundary(
        { x: data.x, y: data.y, w: proto.w, h: proto.h },
        dsmRef.current.objects
      );
      // Block if overlapping an existing parcel
      const wouldOverlap = dsmRef.current.objects
        .filter(o => ["mustateel","muraba","acre"].includes(o.type))
        .some(o => rectsOverlap({ x: snap.x, y: snap.y, w: proto.w, h: proto.h }, o));
      if (wouldOverlap) { toast.warning("Cannot place here — overlaps another parcel"); return; }
      obj = createMustateel(snap.x, snap.y);
      const startN = mustateelStartNumRef.current !== "" ? parseInt(mustateelStartNumRef.current, 10) : null;
      obj.label = autoAssignLabel("mustateel", dsmRef.current.objects, startN);
      // Always track next number so subsequent draws continue the sequence
      setMustateelStartNum(String(parseInt(obj.label, 10) + 1));
    }
    else if (type === "muraba") {
      const proto = createMuraba(0, 0);
      const snap = snapToNearestBoundary(
        { x: data.x, y: data.y, w: proto.w, h: proto.h },
        dsmRef.current.objects
      );
      const wouldOverlap = dsmRef.current.objects
        .filter(o => ["mustateel","muraba","acre"].includes(o.type))
        .some(o => rectsOverlap({ x: snap.x, y: snap.y, w: proto.w, h: proto.h }, o));
      if (wouldOverlap) { toast.warning("Cannot place here — overlaps another parcel"); return; }
      obj = createMuraba(snap.x, snap.y);
      obj.label = autoAssignLabel("muraba", dsmRef.current.objects);
    }

    if (obj) {
      dsmRef.current.add(obj);
      setSelectedId(obj.id);
      syncObjects();
    }
  }, [layers, selectedId]);

  const handleCanalPointAdd = useCallback((pt) => {
    setCanalDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleCanalFinish = useCallback(() => {
    const draft = canalDraftRef.current;
    setCanalDraft(null);
    if (draft && draft.length >= 2) {
      const canal = createCanal(draft);
      dsmRef.current.add(canal);
      setSelectedId(canal.id);
      syncObjects();
      saveRef.current();
    }
  }, []);

  const handleChakbandiPointAdd = useCallback((pt) => {
    setChakbandiDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleChakbandiFinish = useCallback(() => {
    const draft = chakbandiDraftRef.current;
    setChakbandiDraft(null);
    if (draft && draft.length >= 2) {
      const cb = createChakbandi(draft);
      dsmRef.current.add(cb);
      setSelectedId(cb.id);
      syncObjects();
      saveRef.current();
    }
  }, []);

  const handleKhalPointAdd = useCallback((pt) => {
    setKhalDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleKhalFinish = useCallback(() => {
    const draft = khalDraftRef.current;
    setKhalDraft(null);
    if (draft && draft.length >= 2) {
      const khal = createKhal(draft);
      dsmRef.current.add(khal);
      setSelectedId(khal.id);
      syncObjects();
      saveRef.current();
    }
  }, []);

  const handleRoadPointAdd = useCallback((pt) => {
    setRoadDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleRoadFinish = useCallback(() => {
    const draft = roadDraftRef.current;
    setRoadDraft(null);
    if (draft && draft.length >= 2) {
      const road = createRoad(draft);
      dsmRef.current.add(road);
      setSelectedId(road.id);
      syncObjects();
      saveRef.current();
    }
  }, []);

  const handleMouzaPointAdd = useCallback((pt) => {
    setMouzaDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleMouzaFinish = useCallback(() => {
    const draft = mouzaDraftRef.current;
    setMouzaDraft(null);
    if (draft && draft.length >= 2) {
      const mouza = createMouza(draft);
      dsmRef.current.add(mouza);
      setSelectedId(mouza.id);
      syncObjects();
      saveRef.current();
    }
  }, []);

  const handleOutletStart = useCallback((pt, canalId) => {
    setOutletDraft({ x: pt.x, y: pt.y, canalId });
  }, []);

  const handleOutletFinish = useCallback((endPt) => {
    const draft = outletDraftRef.current;
    setOutletDraft(null);
    if (draft) {
      const outlet = createOutlet(draft.canalId, { x: draft.x, y: draft.y }, endPt);
      dsmRef.current.add(outlet);
      setSelectedId(outlet.id);
      syncObjects();
      saveRef.current();
    }
  }, []);

  const handleSnapChange = (key, val) => setSnapSettings(prev => ({ ...prev, [key]: val }));

  const handleDamageMarkerClick = () => {}; // no-op: line-based, no dialog

  const handleAICommand = (newObjects, updates = []) => {
    newObjects.forEach(o => dsmRef.current.add(o));
    updates.forEach(u => dsmRef.current.update(u.id, u.changes));
    syncObjects();
  };

  const handleToolChange = (tool) => {
    if (tool !== "mustateel") setMustateelStartNum("");
    if (activeTool === "canal" && canalDraft && canalDraft.length >= 2) handleCanalFinish();
    else if (activeTool === "canal") setCanalDraft(null);
    if (activeTool === "chakbandi" && chakbandiDraft && chakbandiDraft.length >= 2) handleChakbandiFinish();
    else if (activeTool === "chakbandi") setChakbandiDraft(null);
    if (activeTool === "outlet") setOutletDraft(null);
    if (activeTool === "khal" && khalDraft && khalDraft.length >= 2) handleKhalFinish();
    else if (activeTool === "khal") setKhalDraft(null);
    if (activeTool === "road" && roadDraft && roadDraft.length >= 2) handleRoadFinish();
    else if (activeTool === "road") setRoadDraft(null);
    if (activeTool === "mouza" && mouzaDraft && mouzaDraft.length >= 2) handleMouzaFinish();
    else if (activeTool === "mouza") setMouzaDraft(null);
    setActiveTool(tool);
  };

  const handleStopDrawing = () => {
    if (activeTool === "canal" && canalDraft && canalDraft.length >= 2) handleCanalFinish();
    else setCanalDraft(null);
    if (activeTool === "chakbandi" && chakbandiDraft && chakbandiDraft.length >= 2) handleChakbandiFinish();
    else setChakbandiDraft(null);
    if (activeTool === "khal" && khalDraft && khalDraft.length >= 2) handleKhalFinish();
    else setKhalDraft(null);
    if (activeTool === "road" && roadDraft && roadDraft.length >= 2) handleRoadFinish();
    else setRoadDraft(null);
    if (activeTool === "mouza" && mouzaDraft && mouzaDraft.length >= 2) handleMouzaFinish();
    else setMouzaDraft(null);
    setOutletDraft(null);
    setActiveTool("select");
  };

  const handleUndo = () => { if (dsmRef.current.undo()) syncObjects(); };
  const handleRedo = () => { if (dsmRef.current.redo()) syncObjects(); };

  const handleZoomChange = (newZoom, newPan) => {
    setZoom(newZoom);
    if (newPan) setPan(newPan);
  };

  const handleZoomIn = () => handleZoomChange(Math.min(20, zoom * 1.2), null);
  const handleZoomOut = () => handleZoomChange(Math.max(0.05, zoom / 1.2), null);
  const handleFitView = () => { setZoom(1); setPan({ x: 100, y: 80 }); };

  const handleSelect = (id) => setSelectedId(id);

  const handleLegendDragStart = (e) => {
    const panel = e.currentTarget.parentElement;
    if (!panel) return;
    const container = panel.offsetParent;
    if (!container) return;
    const panelRect = panel.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    legendDragRef.current = {
      offsetX: e.clientX - panelRect.left,
      offsetY: e.clientY - panelRect.top,
      containerX: containerRect.left,
      containerY: containerRect.top,
    };
    setLegendPos({
      x: panelRect.left - containerRect.left,
      y: panelRect.top - containerRect.top,
    });
    e.preventDefault();
  };
  useEffect(() => {
    if (legendPos === null) return;
    const handleMove = (e) => {
      if (!legendDragRef.current) return;
      const { offsetX, offsetY, containerX, containerY } = legendDragRef.current;
      setLegendPos({ x: e.clientX - offsetX - containerX, y: e.clientY - offsetY - containerY });
    };
    const handleUp = () => { legendDragRef.current = null; };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [legendPos !== null]);
  const selectedObj = objects.find(o => o.id === selectedId) || null;

  const handleUpdateObject = (id, changes) => {
    const obj = objects.find(o => o.id === id);
    dsmRef.current.update(id, changes);
    syncObjects();
    // If a mustateel's label was manually changed to a number, continue numbering from there
    if (obj && obj.type === "mustateel" && changes.label !== undefined) {
      const m = String(changes.label).match(/(\d+)/);
      if (m) setMustateelStartNum(String(parseInt(m[1], 10) + 1));
    }
  };

  const handleDeleteObject = (id) => {
    dsmRef.current.remove(id);
    setSelectedId(null);
    syncObjects();
  };

  const handleCopy = () => {
    let toCopy;
    if (selectedObj) {
      toCopy = [JSON.parse(JSON.stringify(selectedObj))];
    } else {
      toCopy = dsmRef.current.objects.map(o => JSON.parse(JSON.stringify(o)));
    }
    clipboardRef.current = toCopy;
    saveToClipboard(toCopy);
    toast.success(`${toCopy.length} object(s) copied — paste anywhere, even on another map`);
  };

  const handleSelectAll = () => {
    const all = dsmRef.current.objects.map(o => JSON.parse(JSON.stringify(o)));
    clipboardRef.current = all;
    saveToClipboard(all);
    toast.success(`${all.length} object(s) copied — paste anywhere, even on another map`);
  };

  const handleBoxSelect = (selectedObjects) => {
    if (selectedObjects.length === 0) { toast.info("No objects in selection box"); return; }
    const copies = selectedObjects.map(o => JSON.parse(JSON.stringify(o)));
    clipboardRef.current = copies;
    saveToClipboard(copies);
    toast.success(`${copies.length} object(s) copied — paste anywhere, even on another map`);
  };

  const handlePaste = () => {
    // Load from cross-map clipboard (localStorage) — works even after navigating to another map
    const clip = loadFromClipboard();
    if (clip.length === 0) { toast.warning("Clipboard is empty — copy something first"); return; }
    const dupes = duplicateObjects(clip);
    dupes.forEach(o => dsmRef.current.add(o));
    syncObjects();
    if (dupes.length > 0) setSelectedId(dupes[0].id);
    toast.success(`${dupes.length} object(s) pasted`);
  };

  // Download map as JSON — re-uploadable to recreate same map
  const handleDownloadJSON = () => {
    const data = {
      format: "chakbandi_gis_map",
      version: 1,
      mapData: {
        title: mapData?.title || "Untitled",
        village: mapData?.village || "",
        tehsil: mapData?.tehsil || "",
        district: mapData?.district || "",
        status: mapData?.status || "draft",
      },
      objects: dsmRef.current.objects,
      viewport: { zoom, pan },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${mapData?.title || "map"}.chakbandi.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Map downloaded — upload it later to recreate");
  };

  // Upload JSON to import objects into this map
  const handleUploadJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const objs = data.objects || data;
        if (!Array.isArray(objs)) throw new Error("Invalid format");
        objs.forEach(o => dsmRef.current.add(o));
        syncObjects();
        saveRef.current();
        toast.success(`${objs.length} object(s) imported from file`);
      } catch {
        toast.error("Invalid map file — must be a .chakbandi.json export");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLayerChange = (layerId, changes) => {
    setLayers(prev => ({ ...prev, [layerId]: { ...prev[layerId], ...changes } }));
  };

  const handleColorChange = (key, value) => {
    setColorSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (extra = {}) => {
    if (!mapId) return;
    const parcels = dsmRef.current.getByType("mustateel").length +
      dsmRef.current.getByType("muraba").length;
    saveMutation.mutate({
      drawing_data: dsmRef.current.serialize(),
      total_parcels: parcels,
      viewport: JSON.stringify({ zoom, pan }),
      ...extra,
    });
  };

  const handleStatusChange = (status) => {
    saveMutation.mutate({ status });
    queryClient.setQueryData(["map", mapId], (old) => old ? { ...old, status } : old);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); setShowPrint(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") { e.preventDefault(); handleSelectAll(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); handlePaste(); }
      if (e.key === "Escape") handleStopDrawing();
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) handleDeleteObject(selectedId);
      }
      const shortcuts = { v: "select", h: "pan", d: "move", a: "acre", m: "mustateel", b: "muraba", c: "canal", k: "chakbandi", o: "outlet", w: "khal", r: "road", u: "mouza", g: "damageMarker", x: "measure", e: "eraser", f: "fitView", q: "boxSelect" };
      if (!e.ctrlKey && !e.metaKey && shortcuts[e.key]) {
        if (e.key === "f") handleFitView();
        else handleToolChange(shortcuts[e.key]);
      }
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, activeTool, canalDraft, chakbandiDraft, khalDraft, roadDraft, mouzaDraft, zoom, pan]);

  // Undo last point of the active line draft (canal/chakbandi/khal/road/mouza)
  const handleUndoPoint = useCallback(() => {
    if (canalDraft) setCanalDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (chakbandiDraft) setChakbandiDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (khalDraft) setKhalDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (roadDraft) setRoadDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (mouzaDraft) setMouzaDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
  }, [canalDraft, chakbandiDraft, khalDraft, roadDraft, mouzaDraft]);

  if (!mapId) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <p className="text-slate-500">No map ID provided.</p>
      </div>
    );
  }

  const draftActive = !!(canalDraft || chakbandiDraft || khalDraft || roadDraft || mouzaDraft);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: bgColor }}>
      <EditorHeader
        mapData={mapData}
        onSave={handleSave}
        onStatusChange={handleStatusChange}
        isSaving={saveMutation.isPending}
        activeTool={activeTool}
        onStopDrawing={handleStopDrawing}
        canalDraftActive={draftActive}
        onUndoPoint={handleUndoPoint}
        onExport={() => setShowExport(true)}
        onEditDetails={() => setShowMapDetails(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Tool Panel */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
          <ToolPanel
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <GISCanvas
            ref={canvasRef}
            objects={objects.filter(o => {
              // Moga visibility filter: if any mogas have explicit visibility set,
              // hide chakbandi/mustateel that belong to hidden mogas
              if ((o.type === "chakbandi" || o.type === "mustateel") && o.mogaNumber) {
                return visibleMogas[o.mogaNumber] !== false;
              }
              return true;
            })}
            activeTool={activeTool}
            zoom={zoom}
            pan={pan}
            layers={layers}
            selectedId={selectedId}
            onSelect={handleSelect}
            onAddObject={handleAddObject}
            onUpdateObject={handleUpdateObject}
            canalDraft={canalDraft}
            onCanalPointAdd={handleCanalPointAdd}
            onCanalFinish={handleCanalFinish}
            chakbandiDraft={chakbandiDraft}
            onChakbandiPointAdd={handleChakbandiPointAdd}
            onChakbandiFinish={handleChakbandiFinish}
            outletDraft={outletDraft}
            onOutletStart={handleOutletStart}
            onOutletFinish={handleOutletFinish}
            khalDraft={khalDraft}
            onKhalPointAdd={handleKhalPointAdd}
            onKhalFinish={handleKhalFinish}
            roadDraft={roadDraft}
            onRoadPointAdd={handleRoadPointAdd}
            onRoadFinish={handleRoadFinish}
            mouzaDraft={mouzaDraft}
            onMouzaPointAdd={handleMouzaPointAdd}
            onMouzaFinish={handleMouzaFinish}
            snapPos={snapPos}
            onSnapPosChange={setSnapPos}
            onPanChange={setPan}
            onZoomChange={handleZoomChange}
            colorSettings={colorSettings}
            bgColor={bgColor}
            snapSettings={{ ...snapSettings, zoom }}
            onDamageMarkerClick={handleDamageMarkerClick}
            freehandMode={freehandMode}
            gridFlags={gridFlags}
            killaVisibility={{
              mustateel: killaVisibility.mustateel && killaNumbersGlobal,
              muraba: killaVisibility.muraba && killaNumbersGlobal,
            }}
            onBoxSelect={handleBoxSelect}
            pageBorderStyle={pageBorderStyle}
          />

          {/* Top-right toolbar buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${showLegend ? "bg-blue-600 border-blue-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}
              onClick={() => { setShowLegend(v => !v); setShowLayers(false); setShowColors(false); setShowSnap(false); }}
              title="Legend">
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${showLayers ? "bg-blue-600 border-blue-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}
              onClick={() => { setShowLayers(v => !v); setShowLegend(false); setShowColors(false); setShowSnap(false); }}
              title="Layers">
              <Layers className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${showColors ? "bg-purple-600 border-purple-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50"}`}
              onClick={() => { setShowColors(v => !v); setShowLayers(false); setShowLegend(false); setShowSnap(false); }}
              title="Colour Settings">
              <Palette className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${showSnap ? "bg-violet-600 border-violet-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-violet-600 hover:bg-violet-50"}`}
              onClick={() => { setShowSnap(v => !v); setShowLayers(false); setShowLegend(false); setShowColors(false); }}
              title="Snap Engine">
              <Magnet className="w-4 h-4" />
            </Button>
            {(activeTool === "chakbandi" || activeTool === "mouza") && (
              <Button variant="ghost" size="icon"
                className={`w-9 h-9 border shadow-md transition-all ${freehandMode ? "bg-green-600 border-green-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-green-600 hover:bg-green-50"}`}
                onClick={() => setFreehandMode(v => !v)}
                title="Freehand Mode (drag to draw)">
                <Pen className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 shadow-md"
              onClick={() => setShowPrint(true)}
              title="Print Preview (Ctrl+P)">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${pageBorderStyle !== "none" ? "bg-blue-600 border-blue-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}
              onClick={() => setPageBorderStyle(prev => {
                const styles = ["none", "dashed", "solid", "dotted"];
                return styles[(styles.indexOf(prev) + 1) % styles.length];
              })}
              title={`Page Border: ${pageBorderStyle !== "none" ? pageBorderStyle : "off"} (click to cycle)`}>
              <Frame className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${gridFlags.showMustateel ? "bg-red-500 border-red-400 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50"}`}
              onClick={() => setGridFlags(f => ({ ...f, showMustateel: !f.showMustateel }))}
              title="Toggle Mustateel Grid">
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${gridFlags.showMuraba ? "bg-orange-500 border-orange-400 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-orange-500 hover:bg-orange-50"}`}
              onClick={() => setGridFlags(f => ({ ...f, showMuraba: !f.showMuraba }))}
              title="Toggle Muraba Grid">
              <Grid3x3 className="w-4 h-4 opacity-70" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-green-600 hover:bg-green-50 shadow-md"
              onClick={() => { setGroupName(mapData?.title || ""); setShowGroupDialog(true); }}
              title="Name / Group this map as a Moga">
              <Group className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 shadow-md"
              onClick={() => handleSave()}
              title="Save Map (Ctrl+S)">
              <Save className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 shadow-md"
              onClick={handleSelectAll}
              title="Select All (Ctrl+A)">
              <SquareStack className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 shadow-md"
              onClick={handleCopy}
              title="Copy (Ctrl+C)">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 shadow-md"
              onClick={handlePaste}
              title="Paste (Ctrl+V)">
              <Clipboard className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${activeTool === "boxSelect" ? "bg-blue-600 border-blue-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}
              onClick={() => handleToolChange("boxSelect")}
              title="Box Select (Q) — drag to select area, then paste">
              <BoxSelect className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 shadow-md"
              onClick={handleDownloadJSON}
              title="Download Map (.json)">
              <FileDown className="w-4 h-4" />
            </Button>
            <label className="w-9 h-9 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 shadow-md cursor-pointer transition-all" title="Upload Map (.json)">
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json,.chakbandi.json" onChange={handleUploadJSON} className="hidden" />
            </label>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 shadow-md"
              onClick={() => setShowAICommand(true)}
              title="AI Command — type to draw map">
              <Wand2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50 shadow-md"
              onClick={() => setShowScan(true)}
              title="Scan Map with Camera / AI">
              <Camera className="w-4 h-4" />
            </Button>
            {/* Global Killa Numbers toggle */}
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${killaNumbersGlobal ? "bg-red-500 border-red-400 text-white" : "bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50"}`}
              onClick={() => setKillaNumbersGlobal(v => !v)}
              title={killaNumbersGlobal ? "Hide All Killa Numbers" : "Show All Killa Numbers"}>
              {killaNumbersGlobal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            {/* Mustateel start number input */}
            {activeTool === "mustateel" && (
              <div className="flex flex-col items-center gap-0.5" title="Mustateel numbering start">
                <span className="text-[8px] text-slate-400 font-mono leading-none">Start#</span>
                <input
                  type="number"
                  value={mustateelStartNum}
                  onChange={e => setMustateelStartNum(e.target.value)}
                  placeholder="auto"
                  className="w-9 h-7 text-[10px] text-center border border-slate-300 rounded bg-white text-slate-700 font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
            )}
          </div>

          {/* Panels */}
          {showLegend && (
            <div
              className="absolute z-20"
              style={legendPos
                ? { left: legendPos.x, top: legendPos.y, right: "auto" }
                : { top: "200px", right: "12px" }}
            >
              <LegendPanel
                colorSettings={colorSettings}
                killaVisibility={killaVisibility}
                onKillaVisibilityChange={(type, val) => setKillaVisibility(prev => ({ ...prev, [type]: val }))}
                layers={layers}
                onLayerChange={handleLayerChange}
                onDragStart={handleLegendDragStart}
                onResetPos={() => setLegendPos(null)}
              />
            </div>
          )}
          {showLayers && (
            <div className="absolute top-[200px] right-3 z-20">
              <MogaFilterPanel
                objects={objects}
                layers={layers}
                onLayerChange={handleLayerChange}
                visibleMogas={visibleMogas}
                onMogaVisibilityChange={(moga, vis) => setVisibleMogas(prev => ({ ...prev, [moga]: vis }))}
                onZoomToMoga={(moga) => {
                  const pts = objects.filter(o => o.mogaNumber === moga && o.points).flatMap(o => o.points);
                  if (pts.length === 0) return;
                  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
                  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
                  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
                  setPan({ x: -cx * zoom + 400, y: -cy * zoom + 300 });
                }}
                onPrintMoga={(moga) => { setPrintMogaFilter(moga); setShowPrint(true); }}
                onClose={() => setShowLayers(false)}
                killaVisibility={killaVisibility}
                onKillaVisibilityChange={(type, val) => setKillaVisibility(prev => ({ ...prev, [type]: val }))}
              />
            </div>
          )}
          {showColors && (
            <div className="absolute top-[200px] right-3 z-20">
              <ColorSettingsPanel
                colorSettings={colorSettings}
                onColorChange={handleColorChange}
                bgColor={bgColor}
                onBgColorChange={setBgColor}
                onClose={() => setShowColors(false)}
              />
            </div>
          )}
          {showSnap && (
            <div className="absolute top-[260px] right-3 z-20">
              <SnapSettingsPanel snapSettings={snapSettings} onSnapChange={handleSnapChange} />
            </div>
          )}
        </div>

        {/* Properties Panel — top-right on desktop, bottom-left on mobile */}
        {selectedObj && (
          <div className="absolute z-30
            right-3 top-1/2 -translate-y-1/2
            sm:right-3 sm:top-1/2 sm:-translate-y-1/2
            max-sm:right-auto max-sm:left-2 max-sm:top-auto max-sm:bottom-16 max-sm:translate-y-0 max-sm:translate-x-0">
            <PropertiesPanel
              selectedObj={selectedObj}
              allObjects={objects}
              onUpdate={handleUpdateObject}
              onDelete={handleDeleteObject}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>

      <StatusBar
        zoom={zoom}
        snapPos={snapPos}
        activeTool={activeTool}
        objectCount={objects.length}
        canalDraftLen={(canalDraft?.length || 0) + (chakbandiDraft?.length || 0)}
      />

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        mapData={mapData}
        objects={objects}
        killaVisibility={{ mustateel: killaVisibility.mustateel && killaNumbersGlobal, muraba: killaVisibility.muraba && killaNumbersGlobal }}
        colorSettings={colorSettings}
        pageBorderStyle={pageBorderStyle}
      />

      {showPrint && (
        <PrintPreview
          mapData={mapData}
          objects={objects}
          colorSettings={colorSettings}
          selectedMogaFilter={printMogaFilter}
          killaVisibility={{ mustateel: killaVisibility.mustateel && killaNumbersGlobal, muraba: killaVisibility.muraba && killaNumbersGlobal }}
          pageBorderStyle={pageBorderStyle}
          onClose={() => { setShowPrint(false); setPrintMogaFilter(""); }}
        />
      )}

      {/* AI Command Panel */}
      {showAICommand && (
        <AICommandPanel
          objects={objects}
          onApply={handleAICommand}
          onClose={() => setShowAICommand(false)}
        />
      )}

      {/* Scan Map Dialog */}
      {showScan && (
        <MapScanDialog onClose={() => setShowScan(false)} onAddObjects={(objs) => {
          objs.forEach(o => dsmRef.current.add(o));
          syncObjects();
          setShowScan(false);
          toast.success("AI scan complete — objects added to map");
        }} />
      )}

      {/* Map Details Dialog */}
      <MapDetailsDialog
        open={showMapDetails}
        mapData={mapData}
        onClose={() => setShowMapDetails(false)}
        onSave={(data) => handleSave(data)}
      />

      {/* Moga Group / Name Dialog */}
      {showGroupDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 font-heading">Name / Group this Map</h3>
            <p className="text-xs text-slate-500">Assign a Moga name to this map so it can be printed or filtered as a single unit.</p>
            <Input
              className="h-9 text-sm border-slate-200"
              placeholder="e.g. Moga 18500 L"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowGroupDialog(false)}>Cancel</Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                if (groupName.trim()) {
                  handleSave({ title: groupName.trim() });
                  toast.success(`Map grouped as: ${groupName.trim()}`);
                }
                setShowGroupDialog(false);
              }}>Save Group Name</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}