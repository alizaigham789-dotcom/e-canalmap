import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import MapHeaderLine from "@/components/editor/MapHeaderLine";
import ExportDialog from "@/components/editor/ExportDialog";
import UnifiedLayersPanel from "@/components/editor/UnifiedLayersPanel";
import MapScanDialog from "@/components/editor/MapScanDialog";
import MustateelGridDialog from "@/components/editor/MustateelGridDialog";
import BackupRecoveryDialog from "@/components/editor/BackupRecoveryDialog";

import ColorSettingsPanel from "@/components/editor/ColorSettingsPanel";
import PrintPreview from "@/components/editor/PrintPreview";
import { collectLandUses } from "@/lib/landUsePalette";
import { storeDrawingData, loadDrawingData, isDrawingDataUrl } from "@/lib/drawingDataStorage";
import {
  DrawingStateManager,
  createAcre, createMustateel, createMuraba, createCanal, createKhal, createRoad, createRailway, createBridge, createOutlet, createChakbandi, createMouza,
  createDamageMarker, createDamageMarkerLine, findNonOverlappingPosition, snapToNearestBoundary, autoAssignLabel, rectsOverlap, duplicateObjects,
  saveToClipboard, loadFromClipboard, hasClipboard, worldToScreen,
} from "@/lib/gisEngine";
import { Layers, BookOpen, Palette, Printer, Magnet, Pen, Grid3x3, Group, Save, Camera, Download, Loader2, X, Eye, EyeOff, Copy, Clipboard, SquareStack, BoxSelect, Upload, FileDown, Frame, LayoutGrid, Type, Trash2 } from "lucide-react";
import { saveBackup, getBackup, getBestBackup, setLastMapId } from "@/lib/mapBackup";
import { saveMaxSnapshot, getMaxSnapshot } from "@/lib/serverSnapshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SnapSettingsPanel from "@/components/editor/SnapSettingsPanel";
import MapDetailsDialog from "@/components/editor/MapDetailsDialog";
import MapMinimap from "@/components/editor/MapMinimap";
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
  canalStroke: "#2B7AB8",
  canalFill: "rgba(163,218,244,0.70)",
  khalStroke: "#2563eb",
  roadStroke: "#b45309",
  chakbandiStroke: "#22c55e",
  mouzaStroke: "#000000",
  labelColor: "#000000",
  outletStroke: "#06b6d4",
};

