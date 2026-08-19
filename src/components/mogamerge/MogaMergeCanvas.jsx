// ============================================================
// MOGA MERGE CANVAS — a specialised, read-only-at-object-level
// canvas for the "Moga merge to one map" module.
//
// Rules (per user):
//  • Every object belongs to a moga group (mogaGroup = source map id).
//  • Individual objects can NOT be moved/edited separately.
//  • Clicking selects the WHOLE moga group; dragging moves the whole
//    group together, snapping to the global mustateel grid so all
//    mustateels / murabas stay aligned across mogas.
//  • Auto-fit keeps the whole merged map in view.
//  • Background mustateel + muraba grid is always shown for alignment.
//
// Rendering reuses the same GISRenderer draw functions as the editor
// so the merged map looks identical here and in GeoMap / print.
// ============================================================

import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import {
  DIMENSIONS, screenToWorld, hitTest, snapToMustateeelGrid, isInViewport,
  getMustateelMouzaSplit,
} from "@/lib/gisEngine";
import {
  drawGrid, drawAcre, drawMustateel, drawMuraba, drawCanal, drawKhal,
  drawRoad, drawBridge, drawChakbandi, drawMouza, drawOutlet, drawDamageMarker,
} from "@/components/editor/GISRenderer";

const MUST_W = DIMENSIONS.MUSTATEEL.width;
const MUST_H = DIMENSIONS.MUSTATEEL.height;

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "bridge", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

const C = {
  acreFill: "rgba(234,179,8,0.08)", acreStroke: "#eab308",
  mustateelFill: "rgba(245,158,11,0.10)", mustateelStroke: "#ef4444",
  murabaFill: "rgba(249,115,22,0.08)", murabaStroke: "#ef4444",
  canalFill: "rgba(163,218,244,0.70)", canalStroke: "#2B7AB8",
  khalStroke: "#000000",
  chakbandiStroke: "#22c55e",
  mouzaStroke: "#dc2626",
  outletStroke: "#06b6d4",
  labelColor: "#1e293b",
};

