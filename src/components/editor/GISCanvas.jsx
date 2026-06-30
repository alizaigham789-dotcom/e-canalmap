import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  screenToWorld, worldToScreen, hitTest,
  snapToAcreGrid, snapToMustateeelGrid, snapToMurabaGrid,
  snapMovePosition, snapToParcelBoundaries, isInViewport,
  DIMENSIONS, distToLineSegment, computeSnapPosition,
  snapToNearestBoundary, rectsOverlap, createMustateel, createMuraba, createAcre,
} from "@/lib/gisEngine";
import {
  drawGrid, drawAcre, drawMustateel, drawMuraba,
  drawCanal, drawKhal, drawRoad, drawOutlet, drawChakbandi, drawMouza, drawDamageMarker,
  drawCanalDraft, drawKhalDraft, drawRoadDraft, drawChakbandiDraft, drawMouzaDraft, drawOutletDraft,
} from "@/components/editor/GISRenderer";

const GISCanvas = forwardRef(function GISCanvas(
  {
    objects, activeTool, zoom, pan, layers,
    selectedId, onSelect, onAddObject, onUpdateObject,
    canalDraft, onCanalPointAdd, onCanalFinish,
    chakbandiDraft, onChakbandiPointAdd, onChakbandiFinish,
    outletDraft, onOutletStart, onOutletFinish,
    khalDraft, onKhalPointAdd, onKhalFinish,
    roadDraft, onRoadPointAdd, onRoadFinish,
    mouzaDraft, onMouzaPointAdd, onMouzaFinish,
    snapPos, onSnapPosChange, onPanChange, onZoomChange,
    colorSettings, bgColor, snapSettings,
    onDamageMarkerClick,
    freehandMode, // if true: chakbandi/mouza follow mouse without click-per-point
    gridFlags, // { showMustateel, showMuraba }
    killaVisibility, // { mustateel: bool, muraba: bool }
  },
  ref
) {
  const canvasRef = useRef(null);
  const isPanning = useRef(false);
  const isMoving = useRef(false);
  const movingObjId = useRef(null);
  const moveOffset = useRef({ x: 0, y: 0 });
  const lastMouse = useRef({ x: 0, y: 0 });
  const animRef = useRef(null);
  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const [editingLabel, setEditingLabel] = useState(null);
  // Damage marker line drawing state
  const damageStartRef = useRef(null);
  const [damageDraft, setDamageDraft] = useState(null);
  // Mustateel/muraba ghost preview
  const [ghostPos, setGhostPos] = useState(null);
  // Measurement tool state
  const measureStartRef = useRef(null);
  const [measureDraft, setMeasureDraft] = useState(null); // { start, end }
  const [measureResult, setMeasureResult] = useState(null); // { ft, m, midScreen }
  // 1 world unit = 1 foot (DIMENSIONS.ACRE.width = 220ft, etc.)
  const FT_PER_UNIT = 1;

  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }));

  const C = colorSettings || {};

  // Z-Index render order: Layer 1(fills)+2(boundaries) → Layer 3(infra) → Layer 4(markers) → Layer 5(labels embedded in draw fns)
  const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bgColor || "#ffffff";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Layer 0: Grid (editor only)
    drawGrid(ctx, W, H, zoom, pan, gridFlags || {});

    // Frustum-culled sorted object draw
    const sorted = [...objects].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));
    for (const obj of sorted) {
      if (!isInViewport(obj, pan, zoom, W, H)) continue;
      const layerKey = obj.type === "chakbandi" ? "chakbandi" : obj.type === "damageMarker" ? "outlet" : obj.type;
      const layer = layers[layerKey] || { visible: true };
      if (!layer.visible) continue;
      const isSelected = obj.id === selectedId;

      const kv = killaVisibility || { mustateel: true, muraba: true };
      if (obj.type === "acre") drawAcre(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "mustateel") drawMustateel(ctx, obj, isSelected, zoom, C, obj.showKillaNumbers !== false && kv.mustateel !== false);
      else if (obj.type === "muraba") drawMuraba(ctx, obj, isSelected, zoom, C, obj.showKillaNumbers !== false && kv.muraba !== false);
      else if (obj.type === "canal") drawCanal(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "khal") drawKhal(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "road") drawRoad(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "outlet") drawOutlet(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "chakbandi") drawChakbandi(ctx, obj, isSelected, zoom, C, true);
      else if (obj.type === "mouza") drawMouza(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "damageMarker") drawDamageMarker(ctx, obj, isSelected, zoom);
    }

    // Draft previews
    drawCanalDraft(ctx, canalDraft, snapPos, zoom, C);
    drawKhalDraft(ctx, khalDraft, snapPos, zoom, C);
    drawRoadDraft(ctx, roadDraft, snapPos, zoom, C);
    drawChakbandiDraft(ctx, chakbandiDraft, snapPos, zoom, C);
    drawMouzaDraft(ctx, mouzaDraft, snapPos, zoom, C);
    drawOutletDraft(ctx, outletDraft, snapPos, zoom);
    // Damage marker line draft
    if (damageDraft && snapPos) {
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 4 / zoom;
      ctx.lineCap = "round"; ctx.setLineDash([6/zoom, 3/zoom]);
      ctx.beginPath();
      ctx.moveTo(damageDraft.x, damageDraft.y);
      ctx.lineTo(snapPos.x, snapPos.y);
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Measurement tool draft line
    if (measureDraft) {
      const end = measureDraft.end || snapPos || measureDraft.start;
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2 / zoom;
      ctx.lineCap = "round"; ctx.setLineDash([8/zoom, 4/zoom]);
      ctx.beginPath();
      ctx.moveTo(measureDraft.start.x, measureDraft.start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke(); ctx.setLineDash([]);
      // endpoint dots
      for (const pt of [measureDraft.start, end]) {
        ctx.fillStyle = "#a855f7";
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 5/zoom, 0, Math.PI*2); ctx.fill();
      }
    }

    ctx.restore();

    // Ghost preview for mustateel/muraba placement
    if (ghostPos) {
      const gx = ghostPos.x * zoom + pan.x;
      const gy = ghostPos.y * zoom + pan.y;
      const gw = ghostPos.w * zoom;
      const gh = ghostPos.h * zoom;
      ctx.save();
      if (ghostPos.blocked) {
        ctx.fillStyle = "rgba(239,68,68,0.18)";
        ctx.strokeStyle = "rgba(239,68,68,0.75)";
      } else {
        ctx.fillStyle = "rgba(59,130,246,0.12)";
        ctx.strokeStyle = "rgba(59,130,246,0.75)";
      }
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeRect(gx, gy, gw, gh);
      ctx.setLineDash([]);
      // Show blocked label
      if (ghostPos.blocked) {
        ctx.fillStyle = "rgba(239,68,68,0.9)";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⛔ Overlap", gx + gw / 2, gy + gh / 2);
      }
      ctx.restore();
    }

    // Snap indicator overlay
    if (snapPos) {
      const sx = snapPos.x * zoom + pan.x;
      const sy = snapPos.y * zoom + pan.y;
      ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy);
      ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10);
      ctx.stroke();
    }
  }, [objects, zoom, pan, layers, selectedId, canalDraft, chakbandiDraft, outletDraft, khalDraft, roadDraft, mouzaDraft, snapPos, C, bgColor, damageDraft, ghostPos, measureDraft]);

  useEffect(() => {
    const loop = () => { render(); animRef.current = requestAnimationFrame(loop); };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    ro.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return () => ro.disconnect();
  }, []);

  const getSnappedWorld = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
    const snap = snapSettings || { gridSnap: true, spineSnap: true, mogaSnap: true, zoom };
    return computeSnapPosition(world.x, world.y, activeTool, objectsRef.current, { ...snap, zoom });
  }, [pan, zoom, activeTool, snapSettings]);

  const handleMouseMove = useCallback((e) => {
    // Ghost preview for mustateel/muraba
    if (activeTool === "mustateel" || activeTool === "muraba") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      const dimW = activeTool === "muraba" ? DIMENSIONS.MURABA.width : DIMENSIONS.MUSTATEEL.width;
      const dimH = activeTool === "muraba" ? DIMENSIONS.MURABA.height : DIMENSIONS.MUSTATEEL.height;
      const snap = snapToNearestBoundary({ x: world.x, y: world.y, w: dimW, h: dimH }, objectsRef.current);
      const wouldOverlap = objectsRef.current
        .filter(o => ["mustateel","muraba","acre"].includes(o.type))
        .some(o => rectsOverlap({ x: snap.x, y: snap.y, w: dimW, h: dimH }, o));
      setGhostPos({ x: snap.x, y: snap.y, w: dimW, h: dimH, blocked: wouldOverlap });
    } else if (ghostPos) {
      setGhostPos(null);
    }
    // Live measurement preview — update end point while dragging first point
    if (activeTool === "measure" && measureStartRef.current && snapPos) {
      setMeasureDraft({ start: measureStartRef.current, end: snapPos });
    }
    if (isPanning.current || activeTool === "pan") {
      if (isPanning.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        onPanChange({ x: pan.x + dx, y: pan.y + dy });
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }
    // Freehand drawing — add points on mouse drag
    if (freehandMode && (activeTool === "chakbandi" || activeTool === "mouza")) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      if (e.buttons === 1) { // only while mouse button is held
        if (activeTool === "chakbandi") onChakbandiPointAdd(worldRaw);
        else if (activeTool === "mouza") onMouzaPointAdd(worldRaw);
      }
    }
    if (isMoving.current && movingObjId.current && activeTool === "move") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      let newX = worldRaw.x - moveOffset.current.x;
      let newY = worldRaw.y - moveOffset.current.y;
      const movingObj = objectsRef.current.find(o => o.id === movingObjId.current);
      if (movingObj && ["mustateel", "muraba", "acre"].includes(movingObj.type)) {
        const snapped = snapMovePosition({ ...movingObj, x: newX, y: newY }, objectsRef.current);
        newX = snapped.x; newY = snapped.y;
      }
      onUpdateObject(movingObjId.current, { x: newX, y: newY });
      return;
    }
    onSnapPosChange(getSnappedWorld(e));
  }, [activeTool, pan, zoom, getSnappedWorld, onPanChange, onSnapPosChange, onUpdateObject, ghostPos]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || activeTool === "pan") {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
    const snapped = getSnappedWorld(e);

    if (activeTool === "measure") {
      if (!measureStartRef.current) {
        // First click — set start
        measureStartRef.current = { x: worldRaw.x, y: worldRaw.y };
        setMeasureDraft({ start: { x: worldRaw.x, y: worldRaw.y }, end: null });
        setMeasureResult(null);
      } else {
        // Second click — finalise
        const start = measureStartRef.current;
        const distFt = Math.hypot(worldRaw.x - start.x, worldRaw.y - start.y) * FT_PER_UNIT;
        const distM = distFt * 0.3048;
        const midScreen = worldToScreen((start.x + worldRaw.x)/2, (start.y + worldRaw.y)/2, pan.x, pan.y, zoom);
        setMeasureDraft({ start, end: worldRaw });
        setMeasureResult({ ft: distFt, m: distM, midScreen });
        measureStartRef.current = null;
      }
      return;
    }
    if (activeTool === "move") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit && ["mustateel", "muraba"].includes(hit.type)) {
        isMoving.current = true; movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x - hit.x, y: worldRaw.y - hit.y };
        onSelect(hit.id);
      }
    } else if (activeTool === "acre") onAddObject("acre", snapped);
    else if (activeTool === "mustateel") onAddObject("mustateel", snapped);
    else if (activeTool === "muraba") onAddObject("muraba", snapped);
    else if (activeTool === "canal") onCanalPointAdd(snapped);
    else if (activeTool === "chakbandi") onChakbandiPointAdd(snapped);
    else if (activeTool === "damageMarker") {
      // First click: set start point
      damageStartRef.current = { x: worldRaw.x, y: worldRaw.y };
      setDamageDraft({ x: worldRaw.x, y: worldRaw.y });
    }
    else if (activeTool === "outlet") {
      if (!outletDraft) {
        const canals = objects.filter(o => o.type === "canal");
        let nearestCanal = null, minDist = 30;
        for (const canal of canals) {
          for (let i = 0; i < canal.points.length - 1; i++) {
            const d = distToLineSegment(worldRaw.x, worldRaw.y, canal.points[i].x, canal.points[i].y, canal.points[i+1].x, canal.points[i+1].y);
            if (d < minDist) { minDist = d; nearestCanal = canal; }
          }
        }
        onOutletStart(worldRaw, nearestCanal?.id || null);
      } else onOutletFinish(worldRaw);
    } else if (activeTool === "khal") onKhalPointAdd(snapped);
    else if (activeTool === "road") onRoadPointAdd(snapped);
    else if (activeTool === "mouza") onMouzaPointAdd(snapped);
    else if (activeTool === "select") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit?.type === "damageMarker" && onDamageMarkerClick) {
        onDamageMarkerClick(hit);
      }
      onSelect(hit ? hit.id : null);
    } else if (activeTool === "eraser") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects, true); // true = eraser mode (boundary-aware)
      if (hit) onAddObject("__delete__", { id: hit.id });
    }
  }, [activeTool, pan, zoom, objects, getSnappedWorld, onAddObject, onCanalPointAdd, onChakbandiPointAdd, onOutletStart, onOutletFinish, onSelect, outletDraft, onKhalPointAdd, onRoadPointAdd, onMouzaPointAdd, onDamageMarkerClick]);

  const handleMouseUp = useCallback((e) => {
    isPanning.current = false; isMoving.current = false; movingObjId.current = null;
    // Finish damage marker line on mouse up
    if (activeTool === "damageMarker" && damageStartRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      const dist = Math.hypot(worldRaw.x - damageStartRef.current.x, worldRaw.y - damageStartRef.current.y);
      if (dist > 3 / zoom) {
        onAddObject("damageMarkerLine", { start: damageStartRef.current, end: worldRaw });
      }
      damageStartRef.current = null;
      setDamageDraft(null);
    }
  }, [activeTool, pan, zoom, onAddObject]);

  const handleDblClick = useCallback((e) => {
    if (activeTool === "canal") onCanalFinish();
    if (activeTool === "chakbandi") onChakbandiFinish();
    if (activeTool === "khal") onKhalFinish();
    if (activeTool === "road") onRoadFinish();
    if (activeTool === "mouza") onMouzaFinish();
    if (activeTool === "select") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const worldRaw = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
      const hit = hitTest(worldRaw.x, worldRaw.y, objectsRef.current);
      if (hit?.type === "damageMarker" && onDamageMarkerClick) {
        onDamageMarkerClick(hit);
      } else if (hit && ["mustateel", "muraba", "acre"].includes(hit.type)) {
        onSelect(hit.id);
        setEditingLabel({ id: hit.id, value: hit.label || "" });
      }
    }
  }, [activeTool, pan, zoom, onSelect, onCanalFinish, onChakbandiFinish, onKhalFinish, onRoadFinish, onMouzaFinish, onDamageMarkerClick]);

  const commitLabelEdit = useCallback(() => {
    if (editingLabel) { onUpdateObject(editingLabel.id, { label: editingLabel.value }); setEditingLabel(null); }
  }, [editingLabel, onUpdateObject]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.05, Math.min(20, zoom * factor));
    const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
    const newPanY = my - (my - pan.y) * (newZoom / zoom);
    onZoomChange(newZoom, { x: newPanX, y: newPanY });
  }, [zoom, pan, onZoomChange]);

  // Reset measure state when tool changes away
  const prevToolRef = useRef(activeTool);
  if (prevToolRef.current !== activeTool) {
    prevToolRef.current = activeTool;
    if (activeTool !== "measure") {
      measureStartRef.current = null;
      // can't call setState here; use effect instead
    }
  }
  useEffect(() => {
    if (activeTool !== "measure") {
      measureStartRef.current = null;
      setMeasureDraft(null);
      setMeasureResult(null);
    }
  }, [activeTool]);

  const cursorClass = {
    select: "cursor-default", pan: "cursor-grab", eraser: "cursor-cell",
    canal: "cursor-crosshair", chakbandi: "cursor-crosshair", outlet: "cursor-crosshair",
    khal: "cursor-crosshair", road: "cursor-crosshair", mouza: "cursor-crosshair",
    acre: "cursor-crosshair", mustateel: "cursor-crosshair", muraba: "cursor-crosshair",
    move: "cursor-move", damageMarker: "cursor-crosshair", measure: "cursor-crosshair",
  }[activeTool] || "cursor-crosshair";

  const editingObj = editingLabel ? objects.find(o => o.id === editingLabel.id) : null;
  const labelPos = editingObj ? worldToScreen(editingObj.x + editingObj.w/2, editingObj.y + editingObj.h/2, pan.x, pan.y, zoom) : null;

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${cursorClass}`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDblClick}
        onWheel={handleWheel}
        style={{ display: "block" }}
      />
      {/* Measurement result bubble */}
      {measureResult && (
        <div
          className="absolute z-50 pointer-events-none select-none"
          style={{ left: measureResult.midScreen.x, top: measureResult.midScreen.y, transform: "translate(-50%, -120%)" }}
        >
          <div className="bg-purple-700 text-white rounded-xl shadow-2xl px-3 py-2 text-center border border-purple-400">
            <div className="text-xs font-bold font-mono">{measureResult.ft.toFixed(1)} ft</div>
            <div className="text-xs font-mono opacity-80">{measureResult.m.toFixed(1)} m</div>
            <div className="text-[9px] opacity-60 mt-0.5">{(measureResult.ft / 220).toFixed(2)} killas</div>
          </div>
          <div className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-700" />
        </div>
      )}
      {/* Measure in-progress hint */}
      {activeTool === "measure" && measureStartRef.current && !measureResult && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-purple-800/90 text-white text-xs rounded-lg px-3 py-1.5 shadow border border-purple-500">
            Click to set end point
          </div>
        </div>
      )}
      {activeTool === "measure" && !measureStartRef.current && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-purple-800/90 text-white text-xs rounded-lg px-3 py-1.5 shadow border border-purple-500">
            Click start point to measure
          </div>
        </div>
      )}
      {editingLabel && labelPos && (
        <input
          autoFocus
          value={editingLabel.value}
          onChange={e => setEditingLabel(prev => ({ ...prev, value: e.target.value }))}
          onBlur={commitLabelEdit}
          onKeyDown={e => { if (e.key === "Enter") commitLabelEdit(); if (e.key === "Escape") setEditingLabel(null); }}
          className="absolute z-50 px-2 py-1 text-xs font-bold font-heading text-center bg-white border-2 border-blue-500 rounded shadow-lg outline-none focus:ring-2 focus:ring-blue-300"
          style={{
            left: labelPos.x, top: labelPos.y, transform: "translate(-50%,-50%)", minWidth: 80,
            color: editingObj?.type === "mustateel" ? "#ef4444" : editingObj?.type === "muraba" ? "#dc2626" : "#b45309",
          }}
          placeholder="Label"
        />
      )}
    </div>
  );
});

export default GISCanvas;