export default function Editor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const mapId = urlParams.get("id");

  // Auto-sync: invalidate every cache that depends on this map's data so
  // GeoMap, Warabandi Parat, Form 1, Fard Masrooba and Naqsha 27B all refresh
  // instantly whenever a moga is saved in the editor.
  const syncLinkedCaches = () => {
    queryClient.removeQueries({ queryKey: ["geomap-map", mapId] });
    queryClient.invalidateQueries({ queryKey: ["geomap-maps"] });
    queryClient.invalidateQueries({ queryKey: ["parat-records"] });
    queryClient.invalidateQueries({ queryKey: ["warabandi-moga-maps"] });
    queryClient.invalidateQueries({ queryKey: ["form1-registers-all"] });
    queryClient.invalidateQueries({ queryKey: ["form1-register"] });
    queryClient.invalidateQueries({ queryKey: ["fard-masrooba-records"] });
    queryClient.invalidateQueries({ queryKey: ["naqsha27b"] });
  };

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
  const [showAcreUseLabels, setShowAcreUseLabels] = useState(true);
  const [mustateelStartNum, setMustateelStartNum] = useState("");
  const [murabaStartNum, setMurabaStartNum] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [showGridBuilder, setShowGridBuilder] = useState(false);
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
  const [showRecovery, setShowRecovery] = useState(false);
  // damage marker is now a simple line — no dialog state needed
  const [canalDraft, setCanalDraft] = useState(null);
  const [chakbandiDraft, setChakbandiDraft] = useState(null);
  const [outletDraft, setOutletDraft] = useState(null);
  const [khalDraft, setKhalDraft] = useState(null);
  const [roadDraft, setRoadDraft] = useState(null);
  const [railwayDraft, setRailwayDraft] = useState(null);
  const [bridgeDraft, setBridgeDraft] = useState(null);
  const [mouzaDraft, setMouzaDraft] = useState(null);
  const [objects, setObjects] = useState([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [colorSettings, setColorSettings] = useState(DEFAULT_COLORS);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [pageBorderStyle, setPageBorderStyle] = useState("none");
  const [deleteVertexMode, setDeleteVertexMode] = useState(false);
  const [legendPos, setLegendPos] = useState(null); // null = default position; {x, y} when dragged
  const legendDragRef = useRef(null); // { offsetX, offsetY }

  const dsmRef = useRef(new DrawingStateManager([]));
  const autoSaveTimer = useRef(null);
  const canvasRef = useRef(null);
  // Track non-parcel object count from initial load — used to detect and block
  // accidental data loss (e.g. canals/chakbandis disappearing from DSM during HMR)
  const loadedNonParcelCountRef = useRef(0);
  const forceSaveRef = useRef(false); // when true, skip the data-loss safeguard
  const explicitDeleteRef = useRef(false); // set true on user-initiated delete — lowers the safeguard baseline
  const serverMaxNonParcelRef = useRef(0); // all-time peak non-parcel count — gates server snapshot upserts (only ever rises)
  const dirtyRef = useRef(false); // true when there are unsaved edits — gates the periodic 10s idle save
  const clipboardRef = useRef([]);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const mustateelStartNumRef = useRef(mustateelStartNum);
  const murabaStartNumRef = useRef(murabaStartNum);
  // Draft refs — allow finish handlers to read current draft without side-effects in state updaters
  const canalDraftRef = useRef(null);
  const chakbandiDraftRef = useRef(null);
  const khalDraftRef = useRef(null);
  const roadDraftRef = useRef(null);
  const railwayDraftRef = useRef(null);
  const bridgeDraftRef = useRef(null);
  const mouzaDraftRef = useRef(null);
  const outletDraftRef = useRef(null);
  canalDraftRef.current = canalDraft;
  chakbandiDraftRef.current = chakbandiDraft;
  khalDraftRef.current = khalDraft;
  roadDraftRef.current = roadDraft;
  railwayDraftRef.current = railwayDraft;
  bridgeDraftRef.current = bridgeDraft;
  mouzaDraftRef.current = mouzaDraft;
  outletDraftRef.current = outletDraft;
  zoomRef.current = zoom;
  panRef.current = pan;
  mustateelStartNumRef.current = mustateelStartNum;
  murabaStartNumRef.current = murabaStartNum;

  // Build a JSON string of all editor settings to persist across sessions
  const settingsRef = useRef(null);
  const buildEditorSettings = () => JSON.stringify({
    layers, colorSettings, bgColor, pageBorderStyle,
    snapSettings, killaVisibility, killaNumbersGlobal, showAcreUseLabels, visibleMogas, gridFlags,
  });
  settingsRef.current = buildEditorSettings;

  // Always-current save function — avoids stale closures in debounced autosave & unmount
  const saveRef = useRef(() => {});
  const NON_PARCEL_TYPES = ["canal", "chakbandi", "khal", "road", "railway", "mouza", "outlet", "damageMarker"];
  const countNonParcels = (objs) => objs.filter(o => NON_PARCEL_TYPES.includes(o.type)).length;

  saveRef.current = async () => {
    if (!mapId) return;
    // Commit any active line drafts (canal/chakbandi/khal/road/mouza drawn but
    // not yet finished) BEFORE saving — otherwise an auto-save that fires while
    // a line is mid-draw persists the map WITHOUT that visible line.
    commitActiveDrafts();
    // DATA-LOSS SAFEGUARD: If non-parcel objects (canals, chakbandis, khals, mouzas, etc.)
    // suddenly dropped to 0 while the server had some, block auto-save to prevent
    // overwriting good server data with partial state. User can use "Permanent Save"
    // to force-save if the deletion was intentional.
    const currentNonParcel = countNonParcels(dsmRef.current.objects);
    // DATA-LOSS SAFEGUARD: only block on a catastrophic wipe (ALL non-parcel objects
    // vanished at once — e.g. an HMR/serialization glitch). Partial decreases are
    // allowed through; the server peak snapshot + auto-heal on next load recover
    // any lost lines/features. This prevents a single small decrease from
    // permanently blocking ALL future saves (which was causing edits not to persist).
    if (!forceSaveRef.current && loadedNonParcelCountRef.current > 0 && currentNonParcel === 0) {
      console.warn(`[SAVE BLOCKED] Non-parcel objects wiped from ${loadedNonParcelCountRef.current} to 0 — use Permanent Save to override`);
      toast.error("Save blocked — all canals/features vanished. Use Permanent Save if intentional.", { duration: 4000 });
      return;
    }
    forceSaveRef.current = false; // reset force flag after one save
    dirtyRef.current = false; // edits flushed — clear the dirty flag so the idle save skips until the next edit
    const parcels = dsmRef.current.getByType("mustateel").length +
      dsmRef.current.getByType("muraba").length;
    const payload = {
      drawing_data: await storeDrawingData(dsmRef.current.objects),
      total_parcels: parcels,
      viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      editor_settings: settingsRef.current(),
    };
    // SYNCHRONOUS cache update — ensures remount sees latest data even before API resolves
    queryClient.setQueryData(["map", mapId], (old) => old ? { ...old, ...payload } : old);
    // SYNCHRONOUS sessionStorage backup — survives HMR remount & tab crash
    try {
      sessionStorage.setItem(`chakbandi_backup_${mapId}`, JSON.stringify({
        objects: dsmRef.current.objects,
        viewport: payload.viewport,
        editorSettings: payload.editor_settings,
        timestamp: Date.now(),
      }));
    } catch {}
    // Async server save via mutation
    saveMutation.mutate(payload);
    // IndexedDB crash-recovery backup — survives app kill / phone reboot
    saveBackup(mapId, {
      objects: dsmRef.current.objects,
      viewport: payload.viewport,
      editorSettings: payload.editor_settings,
    });
  };

  const { data: mapData, isLoading: isLoadingMap } = useQuery({
    queryKey: ["map", mapId],
    queryFn: () => base44.entities.LandMap.filter({ id: mapId }).then(r => r[0]),
    enabled: !!mapId,
    staleTime: 0,
    gcTime: 300000, // keep cached data 5 min after unmount so remount uses latest saved state
  });

  const loadedMapIdRef = useRef(null);

  // Server-side peak snapshot — upsert MapSnapshot when the current non-parcel
  // count exceeds the all-time peak (serverMaxNonParcelRef). Low-write: only
  // fires on new peaks, so debounced saves mostly skip it. Never downgrades the
  // stored peak, making the recovery source immune to blank-save overwrites.
  const trySnapshot = () => {
    const cur = countNonParcels(dsmRef.current.objects);
    if (cur <= 0 || cur <= serverMaxNonParcelRef.current) return;
    const cached = queryClient.getQueryData(["map", mapId]);
    saveMaxSnapshot(mapId, {
      title: cached?.title,
      moga_number: cached?.moga_number,
      objects: dsmRef.current.objects,
      drawingData: dsmRef.current.serialize(),
      viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      editorSettings: settingsRef.current(),
    }).then(result => { if (result != null) serverMaxNonParcelRef.current = result; }).catch(() => {});
  };

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.LandMap.update(mapId, data),
    onSuccess: () => {
      // Show how many canals/chakbandis/khals/mouzas were saved so the user can
      // confirm ALL layers (not just mustateels) persisted to the server.
      const _parcels = dsmRef.current.getByType("mustateel").length + dsmRef.current.getByType("muraba").length;
      const _nonParcels = countNonParcels(dsmRef.current.objects);
      toast.success(`محفوظ ہو گیا — ${_parcels} parcels, ${_nonParcels} lines/features`, { duration: 1500 });
      // Update cache silently — DO NOT invalidate/refetch the map query
      // (causes load effect to overwrite local edits)
      queryClient.setQueryData(["map", mapId], (old) => old ? { ...old, ...{
        drawing_data: dsmRef.current.serialize(),
        total_parcels: dsmRef.current.getByType("mustateel").length + dsmRef.current.getByType("muraba").length,
        viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
        editor_settings: settingsRef.current(),
      } } : old);
      // Refresh the maps list so MapList shows updated parcel count / status
      queryClient.invalidateQueries({ queryKey: ["maps"] });
      // Auto-sync: GeoMap, Warabandi Parat, Form 1, Fard, Naqsha 27B all refresh
      syncLinkedCaches();
      // Server-side peak snapshot — upsert when non-parcel count hits a new high
      trySnapshot();
    },
    onError: () => toast.error("Save failed"),
  });

  // Load map data ONLY on first load for a given map ID.
  // Guard prevents refetches from overwriting unsaved local edits.
  // Also checks sessionStorage for a backup saved during HMR/unmount race conditions.
  useEffect(() => {
    if (!mapData || mapData.id === loadedMapIdRef.current) return;
    loadedMapIdRef.current = mapData.id;
    setLastMapId(mapData.id);

    const applySettings = (settingsJson) => {
      if (!settingsJson) return;
      try {
        const s = JSON.parse(settingsJson);
        if (s.layers) setLayers(s.layers);
        if (s.colorSettings) setColorSettings(s.colorSettings);
        if (s.bgColor) setBgColor(s.bgColor);
        if (s.pageBorderStyle) setPageBorderStyle(s.pageBorderStyle);
        if (s.snapSettings) setSnapSettings(s.snapSettings);
        if (s.killaVisibility) setKillaVisibility(s.killaVisibility);
        if (typeof s.killaNumbersGlobal === "boolean") setKillaNumbersGlobal(s.killaNumbersGlobal);
        if (typeof s.showAcreUseLabels === "boolean") setShowAcreUseLabels(s.showAcreUseLabels);
        if (s.visibleMogas) setVisibleMogas(s.visibleMogas);
        if (s.gridFlags) setGridFlags(s.gridFlags);
      } catch {}
    };

    (async () => {
      // ── PARALLEL HYDRATION ──────────────────────────────────────────────
      // Server source may be an inline JSON string OR an uploaded file URL
      // (large merged maps store drawing_data as a URL to respect field limits).
      let serverObjs = [];
      if (mapData.drawing_data) {
        serverObjs = isDrawingDataUrl(mapData.drawing_data)
          ? await loadDrawingData(mapData.drawing_data)
          : DrawingStateManager.deserialize(mapData.drawing_data);
      }
      const serverNonParcelCount = countNonParcels(serverObjs);
      // Gather Server + sessionStorage + IndexedDB + Server Peak Snapshot,
      // then pick the version with the MAXIMUM non-parcel object count. This
      // guarantees the map loads with the most complete user data — recovering
      // lost canals/chakbandis/khals/mouzas/outlets from any source, including
      // the cross-device server snapshot.
      const backupKey = `chakbandi_backup_${mapData.id}`;

      // Source A: sessionStorage (synchronous)
      let sessionObjs = null, sessionViewport = null, sessionSettings = null;
      try {
        const raw = sessionStorage.getItem(backupKey);
        if (raw) {
          const b = JSON.parse(raw);
          if (b.objects) { sessionObjs = b.objects; sessionViewport = b.viewport; sessionSettings = b.editorSettings; }
        }
      } catch {}

      // Source B: IndexedDB (async — crash / phone reboot recovery)
      // Use getBestBackup so a transient glitch that wrote an empty latest version
      // doesn't poison recovery — the most complete historical version is used.
      const idbBackup = await getBestBackup(mapData.id);
      const idbObjs = idbBackup?.objects || null;
      const idbViewport = idbBackup?.viewport || null;
      const idbSettings = idbBackup?.editorSettings || null;

      // Source C: Server peak snapshot (cross-device recovery — survives even
      // if the editing device's browser storage is cleared)
      const maxSnap = await getMaxSnapshot(mapData.id);
      let snapObjs = null;
      if (maxSnap?.drawing_data) {
        snapObjs = isDrawingDataUrl(maxSnap.drawing_data)
          ? await loadDrawingData(maxSnap.drawing_data)
          : DrawingStateManager.deserialize(maxSnap.drawing_data);
      }
      const snapViewport = maxSnap?.viewport || null;
      const snapSettings = maxSnap?.editor_settings || null;

      // ── SERVER IS THE SOURCE OF TRUTH ──────────────────────────────────
      // The server holds the latest saved state (including intentional
      // deletions/edits). Backups/snapshots are ONLY used to recover when the
      // server is catastrophically empty (all objects lost). This ensures user
      // edits always persist — old snapshots with more non-parcels no longer
      // revert the user's latest deletions/changes.
      let chosen = serverObjs;
      let chosenViewport = mapData.viewport;
      let chosenSettings = mapData.editor_settings;
      let recoveredFrom = null;

      if (serverObjs.length === 0) {
        // Server is empty — recover the most complete version from
        // sessionStorage → IndexedDB → server snapshot (catastrophic data loss).
        const candidates = [];
        if (sessionObjs) candidates.push({ src: "session", objects: sessionObjs, viewport: sessionViewport, settings: sessionSettings, total: sessionObjs.length, clearSession: true });
        if (idbObjs) candidates.push({ src: "indexeddb", objects: idbObjs, viewport: idbViewport, settings: idbSettings, total: idbObjs.length });
        if (snapObjs) candidates.push({ src: "server_snapshot", objects: snapObjs, viewport: snapViewport, settings: snapSettings, total: snapObjs.length });
        let best = null;
        for (const c of candidates) { if (!best || c.total > best.total) best = c; }
        if (best && best.objects.length > 0) {
          chosen = best.objects;
          chosenViewport = best.viewport;
          chosenSettings = best.settings;
          recoveredFrom = best.src;
          if (best.clearSession) { try { sessionStorage.removeItem(backupKey); } catch {} }
        }
      }

      // Hydrate from the chosen source
      dsmRef.current = new DrawingStateManager(chosen);
      loadedNonParcelCountRef.current = countNonParcels(chosen);
      serverMaxNonParcelRef.current = Math.max(maxSnap?.non_parcel_count || 0, countNonParcels(chosen));
      setObjects([...dsmRef.current.objects]);
      syncUndoRedo();
      if (chosenViewport) {
        try { const vp = JSON.parse(chosenViewport); if (vp.zoom) setZoom(vp.zoom); if (vp.pan) setPan(vp.pan); } catch {}
      }
      applySettings(chosenSettings);

      // Auto-heal: only when we recovered from a backup (server was empty),
      // push the recovered state back to the server so it's protected cross-device.
      if (recoveredFrom) {
        const recoveredPayload = {
          drawing_data: await storeDrawingData(dsmRef.current.objects),
          total_parcels: dsmRef.current.getByType("mustateel").length + dsmRef.current.getByType("muraba").length,
          viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
          editor_settings: settingsRef.current(),
        };
        queryClient.setQueryData(["map", mapData.id], (old) => old ? { ...old, ...recoveredPayload } : old);
        base44.entities.LandMap.update(mapData.id, recoveredPayload).then(() => {
          queryClient.invalidateQueries({ queryKey: ["maps"] });
          toast.success(`Recovered ${dsmRef.current.objects.length} objects from ${recoveredFrom}`, { duration: 4000 });
        }).catch(() => {});
        saveBackup(mapData.id, { objects: chosen, viewport: chosenViewport, editorSettings: chosenSettings });
        saveMaxSnapshot(mapData.id, {
          title: mapData.title, moga_number: mapData.moga_number,
          objects: chosen, drawingData: dsmRef.current.serialize(),
          viewport: recoveredPayload.viewport, editorSettings: recoveredPayload.editor_settings,
        }).then(result => { if (result != null) serverMaxNonParcelRef.current = result; }).catch(() => {});
      }
    })();
  }, [mapData]);

  const syncUndoRedo = () => {
    setCanUndo(dsmRef.current.historyIdx > 0);
    setCanRedo(dsmRef.current.historyIdx < dsmRef.current.history.length - 1);
  };

  const syncObjects = () => {
    setObjects([...dsmRef.current.objects]);
    syncUndoRedo();
    const currentNonParcel = countNonParcels(dsmRef.current.objects);
    // If the user explicitly deleted an object, lower the safeguard baseline to the
    // new count so the decrease is treated as intentional (not data loss).
    if (explicitDeleteRef.current) {
      loadedNonParcelCountRef.current = currentNonParcel;
      explicitDeleteRef.current = false;
    } else if (currentNonParcel > loadedNonParcelCountRef.current) {
      // Otherwise track the max — the safeguard uses this baseline to prevent accidental wipe.
      loadedNonParcelCountRef.current = currentNonParcel;
    }
    // Debounced backup — serializing thousands of objects (JSON.stringify +
    // sessionStorage + IndexedDB) on every mouse-move during a drag was the main
    // cause of the editor freezing on large merged maps. Now it runs once, a short
    // delay after the user stops actively editing. The unmount + beforeunload
    // handlers still write synchronously when leaving, so no data is lost.
    dirtyRef.current = true; // mark unsaved edits so the periodic idle save can flush them
    scheduleSyncBackup();
    scheduleAutoSave();
  };

  // Synchronous backup — writes current state to all three local stores immediately.
  // Called from syncObjects on every add/modify/delete so nothing is lost between saves.
  const syncBackup = () => {
    const currentMapId = mapIdRef.current;
    if (!currentMapId || !loadedMapIdRef.current) return;
    // DATA-LOSS SAFEGUARD: never overwrite the persistent backups (sessionStorage +
    // IndexedDB) with a catastrophically-wiped state (all non-parcel objects gone
    // without an explicit delete). The React Query cache is still updated (it's
    // in-memory only and rebuilt on reload), but the durable backups that recovery
    // depends on are preserved. This stops a transient glitch from destroying the
    // good backup that the next load needs to restore from.
    const currentNonParcel = countNonParcels(dsmRef.current.objects);
    if (!explicitDeleteRef.current && loadedNonParcelCountRef.current > 0 && currentNonParcel === 0) {
      return;
    }
    const drawingData = dsmRef.current.serialize();
    const vp = JSON.stringify({ zoom: zoomRef.current, pan: panRef.current });
    const settings = settingsRef.current();
    const parcels = dsmRef.current.getByType("mustateel").length +
      dsmRef.current.getByType("muraba").length;
    // React Query cache — synchronous, survives remount
    queryClient.setQueryData(["map", currentMapId], (old) => old ? {
      ...old, drawing_data: drawingData, total_parcels: parcels, viewport: vp, editor_settings: settings,
    } : old);
    // sessionStorage — synchronous, survives HMR remount & tab crash
    try {
      sessionStorage.setItem(`chakbandi_backup_${currentMapId}`, JSON.stringify({
        objects: dsmRef.current.objects, viewport: vp, editorSettings: settings, timestamp: Date.now(),
      }));
    } catch {}
    // IndexedDB — crash recovery (app kill / phone reboot)
    saveBackup(currentMapId, {
      objects: dsmRef.current.objects, viewport: vp, editorSettings: settings,
    });
  };

  // Debounced local backup — writes React Query cache + sessionStorage + IndexedDB.
  // Debounced (not per-change) so dragging/moving objects on a large merged map
  // doesn't JSON.stringify + write thousands of objects on every single mouse-move.
  const syncBackupTimer = useRef(null);
  const scheduleSyncBackup = () => {
    if (syncBackupTimer.current) clearTimeout(syncBackupTimer.current);
    // Also refresh undo/redo state — history snapshots are now debounced (400ms),
    // so the button states only update after the burst settles.
    syncBackupTimer.current = setTimeout(() => { syncBackup(); syncUndoRedo(); }, 500);
  };

  const scheduleAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { saveRef.current(); trySnapshot(); }, 1500);
  };

  // Track current mapId for unmount save (cleanup has [] deps, can't read fresh mapId)
  const mapIdRef = useRef(mapId);
  mapIdRef.current = mapId;

  // Periodic safety save — every 10s, ensures nothing is lost even if
  // auto-save timer was cleared or a save silently failed
  useEffect(() => {
    const interval = setInterval(() => {
      if (loadedMapIdRef.current && mapIdRef.current && dsmRef.current.objects.length > 0 && dirtyRef.current) {
        saveRef.current();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // beforeunload — fire-and-forget IndexedDB backup when user closes tab / refreshes.
  // The server save is async and may not complete before the browser kills the page,
  // but IndexedDB writes complete synchronously enough to survive.
  useEffect(() => {
    const handler = () => {
      const currentMapId = mapIdRef.current;
      if (!currentMapId || !loadedMapIdRef.current) return;
      // Commit any in-progress line drafts so a half-drawn chakbandi/canal/khal
      // is not lost when the tab closes / refreshes.
      commitActiveDrafts();
      try {
        sessionStorage.setItem(`chakbandi_backup_${currentMapId}`, JSON.stringify({
          objects: dsmRef.current.objects,
          viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
          editorSettings: settingsRef.current(),
          timestamp: Date.now(),
        }));
      } catch {}
      saveBackup(currentMapId, {
        objects: dsmRef.current.objects,
        viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
        editorSettings: settingsRef.current(),
      });
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Save on unmount / navigate away — direct API call so it survives unmount.
  // CRITICAL: Only save if data was actually loaded (loadedMapIdRef is set).
  // Without this guard, navigating away before data loads overwrites server data with [].
  // Also saves to sessionStorage as a backup for HMR race conditions (hot-reload unmount/remount).
  // Also refreshes the maps list so MapList shows current data on return.
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (syncBackupTimer.current) clearTimeout(syncBackupTimer.current);
      const currentMapId = mapIdRef.current;
      if (!currentMapId) return;
      // Don't save if map data was never loaded — would overwrite server data with empty
      if (!loadedMapIdRef.current) {
        queryClient.removeQueries({ queryKey: ["map", currentMapId] });
        queryClient.invalidateQueries({ queryKey: ["maps"] });
        return;
      }
      // Commit any in-progress line drafts (chakbandi/canal/khal/mouza drawn but not
      // yet finished with double-tap) BEFORE saving — otherwise navigating away /
      // closing loses the visible line (it lived only in draft state, not in dsmRef).
      commitActiveDrafts();
      const objs = dsmRef.current.objects;
      if (objs.length === 0) {
        queryClient.removeQueries({ queryKey: ["map", currentMapId] });
        queryClient.invalidateQueries({ queryKey: ["maps"] });
        return;
      }
      // DATA-LOSS SAFEGUARD: If non-parcel objects (canals, chakbandis, etc.) decreased
      // below the loaded baseline without an explicit delete, skip the server save to
      // avoid destroying good data. Local backups are still written below so the
      // highest-count version is always recoverable on next load.
      const currentNonParcelUnmount = countNonParcels(objs);
      const saveBlocked = loadedNonParcelCountRef.current > 0 &&
        currentNonParcelUnmount === 0;
      if (saveBlocked) {
        console.warn(`[UNMOUNT SAVE BLOCKED] Non-parcel objects dropped from ${loadedNonParcelCountRef.current} to ${currentNonParcelUnmount} — server data preserved, local backups written`);
        // Still write synchronous local backups so data is recoverable from the
        // highest-count version on next load (sessionStorage + IndexedDB + cache).
        const blockedDrawingData = dsmRef.current.serialize();
        const blockedViewport = JSON.stringify({ zoom: zoomRef.current, pan: panRef.current });
        const blockedSettings = settingsRef.current();
        try {
          sessionStorage.setItem(`chakbandi_backup_${currentMapId}`, JSON.stringify({
            objects: dsmRef.current.objects, viewport: blockedViewport, editorSettings: blockedSettings, timestamp: Date.now(),
          }));
        } catch {}
        saveBackup(currentMapId, {
          objects: dsmRef.current.objects, viewport: blockedViewport, editorSettings: blockedSettings,
        });
        queryClient.setQueryData(["map", currentMapId], (old) => old ? {
          ...old, drawing_data: blockedDrawingData, viewport: blockedViewport, editor_settings: blockedSettings,
        } : old);
        queryClient.invalidateQueries({ queryKey: ["maps"] });
        return;
      }
      const parcels = dsmRef.current.getByType("mustateel").length +
        dsmRef.current.getByType("muraba").length;
      // SYNCHRONOUS backup to sessionStorage — survives HMR remount race condition
      const savedDrawingData = dsmRef.current.serialize();
      const savedViewport = JSON.stringify({ zoom: zoomRef.current, pan: panRef.current });
      const savedSettings = settingsRef.current();
      try {
        sessionStorage.setItem(`chakbandi_backup_${currentMapId}`, JSON.stringify({
          objects: dsmRef.current.objects,
          viewport: savedViewport,
          editorSettings: savedSettings,
          timestamp: Date.now(),
        }));
      } catch {}
      // SYNCHRONOUS cache update — ensures remount sees latest data immediately
      queryClient.setQueryData(["map", currentMapId], (old) => old ? {
        ...old,
        drawing_data: savedDrawingData,
        total_parcels: parcels,
        viewport: savedViewport,
        editor_settings: savedSettings,
      } : old);
      // IndexedDB crash-recovery backup — survives app kill / phone reboot
      saveBackup(currentMapId, {
        objects: dsmRef.current.objects,
        viewport: savedViewport,
        editorSettings: savedSettings,
      });
      // Async save to server — upload large drawing_data as a file if needed
      (async () => {
        const drawing_data = await storeDrawingData(dsmRef.current.objects);
        base44.entities.LandMap.update(currentMapId, {
        drawing_data,
        total_parcels: parcels,
        viewport: savedViewport,
        editor_settings: savedSettings,
      }).then(() => {
        // Update cache with saved data instead of destroying it — so remount
        // immediately sees the latest state without waiting for a refetch.
        queryClient.setQueryData(["map", currentMapId], (old) => old ? {
          ...old,
          drawing_data: savedDrawingData,
          total_parcels: parcels,
          viewport: savedViewport,
          editor_settings: savedSettings,
        } : old);
        queryClient.invalidateQueries({ queryKey: ["maps"] });
        trySnapshot(); // protect peak state in the server snapshot
        // Clear backup after successful server save (give 5s grace for remount to pick it up)
        setTimeout(() => {
          try { sessionStorage.removeItem(`chakbandi_backup_${currentMapId}`); } catch {}
        }, 5000);
      }).catch(() => {
        queryClient.invalidateQueries({ queryKey: ["maps"] });
        // Surface silent exit-save failures so the user knows the map didn't sync
        // to the server (cross-device) and can re-open + Save to push their edits.
        toast.error("محفوظ ناکام — نقشہ دوبارہ کھولیں اور Save دبائیں تاکہ دوسری ڈیوائسز پر ڈیٹا مل جائے", { duration: 5000 });
      });
      })();
    };
  }, []);

  // Auto-save when editor settings change (layers, colors, snap, killa, grid, etc.)
  // Only fires after the map has loaded — avoids overwriting restored settings.
  const settingsAppliedRef = useRef(false);
  useEffect(() => {
    if (!loadedMapIdRef.current) return;
    if (!settingsAppliedRef.current) { settingsAppliedRef.current = true; return; }
    scheduleAutoSave();
  }, [layers, colorSettings, bgColor, pageBorderStyle, snapSettings, killaVisibility, killaNumbersGlobal, showAcreUseLabels, visibleMogas, gridFlags]);

  const handleAddObject = useCallback((type, data) => {
    if (type === "__delete__") {
      const delObj = dsmRef.current.objects.find(o => o.id === data.id);
      explicitDeleteRef.current = true;
      dsmRef.current.remove(data.id);
      if (delObj?.type === "mustateel") setMustateelStartNum("");
      if (delObj?.type === "muraba") setMurabaStartNum("");
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
      // Gap-fill numbering: do NOT auto-advance startNum — deleted numbers are reused
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
      const startN = murabaStartNumRef.current !== "" ? parseInt(murabaStartNumRef.current, 10) : null;
      obj.label = autoAssignLabel("muraba", dsmRef.current.objects, startN);
      // Gap-fill numbering: do NOT auto-advance startNum — deleted numbers are reused
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

  const handleCanalFinish = useCallback((skipSave = false) => {
    const draft = canalDraftRef.current;
    canalDraftRef.current = null; // prevent duplicate commits before the state re-render
    setCanalDraft(null);
    if (draft && draft.length >= 2) {
      const canal = createCanal(draft);
      // Canal merge: if this canal starts from the END of an existing canal,
      // inherit the existing canal's name so the flow reads as one continuous canal.
      const startPt = draft[0];
      const THRESH = 15;
      for (const o of dsmRef.current.objects) {
        if (o.type === "canal" && o.points && o.points.length >= 2 && o.id !== canal.id) {
          const endPt = o.points[o.points.length - 1];
          if (Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y) < THRESH) {
            if (o.name) canal.name = o.name;
          }
        }
      }
      // Auto-fill the canal name from the map header's Rajbah (canal minor) when no
      // name was inherited from a connected canal — so new canals are named automatically.
      if (!canal.name) canal.name = mapData?.rajbah || "";
      dsmRef.current.add(canal);
      setSelectedId(canal.id);
      syncObjects();
      if (!skipSave) saveRef.current();
    }
  }, [mapData]);

  const handleChakbandiPointAdd = useCallback((pt) => {
    setChakbandiDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleChakbandiFinish = useCallback((skipSave = false) => {
    const draft = chakbandiDraftRef.current;
    chakbandiDraftRef.current = null; // prevent duplicate commits before the state re-render
    setChakbandiDraft(null);
    if (draft && draft.length >= 2) {
      const cb = createChakbandi(draft);
      dsmRef.current.add(cb);
      setSelectedId(cb.id);
      syncObjects();
      if (!skipSave) saveRef.current();
    }
  }, []);

  const handleKhalPointAdd = useCallback((pt) => {
    setKhalDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleKhalFinish = useCallback((skipSave = false) => {
    const draft = khalDraftRef.current;
    khalDraftRef.current = null; // prevent duplicate commits before the state re-render
    setKhalDraft(null);
    if (draft && draft.length >= 2) {
      const khal = createKhal(draft);
      // Arrow-merge: if this khal starts from the END (arrow tip) of an existing
      // khal, hide that khal's arrow — the flow continues into this new khal.
      // Only the arrow-end triggers this; starting from the back (start point) does NOT.
      const startPt = draft[0];
      const THRESH = 15;
      for (const o of dsmRef.current.objects) {
        if (o.type === "khal" && o.points && o.points.length >= 2 && o.id !== khal.id) {
          const endPt = o.points[o.points.length - 1];
          if (Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y) < THRESH) {
            dsmRef.current.update(o.id, { noArrow: true });
          }
        }
      }
      dsmRef.current.add(khal);
      setSelectedId(khal.id);
      syncObjects();
      if (!skipSave) saveRef.current();
    }
  }, []);

  const handleRoadPointAdd = useCallback((pt) => {
    setRoadDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleRoadFinish = useCallback((skipSave = false) => {
    const draft = roadDraftRef.current;
    roadDraftRef.current = null; // prevent duplicate commits before the state re-render
    setRoadDraft(null);
    if (draft && draft.length >= 2) {
      const road = createRoad(draft);
      dsmRef.current.add(road);
      setSelectedId(road.id);
      syncObjects();
      if (!skipSave) saveRef.current();
    }
  }, []);

  const handleRailwayPointAdd = useCallback((pt) => {
    setRailwayDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleRailwayFinish = useCallback((skipSave = false) => {
    const draft = railwayDraftRef.current;
    railwayDraftRef.current = null; // prevent duplicate commits before the state re-render
    setRailwayDraft(null);
    if (draft && draft.length >= 2) {
      const railway = createRailway(draft);
      dsmRef.current.add(railway);
      setSelectedId(railway.id);
      syncObjects();
      if (!skipSave) saveRef.current();
    }
  }, []);

  const handleBridgePointAdd = useCallback((pt) => {
    setBridgeDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleBridgeFinish = useCallback((skipSave = false) => {
    const draft = bridgeDraftRef.current;
    bridgeDraftRef.current = null; // prevent duplicate commits before the state re-render
    setBridgeDraft(null);
    if (draft && draft.length >= 2) {
      const bridge = createBridge(draft);
      dsmRef.current.add(bridge);
      setSelectedId(bridge.id);
      syncObjects();
      if (!skipSave) saveRef.current();
    }
  }, []);

  const handleMouzaPointAdd = useCallback((pt) => {
    setMouzaDraft(prev => prev ? [...prev, pt] : [pt]);
  }, []);

  const handleMouzaFinish = useCallback((skipSave = false) => {
    const draft = mouzaDraftRef.current;
    mouzaDraftRef.current = null; // prevent duplicate commits before the state re-render
    setMouzaDraft(null);
    if (draft && draft.length >= 2) {
      const mouza = createMouza(draft);
      dsmRef.current.add(mouza);
      setSelectedId(mouza.id);
      syncObjects();
      if (!skipSave) saveRef.current();
    }
  }, []);

  // COMMIT ACTIVE DRAFTS — a line drawn on the canvas but not yet finished
  // (double-tap / Stop) still lives in draft state only. Saving used to persist
  // the map WITHOUT that visible line — the "chakbandi draws but never saves"
  // bug. Every explicit save first commits any in-progress line drafts.
  const commitActiveDrafts = () => {
    handleChakbandiFinish(true);
    handleCanalFinish(true);
    handleKhalFinish(true);
    handleRoadFinish(true);
    handleRailwayFinish(true);
    handleBridgeFinish(true);
    handleMouzaFinish(true);
  };

  const handleOutletStart = useCallback((pt, canalId) => {
    // Find the canal width to size the moga arrow proportionally
    const canal = canalId ? dsmRef.current.objects.find(o => o.id === canalId) : null;
    const cw = canal?.width || 100;
    setOutletDraft({ x: pt.x, y: pt.y, canalId, canalWidth: cw });
  }, []);

  const handleOutletFinish = useCallback((endPt) => {
    const draft = outletDraftRef.current;
    setOutletDraft(null);
    if (draft) {
      const start = { x: draft.x, y: draft.y };
      // Default outlet length = 240 ft, in the drawn direction. If the user clicked
      // the same spot (no direction), fall back to perpendicular from the canal.
      const OUTLET_LEN = 240;
      const dx = endPt.x - start.x, dy = endPt.y - start.y;
      const drawn = Math.hypot(dx, dy);
      let finalEnd;
      if (drawn > 1) {
        finalEnd = { x: start.x + (dx / drawn) * OUTLET_LEN, y: start.y + (dy / drawn) * OUTLET_LEN };
      } else {
        const canal = draft.canalId ? dsmRef.current.objects.find(o => o.id === draft.canalId) : null;
        if (canal?.points?.length >= 2) {
          const cp0 = canal.points[0], cp1 = canal.points[canal.points.length - 1];
          const cdx = cp1.x - cp0.x, cdy = cp1.y - cp0.y;
          const clen = Math.hypot(cdx, cdy) || 1;
          let px = -cdy / clen, py = cdx / clen;
          if ((endPt.x - start.x) * px + (endPt.y - start.y) * py < 0) { px = -px; py = -py; }
          finalEnd = { x: start.x + px * OUTLET_LEN, y: start.y + py * OUTLET_LEN };
        } else {
          finalEnd = { x: start.x, y: start.y + OUTLET_LEN };
        }
      }
      // Auto-pick moga number + side from the map header (mapData.moga_number / mogha_side)
      const outlet = createOutlet(
        draft.canalId, start, finalEnd, "", draft.canalWidth || 100,
        mapData?.moga_number || "", mapData?.mogha_side || ""
      );
      dsmRef.current.add(outlet);
      setSelectedId(outlet.id);
      syncObjects();
      saveRef.current();
    }
  }, [mapData]);

  const handleSnapChange = (key, val) => setSnapSettings(prev => ({ ...prev, [key]: val }));

  const handleDamageMarkerClick = () => {}; // no-op: line-based, no dialog

  const handleAddMustateels = (objs) => {
    if (!objs || objs.length === 0) return;
    objs.forEach(o => dsmRef.current.add(o));
    syncObjects();
    // Fit view to ALL mustateels so the whole grid stays visible as lines accumulate.
    // The dialog is NOT closed — incremental drawing keeps it open (Close button exits).
    const allMust = dsmRef.current.getByType("mustateel");
    if (allMust.length > 0) {
      const pts = allMust.flatMap(o => [{ x: o.x, y: o.y }, { x: o.x + o.w, y: o.y + o.h }]);
      const minX = Math.min(...pts.map(p => p.x));
      const minY = Math.min(...pts.map(p => p.y));
      const maxX = Math.max(...pts.map(p => p.x));
      const maxY = Math.max(...pts.map(p => p.y));
      const canvas = canvasRef.current?.getCanvas?.();
      const cw = canvas?.clientWidth || (typeof window !== "undefined" ? window.innerWidth - 160 : 1000);
      const ch = canvas?.clientHeight || (typeof window !== "undefined" ? window.innerHeight - 200 : 700);
      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);
      const pad = 120;
      const fitZoom = Math.min(20, Math.max(0.05, Math.min((cw - pad * 2) / w, (ch - pad * 2) / h)));
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      setZoom(fitZoom);
      setPan({ x: cw / 2 - cx * fitZoom, y: ch / 2 - cy * fitZoom });
    }
    toast.success(`${objs.length} mustateels drawn`);
  };

  const handleToolChange = (tool) => {
    if (tool !== "mustateel") setMustateelStartNum("");
    if (tool !== "muraba") setMurabaStartNum("");
    if (activeTool === "canal" && canalDraft && canalDraft.length >= 2) handleCanalFinish();
    else if (activeTool === "canal") setCanalDraft(null);
    if (activeTool === "chakbandi" && chakbandiDraft && chakbandiDraft.length >= 2) handleChakbandiFinish();
    else if (activeTool === "chakbandi") setChakbandiDraft(null);
    if (activeTool === "outlet") setOutletDraft(null);
    if (activeTool === "khal" && khalDraft && khalDraft.length >= 2) handleKhalFinish();
    else if (activeTool === "khal") setKhalDraft(null);
    if (activeTool === "road" && roadDraft && roadDraft.length >= 2) handleRoadFinish();
    else if (activeTool === "road") setRoadDraft(null);
    if (activeTool === "railway" && railwayDraft && railwayDraft.length >= 2) handleRailwayFinish();
    else if (activeTool === "railway") setRailwayDraft(null);
    if (activeTool === "bridge" && bridgeDraft && bridgeDraft.length >= 2) handleBridgeFinish();
    else if (activeTool === "bridge") setBridgeDraft(null);
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
    if (activeTool === "railway" && railwayDraft && railwayDraft.length >= 2) handleRailwayFinish();
    else setRailwayDraft(null);
    if (activeTool === "bridge" && bridgeDraft && bridgeDraft.length >= 2) handleBridgeFinish();
    else setBridgeDraft(null);
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
    // Same for muraba — continue numbering from the manually entered number
    if (obj && obj.type === "muraba" && changes.label !== undefined) {
      const m = String(changes.label).match(/(\d+)/);
      if (m) setMurabaStartNum(String(parseInt(m[1], 10) + 1));
    }
  };

  // Bulk update multiple objects in ONE history snapshot — used for whole-moga group moves
  const handleBulkUpdate = (updates) => {
    dsmRef.current.bulkUpdate(updates);
    syncObjects();
  };

  // Apply a style change to ALL mustateels at once (combined mustateel option)
  const handleUpdateAllMustateels = (changes) => {
    const updates = dsmRef.current.objects
      .filter(o => o.type === "mustateel")
      .map(o => ({ id: o.id, changes }));
    if (updates.length === 0) return;
    dsmRef.current.bulkUpdate(updates);
    syncObjects();
  };

  // Reset ALL mustateels to default styling
  const handleResetAllMustateels = () => {
    const defaults = { boundaryThickness: 5, fillColor: "", fillOpacity: 0.10, fillStyle: "solid" };
    const updates = dsmRef.current.objects
      .filter(o => o.type === "mustateel")
      .map(o => ({ id: o.id, changes: defaults }));
    if (updates.length === 0) return;
    dsmRef.current.bulkUpdate(updates);
    syncObjects();
    toast.success("All mustateels reset to default");
  };

  // Apply a style change to ALL murabas at once (combined muraba option)
  const handleUpdateAllMurabas = (changes) => {
    const updates = dsmRef.current.objects
      .filter(o => o.type === "muraba")
      .map(o => ({ id: o.id, changes }));
    if (updates.length === 0) return;
    dsmRef.current.bulkUpdate(updates);
    syncObjects();
  };

  // Reset ALL murabas to default styling
  const handleResetAllMurabas = () => {
    const defaults = { boundaryThickness: 5, fillColor: "", fillOpacity: 0.08, fillStyle: "solid" };
    const updates = dsmRef.current.objects
      .filter(o => o.type === "muraba")
      .map(o => ({ id: o.id, changes: defaults }));
    if (updates.length === 0) return;
    dsmRef.current.bulkUpdate(updates);
    syncObjects();
    toast.success("All murabas reset to default");
  };

  const handleDeleteObject = (id) => {
    const obj = dsmRef.current.objects.find(o => o.id === id);
    const wasMustateel = obj?.type === "mustateel";
    const wasMuraba = obj?.type === "muraba";
    const idx = dsmRef.current.objects.findIndex(o => o.id === id);
    explicitDeleteRef.current = true;
    dsmRef.current.remove(id);
    if (wasMustateel) setMustateelStartNum("");
    if (wasMuraba) setMurabaStartNum("");
    if (wasMustateel) {
      // Auto-select the previous mustateel so the user can keep deleting / editing
      // without re-selecting each time. Falls back to the next mustateel, then null.
      const remaining = dsmRef.current.objects;
      let prev = null;
      for (let i = idx - 1; i >= 0; i--) {
        if (remaining[i]?.type === "mustateel") { prev = remaining[i]; break; }
      }
      if (!prev) {
        for (let i = idx; i < remaining.length; i++) {
          if (remaining[i]?.type === "mustateel") { prev = remaining[i]; break; }
        }
      }
      setSelectedId(prev ? prev.id : null);
    } else if (selectedId === id) {
      setSelectedId(null);
    }
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

  const handleSave = async (extra = {}) => {
    if (!mapId) return;
    commitActiveDrafts();
    const parcels = dsmRef.current.getByType("mustateel").length +
      dsmRef.current.getByType("muraba").length;
    const drawing_data = await storeDrawingData(dsmRef.current.objects);
    saveMutation.mutate({
      drawing_data,
      total_parcels: parcels,
      viewport: JSON.stringify({ zoom, pan }),
      editor_settings: settingsRef.current(),
      ...extra,
    });
  };

  // PERMANENT SAVE — force-saves ALL layers (parcels + canals + chakbandis + khals +
  // mouzas + outlets + damage markers) to the server, bypassing the data-loss safeguard.
  // Updates the loaded non-parcel count so future auto-saves use the new baseline.
  const [permSaving, setPermSaving] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closingWithSave, setClosingWithSave] = useState(false);

  // Close the map — if there are objects, ask the user to save first.
  // On "Save & Close", force-save to the server then navigate away.
  // On "Close without saving", navigate immediately (local backups still exist).
  const handleCloseRequest = () => {
    // Only ask to save when there are actually unsaved edits (dirty). If nothing
    // changed (or the last edit was already auto-saved), close immediately.
    if (!loadedMapIdRef.current || !dirtyRef.current) {
      navigate("/");
      return;
    }
    setShowCloseDialog(true);
  };

  const handleCloseWithSave = async () => {
    if (closingWithSave) return; // guard against double-clicks
    setClosingWithSave(true);
    // Commit any in-progress line drafts so they are included in the save.
    commitActiveDrafts();
    forceSaveRef.current = true;
    const allObjs = dsmRef.current.objects;
    const parcels = dsmRef.current.getByType("mustateel").length + dsmRef.current.getByType("muraba").length;
    const vp = JSON.stringify({ zoom: zoomRef.current, pan: panRef.current });
    const settings = settingsRef.current();
    // Synchronous local backups — written instantly so the data survives even
    // if the background server save is interrupted by the navigation.
    try {
      sessionStorage.setItem(`chakbandi_backup_${mapId}`, JSON.stringify({
        objects: allObjs, viewport: vp, editorSettings: settings, timestamp: Date.now(),
      }));
    } catch {}
    saveBackup(mapId, { objects: allObjs, viewport: vp, editorSettings: settings });
    queryClient.setQueryData(["map", mapId], (old) => old ? {
      ...old, drawing_data: dsmRef.current.serialize(), total_parcels: parcels, viewport: vp, editor_settings: settings,
    } : old);
    loadedNonParcelCountRef.current = countNonParcels(allObjs);
    // Fire the cloud save in the BACKGROUND — do NOT await it. In a single-page
    // app, client-side navigation does NOT cancel in-flight fetches, so the
    // LandMap update + snapshot still complete on the server after we leave.
    // This keeps "Save & Close" instant instead of waiting on a large upload.
    (async () => {
      try {
        const drawing_data = await storeDrawingData(allObjs);
        await base44.entities.LandMap.update(mapId, {
          drawing_data, total_parcels: parcels, viewport: vp, editor_settings: settings,
        });
        saveMaxSnapshot(mapId, {
          title: mapData?.title, moga_number: mapData?.moga_number,
          objects: allObjs, drawingData: dsmRef.current.serialize(),
          viewport: vp, editorSettings: settings, force: true,
        }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["maps"] });
        syncLinkedCaches();
      } catch (err) {
        // Local backups already written above; the unmount cleanup + auto-heal
        // on next open will recover. Surface nothing — the user has already left.
        console.warn("[Save & Close] background save failed:", err?.message);
      }
    })();
    // Close the popup and navigate back IMMEDIATELY.
    setShowCloseDialog(false);
    setClosingWithSave(false);
    navigate("/");
  };

  const handleCloseWithoutSave = () => {
    setShowCloseDialog(false);
    navigate("/");
  };

  const handlePermanentSave = async () => {
    if (!mapId) return;
    commitActiveDrafts();
    const allObjs = dsmRef.current.objects;
    const parcels = dsmRef.current.getByType("mustateel").length +
      dsmRef.current.getByType("muraba").length;
    const nonParcels = countNonParcels(allObjs);
    setPermSaving(true);
    forceSaveRef.current = true;
    // Synchronous backups
    try {
      sessionStorage.setItem(`chakbandi_backup_${mapId}`, JSON.stringify({
        objects: allObjs,
        viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
        editorSettings: settingsRef.current(),
        timestamp: Date.now(),
      }));
    } catch {}
    saveBackup(mapId, {
      objects: allObjs,
      viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      editorSettings: settingsRef.current(),
    });
    queryClient.setQueryData(["map", mapId], (old) => old ? {
      ...old,
      drawing_data: dsmRef.current.serialize(),
      total_parcels: parcels,
      viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      editor_settings: settingsRef.current(),
    } : old);
    const drawing_data = await storeDrawingData(allObjs);
    base44.entities.LandMap.update(mapId, {
      drawing_data,
      total_parcels: parcels,
      viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      editor_settings: settingsRef.current(),
    }).then(() => {
      // After explicit Permanent Save, reset the safeguard baseline to the current count —
      // the user confirmed this state is intentional (including any deletions).
      // Auto-heal on next load will restore from the server snapshot if a higher peak exists.
      loadedNonParcelCountRef.current = nonParcels;
      queryClient.invalidateQueries({ queryKey: ["maps"] });
      syncLinkedCaches();
      // Force-sync the server snapshot so it reflects the current state (including
      // parcel deletions). Without this, the snapshot keeps stale deleted mustateels
      // and the recovery logic could restore them on next load.
      saveMaxSnapshot(mapId, {
        title: mapData?.title, moga_number: mapData?.moga_number,
        objects: allObjs, drawingData: dsmRef.current.serialize(),
        viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
        editorSettings: settingsRef.current(),
        force: true,
      }).then(result => { if (result != null) serverMaxNonParcelRef.current = result; }).catch(() => {});
      toast.success(`Permanent Save complete — ${allObjs.length} objects (${parcels} parcels, ${nonParcels} lines/features)`, { duration: 3000 });
      setPermSaving(false);
    }).catch(() => {
      toast.error("Permanent Save failed — please try again");
      setPermSaving(false);
    });
  };

  // CLEAR ALL — remove every object from the canvas so a fresh map can be drawn.
  // Single click (with one confirm safety net). Undo restores everything.
  const handleClearAll = () => {
    if (dsmRef.current.objects.length === 0) { toast.info("Map is already empty"); return; }
    if (!window.confirm("Clear ALL objects from this map? Use Undo to restore them.")) return;
    explicitDeleteRef.current = true;
    dsmRef.current.clearAll();
    setSelectedId(null);
    setMustateelStartNum("");
    setMurabaStartNum("");
    syncObjects();
    saveRef.current();
    toast.success("All objects cleared — map is now empty");
  };

  const handleStatusChange = async (status) => {
    // Commit active drafts so a status change never discards an unfinished line.
    commitActiveDrafts();
    // Always include drawing_data + editor_settings — prevents objects/settings from being wiped on server
    const drawing_data = await storeDrawingData(dsmRef.current.objects);
    saveMutation.mutate({
      status,
      drawing_data,
      total_parcels: dsmRef.current.getByType("mustateel").length + dsmRef.current.getByType("muraba").length,
      viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      editor_settings: settingsRef.current(),
    });
    queryClient.setQueryData(["map", mapId], (old) => old ? {
      ...old,
      status,
      drawing_data: dsmRef.current.serialize(),
      total_parcels: dsmRef.current.getByType("mustateel").length + dsmRef.current.getByType("muraba").length,
      viewport: JSON.stringify({ zoom: zoomRef.current, pan: panRef.current }),
      editor_settings: settingsRef.current(),
    } : old);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); saveRef.current(); setShowPrint(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") { e.preventDefault(); handleSelectAll(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); handlePaste(); }
      if (e.key === "Escape") handleStopDrawing();
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) { e.preventDefault(); handleDeleteObject(selectedId); }
      }
      const shortcuts = { v: "select", h: "pan", d: "select", a: "acre", m: "mustateel", b: "muraba", c: "canal", k: "chakbandi", o: "outlet", w: "khal", r: "road", t: "railway", u: "mouza", g: "damageMarker", x: "measure", e: "eraser", f: "fitView", q: "boxSelect" };
      if (!e.ctrlKey && !e.metaKey && shortcuts[e.key]) {
        if (e.key === "f") handleFitView();
        else handleToolChange(shortcuts[e.key]);
      }
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, activeTool, canalDraft, chakbandiDraft, khalDraft, roadDraft, railwayDraft, mouzaDraft, zoom, pan]);

  // Undo last point of the active line draft (canal/chakbandi/khal/road/mouza)
  const handleUndoPoint = useCallback(() => {
    if (canalDraft) setCanalDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (chakbandiDraft) setChakbandiDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (khalDraft) setKhalDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (roadDraft) setRoadDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (railwayDraft) setRailwayDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (bridgeDraft) setBridgeDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
    if (mouzaDraft) setMouzaDraft(prev => prev && prev.length > 0 ? prev.slice(0, -1) : null);
  }, [canalDraft, chakbandiDraft, khalDraft, roadDraft, railwayDraft, bridgeDraft, mouzaDraft]);

  if (!mapId) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <p className="text-slate-500">No map ID provided.</p>
      </div>
    );
  }

  // Loading gate — wait for map data to load before allowing interaction.
  // This prevents race conditions where imported/drawn objects get overwritten
  // by a late-arriving query response.
  if (isLoadingMap && !loadedMapIdRef.current) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-mono">Loading map data…</p>
        </div>
      </div>
    );
  }

  // Guard: if the query finished but returned no map (deleted / no permission),
  // show a fallback instead of crashing on undefined mapData (white screen).
  if (!mapData) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500">نقشہ نہیں ملا یا لوڈ نہیں ہوا۔</p>
          <Button size="sm" variant="outline" onClick={() => navigate("/")}>ڈیش بورڈ پر واپس</Button>
        </div>
      </div>
    );
  }

  const draftActive = !!(canalDraft || chakbandiDraft || khalDraft || roadDraft || railwayDraft || bridgeDraft || mouzaDraft);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: bgColor }}>
      <EditorHeader
        mapData={mapData}
        onSave={handleSave}
        onPermanentSave={handlePermanentSave}
        permSaving={permSaving}
        onStatusChange={handleStatusChange}
        isSaving={saveMutation.isPending}
        activeTool={activeTool}
        onStopDrawing={handleStopDrawing}
        canalDraftActive={draftActive}
        onUndoPoint={handleUndoPoint}
        onExport={() => { saveRef.current(); setShowExport(true); }}
        onEditDetails={() => setShowMapDetails(true)}
        onRecovery={() => setShowRecovery(true)}
        onClose={handleCloseRequest}
      />

      <MapHeaderLine mapData={mapData} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Tool Panel */}
        <div className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-20 max-h-[calc(100%-100px)]">
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
            railwayDraft={railwayDraft}
            onRailwayPointAdd={handleRailwayPointAdd}
            onRailwayFinish={handleRailwayFinish}
            bridgeDraft={bridgeDraft}
            onBridgePointAdd={handleBridgePointAdd}
            onBridgeFinish={handleBridgeFinish}
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
              acreUseLabels: showAcreUseLabels,
            }}
            onBoxSelect={handleBoxSelect}
            onBulkUpdate={handleBulkUpdate}
            pageBorderStyle={pageBorderStyle}
            deleteVertexMode={deleteVertexMode}
            onAutoSwitchToSelect={() => setActiveTool("select")}
          />

          {/* Map preview — bottom-right corner so a lost map can be located */}
          <MapMinimap
            objects={objects}
            zoom={zoom}
            pan={pan}
            mainCanvasRef={canvasRef}
            onNavigate={(newPan) => { setPan(newPan); }}
            colorSettings={colorSettings}
          />

          {/* Top-right toolbar buttons */}
          <div className="absolute top-3 right-1.5 sm:right-3 flex flex-col gap-1.5 z-20 max-h-[calc(100%-100px)] overflow-y-auto">
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${showLayers ? "bg-blue-600 border-blue-500 text-white" : "bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}
              onClick={() => { setShowLayers(v => !v); setShowSnap(false); }}
              title="Layers, Legend & Colours">
              <Layers className="w-4 h-4" />
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
              onClick={() => { saveRef.current(); setShowPrint(true); }}
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
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 shadow-md"
              onClick={() => handleSave()}
              title="Save Map (Ctrl+S)">
              <Save className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 shadow-md"
              onClick={handleClearAll}
              title="Clear All Objects (start fresh)">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon"
              className="w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 shadow-md"
              onClick={() => setShowGridBuilder(true)}
              title="Mustateel Grid Builder">
              <LayoutGrid className="w-4 h-4" />
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
            {/* Show / hide acre-use Urdu labels (آبادی/قبرستان/...) on the map */}
            <Button variant="ghost" size="icon"
              className={`w-9 h-9 border shadow-md transition-all ${showAcreUseLabels ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"}`}
              onClick={() => setShowAcreUseLabels(v => !v)}
              title={showAcreUseLabels ? "Hide Acre-Use Urdu Labels" : "Show Acre-Use Urdu Labels"}>
              <Type className="w-4 h-4" />
            </Button>
            {/* Mustateel / Muraba start number input */}
            {(activeTool === "mustateel" || activeTool === "muraba") && (
              <div className="flex flex-col items-center gap-0.5" title={`${activeTool === "mustateel" ? "Mustateel" : "Muraba"} numbering start`}>
                <span className="text-[8px] text-slate-400 font-mono leading-none">Start#</span>
                <input
                  type="number"
                  value={activeTool === "mustateel" ? mustateelStartNum : murabaStartNum}
                  onChange={e => activeTool === "mustateel" ? setMustateelStartNum(e.target.value) : setMurabaStartNum(e.target.value)}
                  placeholder="auto"
                  className="w-9 h-7 text-[10px] text-center border border-slate-300 rounded bg-white text-slate-700 font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
            )}
          </div>

          {/* Panels */}
          {showLayers && (
            <div
              className="absolute z-30 max-sm:left-1.5 max-sm:right-auto max-sm:max-w-[calc(100vw-70px)]"
              style={legendPos
                ? { left: legendPos.x, top: legendPos.y, right: "auto" }
                : { top: "120px", right: "12px" }}
            >
              <UnifiedLayersPanel
                colorSettings={colorSettings}
                onColorChange={handleColorChange}
                bgColor={bgColor}
                onBgColorChange={setBgColor}
                layers={layers}
                onLayerChange={handleLayerChange}
                killaVisibility={killaVisibility}
                onKillaVisibilityChange={(type, val) => setKillaVisibility(prev => ({ ...prev, [type]: val }))}
                objects={objects}
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
                landUses={collectLandUses(objects)}
                onDragStart={handleLegendDragStart}
                onResetPos={() => setLegendPos(null)}
                onClose={() => setShowLayers(false)}
              />
            </div>
          )}
          {showSnap && (
            <div className="absolute top-[260px] right-3 z-30 max-sm:left-1.5 max-sm:right-auto max-sm:max-w-[calc(100vw-70px)]">
              <SnapSettingsPanel snapSettings={snapSettings} onSnapChange={handleSnapChange} />
            </div>
          )}
        </div>

        {/* Properties Panel — anchored at the object's endpoint, clamped to stay on screen */}
        {selectedObj && (() => {
          const isParcel = ["mustateel", "muraba", "acre"].includes(selectedObj.type);
          const isLineAnchored = ["chakbandi", "canal", "khal", "road", "bridge", "mouza"].includes(selectedObj.type);
          const isOutlet = selectedObj.type === "outlet";
          if (isParcel || isLineAnchored || isOutlet) {
            // Anchor at the object's endpoint so the popup appears where drawing ended.
            let ax, ay;
            if (isOutlet) { ax = selectedObj.end?.x ?? 0; ay = selectedObj.end?.y ?? 0; }
            else if (isLineAnchored) {
              const pts = selectedObj.points || [];
              const anchor = pts.length > 0 ? pts[pts.length - 1] : { x: 0, y: 0 };
              ax = anchor.x; ay = anchor.y;
            } else { ax = selectedObj.x; ay = selectedObj.y; }
            const cs = worldToScreen(ax, ay, pan.x, pan.y, zoom);
            const canvasEl = canvasRef.current?.getCanvas?.();
            const containerW = canvasEl?.clientWidth || 800;
            const containerH = canvasEl?.clientHeight || 600;
            const POPUP_W = 224;
            const margin = 8;
            const maxBodyH = Math.max(160, Math.min(420, containerH - 120));
            const estH = maxBodyH + 44;
            // Prefer below the anchor (never off-top); flip above if no room below; else clamp.
            const belowTop = cs.y + 14;
            const aboveTop = cs.y - estH - 4;
            let top;
            if (belowTop + estH <= containerH - margin) top = belowTop;
            else if (aboveTop >= margin) top = aboveTop;
            else top = margin;
            top = Math.max(margin, Math.min(top, containerH - estH - margin));
            // For parcels (mustateel/muraba/acre) pin the panel to the SIDE of the
            // plot (right of its right edge, else left of its left edge) so the whole
            // plot stays visible while colour-filling. Other objects keep the old clamp.
            let left;
            if (isParcel) {
              const dim = selectedObj.type === "muraba" ? { w: 1100, h: 990 }
                : selectedObj.type === "mustateel" ? { w: 440, h: 990 }
                : { w: 220, h: 198 };
              const rightEdge = cs.x + dim.w * zoom;
              const leftEdge = cs.x;
              if (rightEdge + POPUP_W + margin <= containerW) left = rightEdge + margin;
              else left = Math.max(margin, leftEdge - POPUP_W - margin);
              left = Math.max(margin, Math.min(left, containerW - POPUP_W - margin));
            } else {
              left = Math.max(margin, Math.min(cs.x, containerW - POPUP_W - margin));
            }
            return (
              <div className="absolute z-30 max-sm:max-w-[calc(100vw-70px)]" style={{ left, top }}>
                <PropertiesPanel
                  selectedObj={selectedObj}
                  allObjects={objects}
                  onUpdate={handleUpdateObject}
                  onDelete={handleDeleteObject}
                  onClose={() => setSelectedId(null)}
                  deleteVertexMode={deleteVertexMode}
                  onToggleDeleteVertexMode={() => setDeleteVertexMode(v => !v)}
                  onUpdateAllMustateels={handleUpdateAllMustateels}
                  onResetAllMustateels={handleResetAllMustateels}
                  onUpdateAllMurabas={handleUpdateAllMurabas}
                  onResetAllMurabas={handleResetAllMurabas}
                  maxBodyHeight={maxBodyH}
                />
              </div>
            );
          }
          return (
            <div className="absolute z-30
              right-3 top-1/2 -translate-y-1/2
              sm:right-3 sm:top-1/2 sm:-translate-y-1/2
              max-sm:right-auto max-sm:left-1.5 max-sm:top-auto max-sm:bottom-2 max-sm:translate-y-0 max-sm:translate-x-0
              max-sm:max-w-[calc(100vw-70px)]">
              <PropertiesPanel
                selectedObj={selectedObj}
                allObjects={objects}
                onUpdate={handleUpdateObject}
                onDelete={handleDeleteObject}
                onClose={() => setSelectedId(null)}
                deleteVertexMode={deleteVertexMode}
                onToggleDeleteVertexMode={() => setDeleteVertexMode(v => !v)}
                onUpdateAllMustateels={handleUpdateAllMustateels}
                onResetAllMustateels={handleResetAllMustateels}
                onUpdateAllMurabas={handleUpdateAllMurabas}
                onResetAllMurabas={handleResetAllMurabas}
                />
            </div>
          );
        })()}
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
        killaVisibility={{ mustateel: killaVisibility.mustateel && killaNumbersGlobal, muraba: killaVisibility.muraba && killaNumbersGlobal, acreUseLabels: showAcreUseLabels }}
        colorSettings={colorSettings}
        pageBorderStyle={pageBorderStyle}
      />

      {showPrint && (
        <PrintPreview
          mapData={mapData}
          objects={objects}
          colorSettings={colorSettings}
          selectedMogaFilter={printMogaFilter}
          killaVisibility={{ mustateel: killaVisibility.mustateel && killaNumbersGlobal, muraba: killaVisibility.muraba && killaNumbersGlobal, acreUseLabels: showAcreUseLabels }}
          pageBorderStyle={pageBorderStyle}
          onClose={() => { setShowPrint(false); setPrintMogaFilter(""); }}
        />
      )}

      {/* Mustateel Grid Builder */}
      {showGridBuilder && (
        <MustateelGridDialog
          zoom={zoom}
          pan={pan}
          canvasRef={canvasRef}
          objects={objects}
          onAddObjects={handleAddMustateels}
          onClose={() => setShowGridBuilder(false)}
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

      {/* Backup Recovery Dialog */}
      {showRecovery && mapData && (
        <BackupRecoveryDialog
          mapIds={[{ id: mapData.id, title: mapData.title, moga_number: mapData.moga_number }]}
          onClose={() => setShowRecovery(false)}
        />
      )}

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

      {/* Close Map — save confirmation dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 space-y-4" dir="rtl">
            <h3 className="text-base font-bold text-slate-800 font-heading" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
              نقشہ بند کرنے سے پہلے محفوظ کریں؟
            </h3>
            <p className="text-sm text-slate-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
              آپ کی تبدیلیاں ابھی سرور پر محفوظ نہیں ہوئیں۔ "محفوظ کریں اور بند کریں" دبائیں تاکہ تبدیلیاں مستقل محفوظ ہو جائیں۔
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCloseWithoutSave} disabled={closingWithSave}>
                بند کریں (محفوظ نہ کریں)
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={handleCloseWithSave} disabled={closingWithSave}>
                {closingWithSave ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                محفوظ کریں اور بند کریں
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}