// World bounds of a set of objects (for auto-fit)
function objectsBounds(objects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + (o.w || 0)); maxY = Math.max(maxY, o.y + (o.h || 0));
    } else if (o.points?.length) {
      for (const p of o.points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    } else if (o.start && o.end) {
      minX = Math.min(minX, o.start.x, o.end.x); minY = Math.min(minY, o.start.y, o.end.y);
      maxX = Math.max(maxX, o.start.x, o.end.x); maxY = Math.max(maxY, o.start.y, o.end.y);
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

export default function MogaMergeCanvas({ objects, selectedGroup, onSelectGroup, onCommitMove, fitSignal }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(0.15);
  const [pan, setPan] = useState({ x: 100, y: 80 });
  const dragRef = useRef(null); // { mode:'group'|'pan', startScreen, startPan, groupId, snapshot, lastWorld }

  // ---- render ----
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f1923";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    drawGrid(ctx, W, H, zoom, pan, { showMustateel: true, showMuraba: true });

    const mouzaObjects = objects.filter(o => o.type === "mouza");
    const sorted = [...objects].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));

    // Live drag offset applied only to the active group (visual only until commit)
    const off = dragRef.current?.mode === "group" ? dragRef.current.offset : null;

    for (const obj of sorted) {
      if (!isInViewport(obj, pan, zoom, W, H)) continue;
      const isSel = obj.mogaGroup === selectedGroup;
      // shift a dragging group's object by the live offset
      const drawObj = (off && obj.mogaGroup === dragRef.current.groupId) ? applyOffset(obj, off) : obj;
      if (drawObj.type === "acre") drawAcre(ctx, drawObj, isSel, zoom, C);
      else if (drawObj.type === "mustateel") drawMustateel(ctx, drawObj, isSel, zoom, C, true, getMustateelMouzaSplit(drawObj, mouzaObjects), true);
      else if (drawObj.type === "muraba") drawMuraba(ctx, drawObj, isSel, zoom, C, true, getMustateelMouzaSplit(drawObj, mouzaObjects));
      else if (drawObj.type === "canal") drawCanal(ctx, drawObj, isSel, zoom, C);
      else if (drawObj.type === "khal") drawKhal(ctx, drawObj, isSel, zoom, C);
      else if (drawObj.type === "road") drawRoad(ctx, drawObj, isSel, zoom, C);
      else if (drawObj.type === "bridge") drawBridge(ctx, drawObj, isSel, zoom, C);
      else if (drawObj.type === "chakbandi") drawChakbandi(ctx, drawObj, isSel, zoom, C, true);
      else if (drawObj.type === "mouza") drawMouza(ctx, drawObj, isSel, zoom, C);
      else if (drawObj.type === "outlet") drawOutlet(ctx, drawObj, isSel, zoom, C);
      else if (drawObj.type === "damageMarker") drawDamageMarker(ctx, drawObj, isSel, zoom);
    }
    ctx.restore();
  }, [objects, zoom, pan, selectedGroup]);

  useLayoutEffect(() => { render(); }, [render]);

  // ---- resize ----
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => { canvas.width = container.clientWidth; canvas.height = container.clientHeight; render(); };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  // ---- auto-fit ----
  const fitToObjects = useCallback((objs) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const b = objectsBounds(objs);
    if (!b) return;
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    const z = Math.max(0.02, Math.min(0.6, Math.min((canvas.width * 0.9) / (w || 1), (canvas.height * 0.9) / (h || 1))));
    setZoom(z);
    setPan({ x: canvas.width / 2 - (b.minX + w / 2) * z, y: canvas.height / 2 - (b.minY + h / 2) * z });
  }, []);

  useEffect(() => {
    if (fitSignal) fitToObjects(objects);
  }, [fitSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- interaction ----
  const getWorld = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan.x, pan.y, zoom);
  };

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nz = Math.max(0.01, Math.min(4, zoom * factor));
    // keep cursor world point fixed
    const nx = mx - (mx - pan.x) * (nz / zoom);
    const ny = my - (my - pan.y) * (nz / zoom);
    setZoom(nz); setPan({ x: nx, y: ny });
  }, [zoom, pan]);

  const onDown = useCallback((e) => {
    const world = getWorld(e);
    const hit = hitTest(world.x, world.y, objects);
    if (hit && hit.mogaGroup) {
      onSelectGroup(hit.mogaGroup);
      dragRef.current = { mode: "group", groupId: hit.mogaGroup, startWorld: world, offset: { dx: 0, dy: 0 }, moved: false };
    } else {
      onSelectGroup(null);
      const rect = canvasRef.current.getBoundingClientRect();
      dragRef.current = { mode: "pan", startScreen: { x: e.clientX, y: e.clientY }, startPan: { ...pan } };
    }
  }, [objects, pan, onSelectGroup]);

  const onMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === "pan") {
      setPan({ x: d.startPan.x + (e.clientX - d.startScreen.x), y: d.startPan.y + (e.clientY - d.startScreen.y) });
    } else {
      const world = getWorld(e);
      let dx = world.x - d.startWorld.x;
      let dy = world.y - d.startWorld.y;
      // snap to mustateel grid so mogas align
      dx = Math.round(dx / MUST_W) * MUST_W;
      dy = Math.round(dy / MUST_H) * MUST_H;
      d.offset = { dx, dy };
      d.moved = !!(dx || dy);
      render();
    }
  }, [render]);

  const onUp = useCallback(() => {
    const d = dragRef.current;
    if (d && d.mode === "group" && d.moved) {
      onCommitMove(d.groupId, d.offset.dx, d.offset.dy);
    }
    dragRef.current = null;
    render();
  }, [onCommitMove, render]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0f1923] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ cursor: dragRef.current?.mode === "pan" ? "grabbing" : "default", touchAction: "none" }}
        onWheel={onWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
      />
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 font-mono bg-black/40 px-2 py-1 rounded pointer-events-none">
        Zoom {(zoom * 100).toFixed(0)}% · Drag a moga to move it whole (grid-snapped) · Scroll to zoom
      </div>
    </div>
  );
}

// Apply a world offset to one object's geometry (for live drag preview)
function applyOffset(o, off) {
  const dx = off.dx, dy = off.dy;
  const copy = { ...o };
  if (["acre", "mustateel", "muraba", "damageMarker"].includes(o.type)) {
    copy.x = (o.x || 0) + dx; copy.y = (o.y || 0) + dy;
  }
  if (o.points) copy.points = o.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  if (o.start && o.end) {
    copy.start = { x: o.start.x + dx, y: o.start.y + dy };
    copy.end = { x: o.end.x + dx, y: o.end.y + dy };
  }
  return copy;
}