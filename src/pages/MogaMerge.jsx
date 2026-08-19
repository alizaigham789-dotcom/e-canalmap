// ============================================================
// MOGA MERGE TO ONE MAP — dedicated module.
// Phase 1 (start form): capture Mouza / Section / Subdivision /
//   Division + select single-moga maps to merge.
// Phase 2 (editor-like view): EditorHeader + Urdu MapHeaderLine +
//   slim tool panel (Move + Hand only) + canvas + StatusBar.
// Save → a normal LandMap that shows up & overlays in Geo Map.
// ============================================================

import React, { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

import EditorHeader from "@/components/editor/EditorHeader";
import MapHeaderLine from "@/components/editor/MapHeaderLine";
import StatusBar from "@/components/editor/StatusBar";
import MergeToolPanel from "@/components/mogamerge/MergeToolPanel";
import MergeStartForm from "@/components/mogamerge/MergeStartForm";
import MogaMergeCanvas from "@/components/mogamerge/MogaMergeCanvas";

import { buildMouzaMerge } from "@/lib/mogaMerge";
import { loadDrawingData, storeDrawingData } from "@/lib/drawingDataStorage";

// Apply a world offset to one object's geometry (commit a group move)
function offsetObj(o, dx, dy) {
  const copy = { ...o };
  if (["acre", "mustateel", "muraba", "damageMarker"].includes(o.type)) {
    copy.x = (o.x || 0) + dx; copy.y = (o.y || 0) + dy;
  }
  if (o.points) copy.points = o.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  if (o.start && o.end) {
    copy.start = { x: o.start.x + dx, y: o.start.y + dy };
    copy.end = { x: o.end.x + dx, y: o.end.y + dy };
  }
  return copy;
}

export default function MogaMerge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState("setup"); // "setup" | "editor"
  const [mouza, setMouza] = useState("");
  const [section, setSection] = useState("");
  const [subdivision, setSubdivision] = useState("");
  const [division, setDivision] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");

  const [selected, setSelected] = useState(new Set());
  const [objects, setObjects] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [activeTool, setActiveTool] = useState("move");
  const [zoom, setZoom] = useState(0.15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const titleRef = useRef("");
  titleRef.current = title;

  const { data: maps, isLoading } = useQuery({
    queryKey: ["landmaps-all"],
    queryFn: () => base44.entities.LandMap.list("-updated_date", 500),
  });

  // Single-moga maps grouped by village
  const villages = useMemo(
    () => [...new Set((maps || []).filter((m) => m.village && m.moga_number).map((m) => m.village))].sort(),
    [maps]
  );
  const villageMogas = useMemo(
    () =>
      (maps || [])
        .filter((m) => m.village === mouza && m.moga_number && m.drawing_data)
        .sort((a, b) => (parseInt(a.moga_number) || 0) - (parseInt(b.moga_number) || 0)),
    [maps, mouza]
  );

  const selectedSet = selected.size ? selected : new Set(villageMogas.map((m) => m.id));
  const allSelected = villageMogas.length > 0 && selectedSet.size === villageMogas.length;

  const toggle = (id) => {
    setError(null);
    setSelected((prev) => {
      const base = prev.size ? prev : new Set(villageMogas.map((m) => m.id));
      const next = new Set(base);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(villageMogas.map((m) => m.id)));

  // When the user picks a Mouza, auto-fill Section/Subdivision/Division
  // from the first moga of that village (editable afterwards).
  const handleMouzaChange = (v) => {
    setMouza(v);
    setSelected(new Set());
    setObjects([]);
    setError(null);
    const first = (maps || []).find((m) => m.village === v && m.moga_number);
    if (first) {
      setSection(first.section || "");
      setSubdivision(first.tehsil || "");
      setDivision(first.district || "");
    }
  };

  const handleFieldChange = (key, value) => {
    if (key === "section") setSection(value);
    else if (key === "subdivision") setSubdivision(value);
    else if (key === "division") setDivision(value);
  };

  // Resolve drawing_data (handles URL-stored large maps) → inline JSON map records
  const resolveMaps = async (ids) => {
    const chosen = villageMogas.filter((m) => ids.has(m.id));
    return Promise.all(
      chosen.map(async (m) => {
        const objs = await loadDrawingData(m.drawing_data);
        return { ...m, drawing_data: JSON.stringify(objs) };
      })
    );
  };

  // Build / rebuild the merged mouza map → switch to editor-like view
  const handleBuild = async () => {
    const ids = selectedSet;
    if (!ids.size) { setError("کم از کم ایک موگہ منتخب کریں۔"); return; }
    setBusy(true); setError(null);
    try {
      const resolved = await resolveMaps(ids);
      const { objects: merged } = buildMouzaMerge(resolved);
      if (!merged.length) { setError("مرج کرنے کے لیے کوئی ڈیٹا نہیں ملا۔"); return; }
      setObjects(merged);
      setSelectedGroup(null);
      setFitSignal((s) => s + 1);
      if (!title) setTitle(`موضع نقشہ - ${mouza}`);
      setPhase("editor");
    } catch (e) {
      setError("مرج میں مسئلہ: " + (e?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  // Manual commit of a whole-moga drag (canvas → state)
  const handleCommitMove = useCallback((groupId, dx, dy) => {
    setObjects((prev) => prev.map((o) => (o.mogaGroup === groupId ? offsetObj(o, dx, dy) : o)));
  }, []);

  // Save the merged map as a normal LandMap → appears in Geo Map list
  const handleSave = async (extra) => {
    // Title-only edit from the header (no create/navigation yet)
    if (extra && extra.title !== undefined && Object.keys(extra).length === 1) {
      setTitle(extra.title);
      return;
    }
    if (!objects.length) { setError("پہلے مرج کریں۔"); return; }
    setBusy(true); setError(null);
    try {
      const parcels = objects.filter((o) => ["mustateel", "muraba"].includes(o.type)).length;
      const saved = await base44.entities.LandMap.create({
        title: titleRef.current || `موضع نقشہ - ${mouza}`,
        village: mouza,
        section,
        tehsil: subdivision,
        district: division,
        status,
        drawing_data: await storeDrawingData(objects),
        total_parcels: parcels,
      });
      queryClient.invalidateQueries({ queryKey: ["landmaps-all"] });
      queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
      toast.success("موضع نقشہ محفوظ ہو گیا — ایڈیٹر میں کھل رہا ہے");
      navigate(`/editor?id=${saved.id}`);
      return saved;
    } catch (e) {
      setError("محفوظ کرنے میں مسئلہ: " + (e?.message || "unknown"));
      setBusy(false);
    }
  };

  const handleFitView = () => canvasRef.current?.fitView?.();
  const handleZoomIn = () => canvasRef.current?.zoomIn?.();
  const handleZoomOut = () => canvasRef.current?.zoomOut?.();

  // Synthetic mapData so EditorHeader + MapHeaderLine render like the editor
  const mapData = useMemo(
    () => ({
      title: title || `موضع نقشہ - ${mouza}`,
      status,
      village: mouza,
      section,
      tehsil: subdivision,
      district: division,
      moga_number: null,
      mogha_side: null,
      rajbah: null,
      zilladar_section: null,
    }),
    [title, status, mouza, section, subdivision, division]
  );

  // ---- SETUP PHASE ----
  if (phase === "setup") {
    return (
      <MergeStartForm
        villages={villages}
        mouza={mouza}
        onMouzaChange={handleMouzaChange}
        villageMogas={villageMogas}
        selectedSet={selectedSet}
        allSelected={allSelected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        section={section}
        subdivision={subdivision}
        division={division}
        onFieldChange={handleFieldChange}
        onBuild={handleBuild}
        busy={busy}
        error={error}
        isLoading={isLoading}
        onBack={() => navigate("/")}
      />
    );
  }

  // ---- EDITOR-LIKE PHASE ----
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <EditorHeader
        mapData={mapData}
        onSave={handleSave}
        onPermanentSave={handleSave}
        permSaving={busy}
        onStatusChange={setStatus}
        isSaving={busy}
        activeTool={activeTool}
        onStopDrawing={() => {}}
        canalDraftActive={false}
        onUndoPoint={() => {}}
        onExport={() => handleSave()}
        onEditDetails={() => setPhase("setup")}
        onRecovery={() => toast.info("مرج ماڈیول میں بیک اپ نہیں — پہلے محفوظ کریں")}
      />

      <MapHeaderLine mapData={mapData} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Slim tool panel — Move + Hand only */}
        <div className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-20">
          <MergeToolPanel
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {objects.length ? (
            <MogaMergeCanvas
              ref={canvasRef}
              objects={objects}
              selectedGroup={selectedGroup}
              onSelectGroup={setSelectedGroup}
              onCommitMove={handleCommitMove}
              fitSignal={fitSignal}
              activeTool={activeTool}
              onZoomChange={setZoom}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <p className="text-sm text-slate-400">کوئی ڈیٹا نہیں — واپس جا کر مرج کریں</p>
            </div>
          )}
        </div>
      </div>

      <StatusBar
        zoom={zoom}
        snapPos={null}
        activeTool={activeTool}
        objectCount={objects.length}
        canalDraftLen={0}
      />
    </div>
  );
}