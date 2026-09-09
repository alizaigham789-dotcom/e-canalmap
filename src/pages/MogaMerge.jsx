// ============================================================
// MOGA MERGE TO ONE MAP — dedicated module.
// Phase 1 (start form): capture Mouza / Section / Subdivision /
//   Division + pick ONE anchor moga to place first.
// Phase 2 (editor canvas): the anchor moga renders; yellow dummy
//   mustateel cells appear on every open edge. Clicking a dummy
//   opens a dialog where the user types the mustateel (Khasra)
//   number — the matching unplaced moga attaches so its
//   mustateel lands exactly on that cell. Repeat to build the
//   whole mouza map, one moga at a time.
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
import DummyMustateelDialog from "@/components/geomap/DummyMustateelDialog";

import { computeObjectsBounds } from "@/lib/mogaMerge";
import { getEdgeDummyMustateels } from "@/lib/mogaArrange";
import { loadDrawingData, storeDrawingData } from "@/lib/drawingDataStorage";

const PARCEL_TYPES = ["acre", "mustateel", "muraba", "damageMarker"];

// Deep-copy an object, give it a fresh id, tag its moga group, and translate
// its geometry by (dx, dy). Used for both the anchor placement and attaching.
function cloneWithTag(o, dx, dy, groupId, groupName) {
  const c = JSON.parse(JSON.stringify(o));
  c.id = `${o.type || "obj"}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  c.mogaGroup = groupId;
  c.mogaGroupName = groupName || "";
  if (PARCEL_TYPES.includes(o.type)) {
    c.x = (o.x || 0) + dx;
    c.y = (o.y || 0) + dy;
  }
  if (c.points) c.points = c.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  if (c.start && c.end) {
    c.start = { x: c.start.x + dx, y: c.start.y + dy };
    c.end = { x: c.end.x + dx, y: c.end.y + dy };
  }
  return c;
}

// Apply a world offset to one object's geometry (commit a group move)
function offsetObj(o, dx, dy) {
  return cloneWithTag(o, dx, dy, o.mogaGroup, o.mogaGroupName);
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

  const [anchorMapId, setAnchorMapId] = useState(null);
  const [placedMapIds, setPlacedMapIds] = useState(new Set());
  const [resolvedObjs, setResolvedObjs] = useState({}); // moga id → parsed objects
  const [objects, setObjects] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [activeTool, setActiveTool] = useState("move");
  const [zoom, setZoom] = useState(0.15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dialogDummy, setDialogDummy] = useState(null);

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

  // Yellow dummy cells on every open edge of the placed mustateels
  const dummies = useMemo(() => getEdgeDummyMustateels(objects), [objects]);

  // When the user picks a Mouza, auto-fill Section/Subdivision/Division
  // from the first moga of that village (editable afterwards).
  const handleMouzaChange = (v) => {
    setMouza(v);
    setAnchorMapId(null);
    setObjects([]);
    setPlacedMapIds(new Set());
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

  // Start: place the anchor moga at the origin and resolve all village mogas
  // (so the attach dialog can search their mustateels later).
  const handleStart = async () => {
    if (!anchorMapId) { setError("پہلے ایک موگہ منتخب کریں۔"); return; }
    setBusy(true); setError(null);
    try {
      const resolved = {};
      await Promise.all(
        villageMogas.map(async (m) => {
          try { resolved[m.id] = await loadDrawingData(m.drawing_data); }
          catch { resolved[m.id] = []; }
        })
      );
      setResolvedObjs(resolved);

      const anchorObjs = resolved[anchorMapId] || [];
      if (!anchorObjs.length) { setError("اس موگہ میں کوئی ڈیٹا نہیں۔"); setBusy(false); return; }

      // Normalise the anchor to the origin so the merged map starts near (0,0)
      const bounds = computeObjectsBounds(anchorObjs);
      const dx = bounds ? -bounds.minX : 0;
      const dy = bounds ? -bounds.minY : 0;
      const anchorName = villageMogas.find((v) => v.id === anchorMapId)?.moga_number || "";
      const placed = anchorObjs.map((o) => cloneWithTag(o, dx, dy, anchorMapId, anchorName));

      setObjects(placed);
      setPlacedMapIds(new Set([anchorMapId]));
      if (!title) setTitle(`موضع نقشہ - ${mouza}`);
      setPhase("editor");
      setFitSignal((s) => s + 1);
    } catch (e) {
      setError("شروع کرنے میں مسئلہ: " + (e?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  // Attach a moga so its matching mustateel lands exactly on the clicked dummy
  const handleDummyAttach = (match, dummyCell) => {
    const bObjs = resolvedObjs[match.id];
    if (!bObjs || !bObjs.length) return;
    const must = match.must; // { label, x, y, w, h }
    const dx = dummyCell.x - must.x;
    const dy = dummyCell.y - must.y;
    const added = bObjs.map((o) => cloneWithTag(o, dx, dy, match.id, match.mogaNumber || ""));
    setObjects((prev) => [...prev, ...added]);
    setPlacedMapIds((prev) => new Set(prev).add(match.id));
  };

  const handleDummyRemove = (mapId) => {
    setObjects((prev) => prev.filter((o) => o.mogaGroup !== mapId));
    setPlacedMapIds((prev) => {
      const n = new Set(prev);
      n.delete(mapId);
      return n;
    });
  };

  // Manual commit of a whole-moga drag (canvas → state)
  const handleCommitMove = useCallback((groupId, dx, dy) => {
    setObjects((prev) => prev.map((o) => (o.mogaGroup === groupId ? offsetObj(o, dx, dy) : o)));
  }, []);

  // Save the merged map as a normal LandMap → appears in Geo Map list
  const handleSave = async (extra) => {
    if (extra && extra.title !== undefined && Object.keys(extra).length === 1) {
      setTitle(extra.title);
      return;
    }
    if (!objects.length) { setError("پہلے موگے جوڑیں۔"); return; }
    setBusy(true); setError(null);
    try {
      const parcels = objects.filter((o) => ["mustateel", "muraba"].includes(o.type)).length;
      const placedSource = villageMogas.find(
        (m) => placedMapIds.has(m.id) && m.geo_placement_lat != null && m.geo_placement_lng != null
      );
      const saved = await base44.entities.LandMap.create({
        title: titleRef.current || `موضع نقشہ - ${mouza}`,
        village: mouza,
        section,
        tehsil: subdivision,
        district: division,
        status,
        drawing_data: await storeDrawingData(objects),
        total_parcels: parcels,
        geo_placement_lat: placedSource?.geo_placement_lat ?? null,
        geo_placement_lng: placedSource?.geo_placement_lng ?? null,
        geo_rotation: placedSource?.geo_rotation || 0,
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
        anchorMapId={anchorMapId}
        onPickAnchor={setAnchorMapId}
        section={section}
        subdivision={subdivision}
        division={division}
        onFieldChange={handleFieldChange}
        onStart={handleStart}
        busy={busy}
        error={error}
        isLoading={isLoading}
        onBack={() => navigate("/")}
      />
    );
  }

  // Dialog search source: village mogas not yet placed, with inline drawing_data
  const unplacedMaps = villageMogas
    .filter((m) => !placedMapIds.has(m.id))
    .map((m) => ({ ...m, drawing_data: JSON.stringify(resolvedObjs[m.id] || []) }));

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
              dummies={dummies}
              onDummyClick={setDialogDummy}
              selectedGroup={selectedGroup}
              onSelectGroup={setSelectedGroup}
              onCommitMove={handleCommitMove}
              fitSignal={fitSignal}
              activeTool={activeTool}
              onZoomChange={setZoom}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <p className="text-sm text-slate-400">کوئی ڈیٹا نہیں — واپس جا کر شروع کریں</p>
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

      {dialogDummy && (
        <DummyMustateelDialog
          open={!!dialogDummy}
          dummyGeo={dialogDummy}
          maps={unplacedMaps}
          village={mouza}
          placedMapIds={[...placedMapIds]}
          skipGeoCheck
          onConfirm={handleDummyAttach}
          onRemove={handleDummyRemove}
          onClose={() => setDialogDummy(null)}
        />
      )}
    </div>
  );
}