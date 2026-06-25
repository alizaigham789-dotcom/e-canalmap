import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  ftToPx, screenToWorld, worldToScreen,
  snapToAcreGrid, snapToMustateeelGrid, snapToMurabaGrid,
  snapMovePosition, snapToParcelBoundaries,
  getParallelPolyline, getMustateeelKillaGrid, getMurabaKillaGrid,
  distToLineSegment, DIMENSIONS, BASE_SCALE
} from "@/lib/drawingEngine";

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
    colorSettings, bgColor,
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

  // Live ref to objects so mouse-move handler always sees the latest array
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  // Inline centroid-label editing state
  const [editingLabel, setEditingLabel] = useState(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  const C = colorSettings || {};
  const getColor = (key, fallback) => C[key] || fallback;

  // ---- Main Render Loop ----
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

    drawGrid(ctx, W, H, zoom, pan);
    drawObjects(ctx, objects, zoom, selectedId, layers, canalDraft, chakbandiDraft, outletDraft, khalDraft, roadDraft, mouzaDraft, snapPos, C);

    ctx.restore();

    // Snap indicator
    if (snapPos) {
      const sx = snapPos.x * zoom + pan.x;
      const sy = snapPos.y * zoom + pan.y;
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy);
      ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10);
      ctx.stroke();
    }
  }, [objects, activeTool, zoom, pan, layers, selectedId, canalDraft, chakbandiDraft, outletDraft, khalDraft, roadDraft, mouzaDraft, snapPos, C, bgColor]);

  useEffect(() => {
    const loop = () => {
      render();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  // ---- Canvas Resize ----
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

  // ---- Mouse Handlers ----
  const getSnappedWorld = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, pan.x, pan.y, zoom);
    if (activeTool === "acre") return snapToAcreGrid(world.x, world.y);
    if (activeTool === "mustateel") return snapToMustateeelGrid(world.x, world.y);
    if (activeTool === "muraba") return snapToMurabaGrid(world.x, world.y);
    if (activeTool === "chakbandi" || activeTool === "mouza") return snapToParcelBoundaries(world.x, world.y, objectsRef.current);
    return world;
  }, [pan, zoom, activeTool]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning.current || activeTool === "pan") {
      if (isPanning.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        onPanChange({ x: pan.x + dx, y: pan.y + dy });
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (isMoving.current && movingObjId.current && activeTool === "move") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const worldRaw = screenToWorld(sx, sy, pan.x, pan.y, zoom);
      let newX = worldRaw.x - moveOffset.current.x;
      let newY = worldRaw.y - moveOffset.current.y;
      // Snap to grid + adjacent plot edges — zero gaps / overlaps
      const movingObj = objectsRef.current.find(o => o.id === movingObjId.current);
      if (movingObj && ["mustateel", "muraba", "acre"].includes(movingObj.type)) {
        const snapped = snapMovePosition(
          { ...movingObj, x: newX, y: newY },
          objectsRef.current
        );
        newX = snapped.x;
        newY = snapped.y;
      }
      onUpdateObject(movingObjId.current, { x: newX, y: newY });
      return;
    }
    const snapped = getSnappedWorld(e);
    onSnapPosChange(snapped);
  }, [activeTool, pan, zoom, getSnappedWorld, onPanChange, onSnapPosChange, onUpdateObject]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || activeTool === "pan") {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldRaw = screenToWorld(sx, sy, pan.x, pan.y, zoom);
    const snapped = getSnappedWorld(e);

    if (activeTool === "move") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit && ["mustateel", "muraba"].includes(hit.type)) {
        isMoving.current = true;
        movingObjId.current = hit.id;
        moveOffset.current = { x: worldRaw.x - hit.x, y: worldRaw.y - hit.y };
        onSelect(hit.id);
      }
    } else if (activeTool === "acre") {
      onAddObject("acre", snapped);
    } else if (activeTool === "mustateel") {
      onAddObject("mustateel", snapped);
    } else if (activeTool === "muraba") {
      onAddObject("muraba", snapped);
    } else if (activeTool === "canal") {
      onCanalPointAdd(snapped);
    } else if (activeTool === "chakbandi") {
      onChakbandiPointAdd(snapped);
    } else if (activeTool === "outlet") {
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
      } else {
        onOutletFinish(worldRaw);
      }
    } else if (activeTool === "khal") {
      onKhalPointAdd(snapped);
    } else if (activeTool === "road") {
      onRoadPointAdd(snapped);
    } else if (activeTool === "mouza") {
      onMouzaPointAdd(snapped);
    } else if (activeTool === "select") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      onSelect(hit ? hit.id : null);
    } else if (activeTool === "eraser") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit) onAddObject("__delete__", { id: hit.id });
    }
  }, [activeTool, pan, zoom, objects, getSnappedWorld, onAddObject, onCanalPointAdd, onChakbandiPointAdd, onOutletStart, onOutletFinish, onSelect, outletDraft, onKhalPointAdd, onRoadPointAdd, onMouzaPointAdd]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    isMoving.current = false;
    movingObjId.current = null;
  }, []);

  const handleDblClick = useCallback((e) => {
    if (activeTool === "canal") onCanalFinish();
    if (activeTool === "chakbandi") onChakbandiFinish();
    if (activeTool === "khal") onKhalFinish();
    if (activeTool === "road") onRoadFinish();
    if (activeTool === "mouza") onMouzaFinish();
    // Inline centroid-label editing — double-click a parcel in Select mode
    if (activeTool === "select") {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const worldRaw = screenToWorld(sx, sy, pan.x, pan.y, zoom);
      const hit = hitTest(worldRaw.x, worldRaw.y, objectsRef.current);
      if (hit && ["mustateel", "muraba", "acre"].includes(hit.type)) {
        onSelect(hit.id);
        setEditingLabel({ id: hit.id, value: hit.label || "" });
      }
    }
  }, [activeTool, pan, zoom, objectsRef, onSelect, onCanalFinish, onChakbandiFinish, onKhalFinish, onRoadFinish, onMouzaFinish]);

  const commitLabelEdit = useCallback(() => {
    if (editingLabel) {
      onUpdateObject(editingLabel.id, { label: editingLabel.value });
      setEditingLabel(null);
    }
  }, [editingLabel, onUpdateObject]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.05, Math.min(20, zoom * factor));
    const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
    const newPanY = my - (my - pan.y) * (newZoom / zoom);
    onZoomChange(newZoom, { x: newPanX, y: newPanY });
  }, [zoom, pan, onZoomChange]);

  const cursorClass = {
    select: "cursor-default", pan: "cursor-grab", eraser: "cursor-cell",
    canal: "cursor-crosshair", chakbandi: "cursor-crosshair", outlet: "cursor-crosshair",
    khal: "cursor-crosshair", road: "cursor-crosshair", mouza: "cursor-crosshair",
    acre: "cursor-crosshair", mustateel: "cursor-crosshair", muraba: "cursor-crosshair",
    move: "cursor-move",
  }[activeTool] || "cursor-crosshair";

  // Compute screen position of the label being edited
  const editingObj = editingLabel ? objects.find(o => o.id === editingLabel.id) : null;
  const labelPos = editingObj
    ? worldToScreen(
        editingObj.x + editingObj.w / 2,
        editingObj.y + editingObj.h / 2,
        pan.x, pan.y, zoom
      )
    : null;

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
      {editingLabel && labelPos && (
        <input
          autoFocus
          value={editingLabel.value}
          onChange={e => setEditingLabel(prev => ({ ...prev, value: e.target.value }))}
          onBlur={commitLabelEdit}
          onKeyDown={e => {
            if (e.key === "Enter") commitLabelEdit();
            if (e.key === "Escape") setEditingLabel(null);
          }}
          className="absolute z-50 px-2 py-1 text-xs font-bold font-heading text-center bg-white border-2 border-blue-500 rounded shadow-lg outline-none focus:ring-2 focus:ring-blue-300"
          style={{
            left: labelPos.x,
            top: labelPos.y,
            transform: "translate(-50%, -50%)",
            minWidth: 80,
            color: editingObj?.type === "mustateel" ? "#ef4444" : editingObj?.type === "muraba" ? "#dc2626" : "#b45309",
          }}
          placeholder="1"
        />
      )}
    </div>
  );
});

