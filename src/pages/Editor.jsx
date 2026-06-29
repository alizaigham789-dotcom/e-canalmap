import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GISCanvas from "@/components/editor/GISCanvas";
import ToolPanel from "@/components/editor/ToolPanel";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import LayerPanel from "@/components/editor/LayerPanel";
import StatusBar from "@/components/editor/StatusBar";
import EditorHeader from "@/components/editor/EditorHeader";
import ExportDialog from "@/components/editor/ExportDialog";
import LegendPanel from "@/components/editor/LegendPanel";
import MapScanDialog from "@/components/editor/MapScanDialog";

import ColorSettingsPanel from "@/components/editor/ColorSettingsPanel";
import PrintPreview from "@/components/editor/PrintPreview";
import {
  DrawingStateManager,
  createAcre, createMustateel, createMuraba, createCanal, createKhal, createRoad, createOutlet, createChakbandi, createMouza,
  createDamageMarker, createDamageMarkerLine, findNonOverlappingPosition, snapToNearestBoundary, autoAssignLabel, rectsOverlap
} from "@/lib/gisEngine";
import { Layers, BookOpen, Palette, Printer, Magnet, Pen, Grid3x3, Group, Save, Camera, Download, Loader2, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SnapSettingsPanel from "@/components/editor/SnapSettingsPanel";
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
  const [showLegend, setShowLegend] = useState(false);
  const [killaVisibility, setKillaVisibility] = useState({ mustateel: true, muraba: true });
  const [killaNumbersGlobal, setKillaNumbersGlobal] = useState(true);
  const [mustateelStartNum, setMustateelStartNum] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showSnap, setShowSnap] = useState(false);
  const [snapSettings, setSnapSettings] = useState({ gridSnap: true, spineSnap: true, mogaSnap: true });
  const [freehandMode, setFreehandMode] = useState(false);
  const [gridFlags, setGridFlags] = useState({ showMustateel: true, showMuraba: false });
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
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

  const dsmRef = useRef(new DrawingStateManager([]));
  const autoSaveTimer = useRef(null);
  const canvasRef = useRef(null);

  const { data: mapData } = useQuery({
    queryKey: ["map", mapId],
    queryFn: () => base44.entities.LandMap.filter({ id: mapId }).then(r => r[0]),
    enabled: !!mapId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.LandMap.update(mapId, data),
    onSuccess: () => toast.success("Map saved", { duration: 1500 }),
    onError: () => toast.error("Save failed"),
  });

  useEffect(() => {
    if (mapData?.drawing_data) {
      const loaded = DrawingStateManager.deserialize(mapData.drawing_data);
      dsmRef.current = new DrawingStateManager(loaded);
      setObjects([...dsmRef.current.objects]);
      syncUndoRedo();
    }
    if (mapData?.viewport) {
      try {
        const vp = JSON.parse(mapData.viewport);
        if (vp.zoom) setZoom(vp.zoom);
        if (vp.pan) setPan(vp.pan);
      } catch {}
    }
  }, [mapData?.id]);

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
    autoSaveTimer.current = setTimeout(() => {
      if (mapId) {
        const parcels = dsmRef.current.getByType("mustateel").length +
          dsmRef.current.getByType("muraba").length;
        saveMutation.mutate({
          drawing_data: dsmRef.current.serialize(),
          total_parcels: parcels,
          viewport: JSON.stringify({ zoom, pan }),
        });
      }
    }, 2500);
  };

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
      const startN = mustateelStartNum !== "" ? parseInt(mustateelStartNum, 10) : null;
      obj.label = autoAssignLabel("mustateel", dsmRef.current.objects, startN);
      if (startN !== null) setMustateelStartNum(String(parseInt(obj.label, 10) + 1));
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
    setCanalDraft(prev => {
      if (prev && prev.length >= 2) {
        const canal = createCanal(prev);
        dsmRef.current.add(canal);
        setSelectedId(canal.id);
        syncObjects();
      }
      return null;
    });
  }, []);

  const handleChakbandiPointAdd = useCallback((pt) => {
    setChakbandiDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleChakbandiFinish = useCallback(() => {
    setChakbandiDraft(prev => {
      if (prev && prev.length >= 2) {
        const cb = createChakbandi(prev);
        dsmRef.current.add(cb);
        setSelectedId(cb.id);
        syncObjects();
      }
      return null;
    });
  }, []);

  const handleKhalPointAdd = useCallback((pt) => {
    setKhalDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleKhalFinish = useCallback(() => {
    setKhalDraft(prev => {
      if (prev && prev.length >= 2) {
        const khal = createKhal(prev);
        dsmRef.current.add(khal);
        setSelectedId(khal.id);
        syncObjects();
      }
      return null;
    });
  }, []);

  const handleRoadPointAdd = useCallback((pt) => {
    setRoadDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleRoadFinish = useCallback(() => {
    setRoadDraft(prev => {
      if (prev && prev.length >= 2) {
        const road = createRoad(prev);
        dsmRef.current.add(road);
        setSelectedId(road.id);
        syncObjects();
      }
      return null;
    });
  }, []);

  const handleMouzaPointAdd = useCallback((pt) => {
    setMouzaDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleMouzaFinish = useCallback(() => {
    setMouzaDraft(prev => {
      if (prev && prev.length >= 2) {
        const mouza = createMouza(prev);
        dsmRef.current.add(mouza);
        setSelectedId(mouza.id);
        syncObjects();
      }
      return null;
    });
  }, []);

  const handleOutletStart = useCallback((pt, canalId) => {
    setOutletDraft({ x: pt.x, y: pt.y, canalId });
  }, []);

  const handleOutletFinish = useCallback((endPt) => {
    setOutletDraft(prev => {
      if (prev) {
        const outlet = createOutlet(prev.canalId, { x: prev.x, y: prev.y }, endPt);
        dsmRef.current.add(outlet);
        setSelectedId(outlet.id);
        syncObjects();
      }
      return null;
    });
  }, []);

  const handleSnapChange = (key, val) => setSnapSettings(prev => ({ ...prev, [key]: val }));

  const handleDamageMarkerClick = () => {}; // no-op: line-based, no dialog

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
  const selectedObj = objects.find(o => o.id === selectedId) || null;

  const handleUpdateObject = (id, changes) => {
    dsmRef.current.update(id, changes);
    syncObjects();
  };

  const handleDeleteObject = (id) => {
    dsmRef.current.remove(id);
    setSelectedId(null);
    syncObjects();
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
    queryClient.invalidateQueries({ queryKey: ["map", mapId] });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); setShowPrint(true); }
      if (e.key === "Escape") handleStopDrawing();
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) handleDeleteObject(selectedId);
      }
      const shortcuts = { v: "select", h: "pan", d: "move", a: "acre", m: "mustateel", b: "muraba", c: "canal", k: "chakbandi", o: "outlet", w: "khal", r: "road", u: "mouza", g: "damageMarker", e: "eraser", f: "fitView" };
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
        onExport={() => setShowExport(true)}
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
            objects={objects}
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
            <div className="absolute top-[200px] right-3 z-20">
              <LegendPanel
                colorSettings={colorSettings}
                killaVisibility={killaVisibility}
                onKillaVisibilityChange={(type, val) => setKillaVisibility(prev => ({ ...prev, [type]: val }))}
              />
            </div>
          )}
          {showLayers && (
            <div className="absolute top-[200px] right-3 z-20">
              <LayerPanel layers={layers} onLayerChange={handleLayerChange} />
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
      />

      {showPrint && (
        <PrintPreview
          mapData={mapData}
          canvasRef={canvasRef}
          objects={objects}
          zoom={zoom}
          pan={pan}
          colorSettings={colorSettings}
          killaNumbersGlobal={killaNumbersGlobal}
          killaVisibility={killaVisibility}
          onClose={() => setShowPrint(false)}
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

      {/* Damage tool is now a simple line drawn directly on canvas — no dialog */}

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