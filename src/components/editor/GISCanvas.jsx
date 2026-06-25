import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  screenToWorld, worldToScreen, hitTest,
  snapToAcreGrid, snapToMustateeelGrid, snapToMurabaGrid,
  snapMovePosition, snapToParcelBoundaries, isInViewport,
  DIMENSIONS, distToLineSegment, computeSnapPosition,
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
    drawGrid(ctx, W, H, zoom, pan);

    // Frustum-culled sorted object draw
    const sorted = [...objects].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));
    for (const obj of sorted) {
      if (!isInViewport(obj, pan, zoom, W, H)) continue;
      const layerKey = obj.type === "chakbandi" ? "chakbandi" : obj.type === "damageMarker" ? "outlet" : obj.type;
      const layer = layers[layerKey] || { visible: true };
      if (!layer.visible) continue;
      const isSelected = obj.id === selectedId;

      if (obj.type === "acre") drawAcre(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "mustateel") drawMustateel(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "muraba") drawMuraba(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "canal") drawCanal(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "khal") drawKhal(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "road") drawRoad(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "outlet") drawOutlet(ctx, obj, isSelected, zoom, C);
      else if (obj.type === "chakbandi") drawChakbandi(ctx, obj, isSelected, zoom, C);
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

    ctx.restore();

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
  }, [objects, zoom, pan, layers, selectedId, canalDraft, chakbandiDraft, outletDraft, khalDraft, roadDraft, mouzaDraft, snapPos, C, bgColor]);

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
  }, [activeTool, pan, zoom, getSnappedWorld, onPanChange, onSnapPosChange, onUpdateObject]);

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
    else if (activeTool === "damageMarker") onAddObject("damageMarker", worldRaw);
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
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit) onAddObject("__delete__", { id: hit.id });
    }
  }, [activeTool, pan, zoom, objects, getSnappedWorld, onAddObject, onCanalPointAdd, onChakbandiPointAdd, onOutletStart, onOutletFinish, onSelect, outletDraft, onKhalPointAdd, onRoadPointAdd, onMouzaPointAdd, onDamageMarkerClick]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false; isMoving.current = false; movingObjId.current = null;
  }, []);

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

  const cursorClass = {
    select: "cursor-default", pan: "cursor-grab", eraser: "cursor-cell",
    canal: "cursor-crosshair", chakbandi: "cursor-crosshair", outlet: "cursor-crosshair",
    khal: "cursor-crosshair", road: "cursor-crosshair", mouza: "cursor-crosshair",
    acre: "cursor-crosshair", mustateel: "cursor-crosshair", muraba: "cursor-crosshair",
    move: "cursor-move", damageMarker: "cursor-crosshair",
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