export default GISCanvas;

// ---- Hit Test ----
function hitTest(wx, wy, objects) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return o;
    } else if (o.type === "canal" || o.type === "chakbandi" || o.type === "khal" || o.type === "road") {
      for (let j = 0; j < o.points.length - 1; j++) {
        if (distToLineSegment(wx, wy, o.points[j].x, o.points[j].y, o.points[j+1].x, o.points[j+1].y) < 15) return o;
      }
    } else if (o.type === "outlet") {
      if (distToLineSegment(wx, wy, o.start.x, o.start.y, o.end.x, o.end.y) < 15) return o;
    } else if (o.type === "mouza") {
      for (let j = 0; j < o.points.length - 1; j++) {
        if (distToLineSegment(wx, wy, o.points[j].x, o.points[j].y, o.points[j+1].x, o.points[j+1].y) < 12) return o;
      }
    }
  }
  return null;
}

// ---- Grid Drawing ----
// Uses raw DIMENSIONS (feet = world-units) so grid lines align perfectly with
// the parcel dimensions used in fillRect / strokeRect.
function drawGrid(ctx, W, H, zoom, pan) {
  const acreW = DIMENSIONS.ACRE.width;
  const acreH = DIMENSIONS.ACRE.height;
  const startX = Math.floor(-pan.x / zoom / acreW) * acreW - acreW;
  const startY = Math.floor(-pan.y / zoom / acreH) * acreH - acreH;
  const endX = startX + (W / zoom) + acreW * 2;
  const endY = startY + (H / zoom) + acreH * 2;

  ctx.lineWidth = 0.5 / zoom;

  if (zoom > 0.3) {
    ctx.strokeStyle = "rgba(59,130,246,0.10)";
    ctx.beginPath();
    for (let x = startX; x < endX; x += acreW) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = startY; y < endY; y += acreH) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();
  }

  const mustW = DIMENSIONS.MUSTATEEL.width;
  const mustH = DIMENSIONS.MUSTATEEL.height;
  ctx.strokeStyle = "rgba(59,130,246,0.22)";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (let x = Math.floor(startX / mustW) * mustW; x < endX; x += mustW) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
  for (let y = Math.floor(startY / mustH) * mustH; y < endY; y += mustH) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
  ctx.stroke();
}

// ---- Object Drawing ----
function drawObjects(ctx, objects, zoom, selectedId, layers, canalDraft, chakbandiDraft, outletDraft, khalDraft, roadDraft, mouzaDraft, snapPos, C) {
  const order = ["mouza", "muraba", "mustateel", "acre", "road", "canal", "khal", "chakbandi", "outlet"];
  const sorted = [...objects].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  for (const obj of sorted) {
    const layerKey = obj.type === "chakbandi" ? "chakbandi" : obj.type;
    const layer = layers[layerKey] || { visible: true };
    if (!layer.visible) continue;
    const isSelected = obj.id === selectedId;
    if (obj.type === "acre") drawAcre(ctx, obj, isSelected, zoom, C);
    else if (obj.type === "mustateel") drawMustateel(ctx, obj, isSelected, zoom, C);
    else if (obj.type === "muraba") drawMuraba(ctx, obj, isSelected, zoom, C);
    else if (obj.type === "canal") {
      drawCanal(ctx, obj, isSelected, zoom, C);
      const grassLayer = layers["grass"] || { visible: true };
      if (grassLayer.visible) drawGrass(ctx, obj, zoom);
    }
    else if (obj.type === "chakbandi") drawChakbandi(ctx, obj, isSelected, zoom, C);
    else if (obj.type === "outlet") drawOutlet(ctx, obj, isSelected, zoom, C);
    else if (obj.type === "khal") drawKhal(ctx, obj, isSelected, zoom, C);
    else if (obj.type === "road") drawRoad(ctx, obj, isSelected, zoom, C);
    else if (obj.type === "mouza") drawMouza(ctx, obj, isSelected, zoom, C);
  }

  // Khal draft — two parallel dashed preview lines
  if (khalDraft && khalDraft.length > 0) {
    const draftPts = [...khalDraft];
    if (snapPos) draftPts.push(snapPos);
    const halfW = DIMENSIONS.KHAL_WIDTH / 2;
    const left = getParallelPolyline(draftPts, -halfW);
    const right = getParallelPolyline(draftPts, halfW);
    ctx.strokeStyle = C.khalStroke || "#2563eb";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    for (const side of [left, right]) {
      ctx.beginPath();
      ctx.moveTo(side[0].x, side[0].y);
      for (const p of side) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const pt of khalDraft) {
      ctx.fillStyle = C.khalStroke || "#2563eb";
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 / zoom, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Road draft — two parallel dashed preview lines
  if (roadDraft && roadDraft.length > 0) {
    const draftPts = [...roadDraft];
    if (snapPos) draftPts.push(snapPos);
    const halfW = DIMENSIONS.ROAD_WIDTH / 2;
    const left = getParallelPolyline(draftPts, -halfW);
    const right = getParallelPolyline(draftPts, halfW);
    ctx.strokeStyle = C.roadStroke || "#d97706";
    ctx.lineWidth = 2.5 / zoom;
    ctx.setLineDash([8 / zoom, 5 / zoom]);
    for (const side of [left, right]) {
      ctx.beginPath();
      ctx.moveTo(side[0].x, side[0].y);
      for (const p of side) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const pt of roadDraft) {
      ctx.fillStyle = C.roadStroke || "#d97706";
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 / zoom, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Canal draft — two parallel dashed preview lines
  if (canalDraft && canalDraft.length > 0) {
    const draftPts = [...canalDraft];
    if (snapPos) draftPts.push(snapPos);
    const halfW = DIMENSIONS.CANAL_WIDTH / 2;
    const left = getParallelPolyline(draftPts, -halfW);
    const right = getParallelPolyline(draftPts, halfW);
    ctx.strokeStyle = C.canalStroke || "#0284c7";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    for (const side of [left, right]) {
      ctx.beginPath();
      ctx.moveTo(side[0].x, side[0].y);
      for (const p of side) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const pt of canalDraft) {
      ctx.fillStyle = C.canalStroke || "#3b82f6";
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 / zoom, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Chakbandi draft — cross pattern preview
  if (chakbandiDraft && chakbandiDraft.length > 0) {
    const color = C.chakbandiStroke || "#22c55e";
    const draftPts = [...chakbandiDraft];
    if (snapPos) draftPts.push(snapPos);
    const crossSize = 8 / zoom;
    const spacing = 40 / zoom;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8 / zoom;
    for (let i = 0; i < draftPts.length - 1; i++) {
      const a = draftPts[i], b = draftPts[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(segLen / spacing));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = a.x + (b.x - a.x) * t;
        const cy = a.y + (b.y - a.y) * t;
        ctx.beginPath();
        ctx.moveTo(cx - crossSize, cy - crossSize);
        ctx.lineTo(cx + crossSize, cy + crossSize);
        ctx.moveTo(cx + crossSize, cy - crossSize);
        ctx.lineTo(cx - crossSize, cy + crossSize);
        ctx.stroke();
      }
    }
    for (const pt of chakbandiDraft) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 / zoom, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Outlet draft
  if (outletDraft) {
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([4 / zoom, 3 / zoom]);
    ctx.beginPath();
    ctx.moveTo(outletDraft.x, outletDraft.y);
    if (snapPos) ctx.lineTo(snapPos.x, snapPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Mouza draft — dotted/dashed thin black preview line
  if (mouzaDraft && mouzaDraft.length > 0) {
    ctx.strokeStyle = C.mouzaStroke || "#000000";
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([3 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.moveTo(mouzaDraft[0].x, mouzaDraft[0].y);
    for (let i = 1; i < mouzaDraft.length; i++) ctx.lineTo(mouzaDraft[i].x, mouzaDraft[i].y);
    if (snapPos) ctx.lineTo(snapPos.x, snapPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const pt of mouzaDraft) {
      ctx.fillStyle = C.mouzaStroke || "#000000";
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 3 / zoom, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawAcre(ctx, obj, isSelected, zoom, C) {
  ctx.fillStyle = C.acreFill || "rgba(234,179,8,0.08)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.strokeStyle = isSelected ? "#60a5fa" : (C.acreStroke || "#eab308");
  ctx.lineWidth = (isSelected ? 2 : 1.5) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Always visible — clamped to fixed screen-pixel size
  if (obj.label) {
    ctx.fillStyle = C.labelColor || "#000000";
    ctx.font = `bold ${Math.max(12 / zoom, 10)}px JetBrains Mono, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
  }
}

function drawMustateel(ctx, obj, isSelected, zoom, C) {
  ctx.fillStyle = C.mustateelFill || "rgba(245,158,11,0.10)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  // RED border (thick)
  ctx.strokeStyle = isSelected ? "#60a5fa" : (C.mustateelStroke || "#ef4444");
  ctx.lineWidth = (isSelected ? 3 : 2.5) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Killa grid — always visible; thinner (bareek) at low zoom, more visible at high zoom
  {
    const killaAlpha = zoom > 0.3 ? 0.12 : 0.05;
    ctx.strokeStyle = `rgba(239,68,68,${killaAlpha})`;
    ctx.lineWidth = zoom > 0.3 ? 0.4 / zoom : 0.2 / zoom;
    const cellW = obj.w / 2, cellH = obj.h / 5;
    ctx.beginPath();
    ctx.moveTo(obj.x + cellW, obj.y); ctx.lineTo(obj.x + cellW, obj.y + obj.h);
    ctx.stroke();
    ctx.beginPath();
    for (let r = 1; r < 5; r++) {
      ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
    }
    ctx.stroke();

    // Killa numbers — only at readable zoom levels
    if (zoom > 0.25) {
      const grid = getMustateeelKillaGrid();
      ctx.fillStyle = "rgba(220,38,38,0.9)";
      ctx.font = `bold ${11 / zoom}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
          ctx.fillText(String(grid[r][c]), obj.x + c * cellW + cellW / 2, obj.y + r * cellH + cellH / 2);
        }
      }
    }
  }

  // Center label — always visible, fixed screen-pixel size (stays legible at all zoom levels)
  {
    const centerX = obj.x + obj.w / 2;
    const centerY = obj.y + obj.h / 2;
    const labelText = obj.label || "";
    ctx.fillStyle = C.labelColor || "#000000";
    ctx.font = `bold ${Math.max(14 / zoom, 11)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(labelText, centerX, centerY - (obj.showOwner && obj.ownerName ? 8 / zoom : 0));
    if (obj.showOwner && obj.ownerName) {
      ctx.fillStyle = "rgba(100,116,139,0.9)";
      ctx.font = `${12 / zoom}px Inter, sans-serif`;
      ctx.fillText(obj.ownerName, centerX, centerY + 10 / zoom);
    }
  }
}

function drawMuraba(ctx, obj, isSelected, zoom, C) {
  ctx.fillStyle = C.murabaFill || "rgba(249,115,22,0.08)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  // RED border (thicker)
  ctx.strokeStyle = isSelected ? "#60a5fa" : (C.murabaStroke || "#ef4444");
  ctx.lineWidth = (isSelected ? 4 : 3) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // 5×5 killa grid — always visible; thinner (bareek) at low zoom, more visible at high zoom
  {
    const killaAlpha = zoom > 0.15 ? 0.10 : 0.04;
    ctx.strokeStyle = `rgba(239,68,68,${killaAlpha})`;
    ctx.lineWidth = zoom > 0.15 ? 0.4 / zoom : 0.2 / zoom;
    const cellW = obj.w / 5, cellH = obj.h / 5;
    ctx.beginPath();
    for (let c = 1; c < 5; c++) {
      ctx.moveTo(obj.x + c * cellW, obj.y); ctx.lineTo(obj.x + c * cellW, obj.y + obj.h);
    }
    for (let r = 1; r < 5; r++) {
      ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
    }
    ctx.stroke();

    // Killa numbers — only at readable zoom levels
    if (zoom > 0.2) {
      const grid = getMurabaKillaGrid();
      ctx.fillStyle = "rgba(220,38,38,0.85)";
      ctx.font = `bold ${10 / zoom}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.fillText(String(grid[r][c]), obj.x + c * cellW + cellW / 2, obj.y + r * cellH + cellH / 2);
        }
      }
    }
  }

  // Center label — always visible, fixed screen-pixel size (stays legible at all zoom levels)
  {
    const centerX = obj.x + obj.w / 2;
    const centerY = obj.y + obj.h / 2;
    const labelText = obj.label || "";
    ctx.fillStyle = C.labelColor || "#000000";
    ctx.font = `bold ${Math.max(14 / zoom, 11)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(labelText, centerX, centerY - (obj.showOwner && obj.ownerName ? 10 / zoom : 0));
    if (obj.showOwner && obj.ownerName) {
      ctx.fillStyle = "rgba(100,116,139,0.9)";
      ctx.font = `${13 / zoom}px Inter, sans-serif`;
      ctx.fillText(obj.ownerName, centerX, centerY + 13 / zoom);
    }
  }
}

// Canal = two parallel blue bank lines with semi-transparent water fill between them
function drawCanal(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const halfW = obj.width / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);

  // Water fill between banks (semi-transparent blue)
  ctx.fillStyle = "rgba(30, 144, 255, 0.25)";
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();

  // Bank lines (clean blue outer double lines — symmetric, no arrow ends)
  const bankColor = isSelected ? "#93c5fd" : (C.canalStroke || "#0284c7");
  ctx.strokeStyle = bankColor;
  ctx.lineWidth = (isSelected ? 3 : 2.5) / zoom;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  for (const side of [left, right]) {
    ctx.beginPath();
    ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Watermark name label — centered ON the canal path, rotated, semi-transparent
  if (obj.name) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = `bold ${Math.max(14 / zoom, 11)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.name, 0, 0);
    ctx.restore();
  }
}

function drawGrass(ctx, obj, zoom) {
  // kept for compatibility, trees now drawn in drawCanal
}

function drawChakbandi(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const color = C.chakbandiStroke || "#22c55e";

  if (obj.crossPattern) {
    // Cross-pattern mode: × × × along the path
    const crossSize = (obj.crossSize || 8) / zoom;
    const spacing = (obj.crossSpacing || 40) / zoom;
    ctx.strokeStyle = isSelected ? "#86efac" : color;
    ctx.lineWidth = 1.8 / zoom;
    for (let i = 0; i < obj.points.length - 1; i++) {
      const a = obj.points[i], b = obj.points[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(segLen / spacing));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = a.x + (b.x - a.x) * t;
        const cy = a.y + (b.y - a.y) * t;
        ctx.beginPath();
        ctx.moveTo(cx - crossSize, cy - crossSize);
        ctx.lineTo(cx + crossSize, cy + crossSize);
        ctx.moveTo(cx + crossSize, cy - crossSize);
        ctx.lineTo(cx - crossSize, cy + crossSize);
        ctx.stroke();
      }
    }
  } else {
    // Solid line with cross markers at vertices
    ctx.strokeStyle = isSelected ? "#86efac" : color;
    ctx.lineWidth = (isSelected ? 4 : 3.5) / zoom;
    ctx.beginPath();
    ctx.moveTo(obj.points[0].x, obj.points[0].y);
    for (const p of obj.points) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    const crossSize = 8 / zoom;
    ctx.strokeStyle = isSelected ? "#86efac" : color;
    ctx.lineWidth = 2 / zoom;
    for (const pt of obj.points) {
      ctx.beginPath();
      ctx.moveTo(pt.x - crossSize, pt.y); ctx.lineTo(pt.x + crossSize, pt.y);
      ctx.moveTo(pt.x, pt.y - crossSize); ctx.lineTo(pt.x, pt.y + crossSize);
      ctx.stroke();
    }
  }

  // Name label
  if (obj.name && zoom > 0.3) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(8, 11 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.name, 0, -6 / zoom);
    ctx.restore();
  }
}

// Moga / Outlet = prominent block/square base + directional flow arrow (scales dynamically)
function drawOutlet(ctx, obj, isSelected, zoom, C) {
  const scale = obj.arrowScale || 1;
  const blockSize = obj.blockSize || 20;
  const sx = obj.start.x, sy = obj.start.y;
  const ex = obj.end.x, ey = obj.end.y;
  const angle = Math.atan2(ey - sy, ex - sx);
  const len = Math.hypot(ex - sx, ey - sy);

  const color = isSelected ? "#67e8f9" : (C.outletStroke || "#06b6d4");

  // Prominent block/square at the Moga base
  const half = blockSize / 2;
  ctx.fillStyle = color;
  ctx.fillRect(sx - half, sy - half, blockSize, blockSize);
  ctx.strokeStyle = "#0e7490";
  ctx.lineWidth = 2 / zoom;
  ctx.strokeRect(sx - half, sy - half, blockSize, blockSize);

  // Directional flow arrow — length & width scale proportionally with arrowScale
  const shaftWidth = (3 * scale) / zoom;
  const headLen = (22 * scale) / zoom;
  const headWidth = (14 * scale) / zoom;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);

  // Arrow shaft
  ctx.strokeStyle = color;
  ctx.lineWidth = shaftWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.stroke();

  // Arrowhead
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(len - headLen, -headWidth);
  ctx.lineTo(len - headLen, headWidth);
  ctx.closePath();
  ctx.fill();

  // Mogha name — displayed above the block (like rectangle labels)
  if (obj.mogha_name) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = "#0e7490";
    ctx.font = `bold ${Math.max(14 / zoom, 11)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(obj.mogha_name, 0, -blockSize / 2 - 4 / zoom);
    ctx.restore();
  }

  // Mogha number / side label (e.g. "18500/L")
  const moghaNum = [obj.mogha_number, obj.mogha_side].filter(Boolean).join("/");
  const labelToUse = moghaNum || obj.label || "";
  if (labelToUse) {
    ctx.fillStyle = "#0e7490";
    ctx.font = `bold ${Math.max(12 / zoom, 10)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(labelToUse, len / 2, -Math.max(headWidth, 8 / zoom));
  }

  ctx.restore();
}

// ---- Khal Drawing (two parallel blue lines with adjustable spacing) ----
function drawKhal(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const width = obj.width || DIMENSIONS.KHAL_WIDTH;
  const halfW = width / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);

  const khalColor = C.khalStroke || "#2563eb";
  ctx.strokeStyle = isSelected ? "#93c5fd" : khalColor;
  ctx.lineWidth = (isSelected ? 2.5 : 2) / zoom;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";

  for (const side of [left, right]) {
    ctx.beginPath();
    ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Clean perpendicular cap at the start point — closes the two bank lines
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  ctx.lineTo(right[0].x, right[0].y);
  ctx.stroke();

  // Arrow at endpoint — spans full khal width, tapers cleanly to a point
  const lastPt = obj.points[obj.points.length - 1];
  const prevPt = obj.points[obj.points.length - 2];
  const arrowAngle = Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x);
  const arrowLen = Math.max(width * 1.5, 14 / zoom, 12);
  ctx.save();
  ctx.translate(lastPt.x, lastPt.y);
  ctx.rotate(arrowAngle);
  ctx.fillStyle = isSelected ? "#93c5fd" : khalColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);                        // tip — at the centerline endpoint
  ctx.lineTo(-arrowLen, -halfW);            // back-left — matches left bank
  ctx.lineTo(-arrowLen, halfW);            // back-right — matches right bank
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Label
  if (obj.name && zoom > 0.3) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = khalColor;
    ctx.font = `bold ${Math.max(8, 11 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.name || "Khal", 0, -halfW - 3 / zoom);
    ctx.restore();
  }
}

// ---- Road Drawing (solid asphalt fill, amber casing edges, dashed lane divider) ----
function drawRoad(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const width = obj.width || DIMENSIONS.ROAD_WIDTH;
  const halfW = width / 2;

  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);

  // Solid asphalt fill (no transparency — neutral dark)
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();

  // Casing edge lines (solid amber — symmetric, parallel)
  const edgeColor = isSelected ? "#fcd34d" : (C.roadStroke || "#b45309");
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = (isSelected ? 3 : 2.5) / zoom;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  for (const side of [left, right]) {
    ctx.beginPath();
    ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Dashed lane divider along center line
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([10 / zoom, 6 / zoom]);
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Watermark name label — centered ON the road path, rotated, semi-transparent
  if (obj.name) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = `bold ${Math.max(14 / zoom, 11)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.name, 0, 0);
    ctx.restore();
  }
}

// ---- Mouza Boundary Drawing (dotted/dashed thin black line) ----
function drawMouza(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const color = C.mouzaStroke || "#000000";
  ctx.strokeStyle = isSelected ? "#6366f1" : color;
  ctx.lineWidth = (isSelected ? 2 : 1.2) / zoom;
  ctx.setLineDash([3 / zoom, 4 / zoom]);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Name label — حد بندی موضع
  if (obj.name && zoom > 0.2) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(10 / zoom, 9)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.name, 0, -6 / zoom);
    ctx.restore();
  }
}