import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  ftToPx, screenToWorld, worldToScreen,
  snapToAcreGrid, snapToMustateeelGrid, snapToMurabaGrid,
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
    snapPos, onSnapPosChange, onPanChange, onZoomChange,
    colorSettings, bgColor,
  },
  ref
) {
  const canvasRef = useRef(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const animRef = useRef(null);

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
    drawObjects(ctx, objects, zoom, selectedId, layers, canalDraft, chakbandiDraft, outletDraft, snapPos, C);

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
  }, [objects, activeTool, zoom, pan, layers, selectedId, canalDraft, chakbandiDraft, outletDraft, snapPos, C, bgColor]);

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
    if (activeTool === "acre") return snapToAcreGrid(world.x, world.y, 1);
    if (activeTool === "mustateel") return snapToMustateeelGrid(world.x, world.y, 1);
    if (activeTool === "muraba") return snapToMurabaGrid(world.x, world.y, 1);
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
    const snapped = getSnappedWorld(e);
    onSnapPosChange(snapped);
  }, [activeTool, pan, zoom, getSnappedWorld, onPanChange, onSnapPosChange]);

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

    if (activeTool === "acre") {
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
    } else if (activeTool === "select") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      onSelect(hit ? hit.id : null);
    } else if (activeTool === "eraser") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit) onAddObject("__delete__", { id: hit.id });
    }
  }, [activeTool, pan, zoom, objects, getSnappedWorld, onAddObject, onCanalPointAdd, onChakbandiPointAdd, onOutletStart, onOutletFinish, onSelect, outletDraft]);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleDblClick = useCallback((e) => {
    if (activeTool === "canal") onCanalFinish();
    if (activeTool === "chakbandi") onChakbandiFinish();
  }, [activeTool, onCanalFinish, onChakbandiFinish]);

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
    acre: "cursor-crosshair", mustateel: "cursor-crosshair", muraba: "cursor-crosshair",
  }[activeTool] || "cursor-crosshair";

  return (
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
  );
});

export default GISCanvas;

// ---- Hit Test ----
function hitTest(wx, wy, objects) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return o;
    } else if (o.type === "canal" || o.type === "chakbandi") {
      for (let j = 0; j < o.points.length - 1; j++) {
        if (distToLineSegment(wx, wy, o.points[j].x, o.points[j].y, o.points[j+1].x, o.points[j+1].y) < 15) return o;
      }
    } else if (o.type === "outlet") {
      if (distToLineSegment(wx, wy, o.start.x, o.start.y, o.end.x, o.end.y) < 15) return o;
    }
  }
  return null;
}

// ---- Grid Drawing ----
function drawGrid(ctx, W, H, zoom, pan) {
  const acreW = ftToPx(DIMENSIONS.ACRE.width, 1);
  const acreH = ftToPx(DIMENSIONS.ACRE.height, 1);
  const startX = Math.floor(-pan.x / zoom / acreW) * acreW - acreW;
  const startY = Math.floor(-pan.y / zoom / acreH) * acreH - acreH;
  const endX = startX + (W / zoom) + acreW * 2;
  const endY = startY + (H / zoom) + acreH * 2;

  ctx.lineWidth = 0.5 / zoom;

  if (zoom > 0.3) {
    ctx.strokeStyle = "rgba(59,130,246,0.12)";
    ctx.beginPath();
    for (let x = startX; x < endX; x += acreW) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = startY; y < endY; y += acreH) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();
  }

  const mustW = ftToPx(DIMENSIONS.MUSTATEEL.width, 1);
  const mustH = ftToPx(DIMENSIONS.MUSTATEEL.height, 1);
  ctx.strokeStyle = "rgba(59,130,246,0.25)";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (let x = Math.floor(startX / mustW) * mustW; x < endX; x += mustW) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
  for (let y = Math.floor(startY / mustH) * mustH; y < endY; y += mustH) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
  ctx.stroke();
}

// ---- Object Drawing ----
function drawObjects(ctx, objects, zoom, selectedId, layers, canalDraft, chakbandiDraft, outletDraft, snapPos, C) {
  const order = ["muraba", "mustateel", "acre", "canal", "chakbandi", "outlet"];
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
  }

  // Canal draft
  if (canalDraft && canalDraft.length > 0) {
    ctx.strokeStyle = C.canalStroke || "#3b82f6";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.moveTo(canalDraft[0].x, canalDraft[0].y);
    for (let i = 1; i < canalDraft.length; i++) ctx.lineTo(canalDraft[i].x, canalDraft[i].y);
    if (snapPos) ctx.lineTo(snapPos.x, snapPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const pt of canalDraft) {
      ctx.fillStyle = C.canalStroke || "#3b82f6";
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 / zoom, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Chakbandi draft
  if (chakbandiDraft && chakbandiDraft.length > 0) {
    ctx.strokeStyle = C.chakbandiStroke || "#22c55e";
    ctx.lineWidth = 3 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.moveTo(chakbandiDraft[0].x, chakbandiDraft[0].y);
    for (let i = 1; i < chakbandiDraft.length; i++) ctx.lineTo(chakbandiDraft[i].x, chakbandiDraft[i].y);
    if (snapPos) ctx.lineTo(snapPos.x, snapPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const pt of chakbandiDraft) {
      ctx.fillStyle = C.chakbandiStroke || "#22c55e";
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
}

function drawAcre(ctx, obj, isSelected, zoom, C) {
  ctx.fillStyle = C.acreFill || "rgba(234,179,8,0.08)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.strokeStyle = isSelected ? "#60a5fa" : (C.acreStroke || "#eab308");
  ctx.lineWidth = (isSelected ? 2 : 1.5) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  if (zoom > 0.5 && obj.label) {
    ctx.fillStyle = C.acreStroke || "#b45309";
    ctx.font = `${Math.max(8, 11 / zoom)}px JetBrains Mono, monospace`;
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

  // Killa grid
  if (zoom > 0.3) {
    ctx.strokeStyle = "rgba(239,68,68,0.3)";
    ctx.lineWidth = 0.5 / zoom;
    const cellW = obj.w / 2, cellH = obj.h / 5;
    ctx.beginPath();
    ctx.moveTo(obj.x + cellW, obj.y); ctx.lineTo(obj.x + cellW, obj.y + obj.h);
    ctx.stroke();
    ctx.beginPath();
    for (let r = 1; r < 5; r++) {
      ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
    }
    ctx.stroke();

    if (zoom > 0.5) {
      const grid = getMustateeelKillaGrid();
      ctx.fillStyle = "rgba(220,38,38,0.9)";
      ctx.font = `bold ${Math.max(7, 10 / zoom)}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
          ctx.fillText(String(grid[r][c]), obj.x + c * cellW + cellW / 2, obj.y + r * cellH + cellH / 2);
        }
      }
    }
  }

  // Center label (name + number)
  if (zoom > 0.2) {
    const centerX = obj.x + obj.w / 2;
    const centerY = obj.y + obj.h / 2;
    const labelText = obj.label ? `مستطیل ${obj.label}` : (C.mustateelDefaultLabel || "MUSTATEEL");
    ctx.fillStyle = C.mustateelStroke || "#ef4444";
    ctx.font = `bold ${Math.max(9, 14 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(labelText, centerX, centerY - (obj.showOwner && obj.ownerName ? 8 / zoom : 0));
    if (obj.showOwner && obj.ownerName) {
      ctx.fillStyle = "rgba(100,116,139,0.9)";
      ctx.font = `${Math.max(7, 10 / zoom)}px Inter, sans-serif`;
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

  // 5×5 killa grid
  if (zoom > 0.15) {
    ctx.strokeStyle = "rgba(239,68,68,0.25)";
    ctx.lineWidth = 0.5 / zoom;
    const cellW = obj.w / 5, cellH = obj.h / 5;
    ctx.beginPath();
    for (let c = 1; c < 5; c++) {
      ctx.moveTo(obj.x + c * cellW, obj.y); ctx.lineTo(obj.x + c * cellW, obj.y + obj.h);
    }
    for (let r = 1; r < 5; r++) {
      ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
    }
    ctx.stroke();

    if (zoom > 0.3) {
      const grid = getMurabaKillaGrid();
      ctx.fillStyle = "rgba(220,38,38,0.85)";
      ctx.font = `bold ${Math.max(6, 9 / zoom)}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.fillText(String(grid[r][c]), obj.x + c * cellW + cellW / 2, obj.y + r * cellH + cellH / 2);
        }
      }
    }
  }

  // Center label (name + number)
  if (zoom > 0.1) {
    const centerX = obj.x + obj.w / 2;
    const centerY = obj.y + obj.h / 2;
    const labelText = obj.label ? `مربعہ ${obj.label}` : (C.murabaDefaultLabel || "MURABA");
    ctx.fillStyle = C.murabaStroke || "#ef4444";
    ctx.font = `bold ${Math.max(10, 16 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(labelText, centerX, centerY - (obj.showOwner && obj.ownerName ? 10 / zoom : 0));
    if (obj.showOwner && obj.ownerName) {
      ctx.fillStyle = "rgba(100,116,139,0.9)";
      ctx.font = `${Math.max(8, 11 / zoom)}px Inter, sans-serif`;
      ctx.fillText(obj.ownerName, centerX, centerY + 13 / zoom);
    }
  }
}

function drawCanal(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const halfW = obj.width / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);

  // Water fill
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fillStyle = C.canalFill || "rgba(59,130,246,0.25)";
  ctx.fill();

  // Two blue wall lines
  ctx.strokeStyle = isSelected ? "#93c5fd" : (C.canalStroke || "#3b82f6");
  ctx.lineWidth = (isSelected ? 2 : 1.5) / zoom;
  for (const side of [left, right]) {
    ctx.beginPath();
    ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Trees along canal edges
  if (zoom > 0.3) {
    const treeSpacing = 12;
    for (const side of [left, right]) {
      for (let i = 0; i < side.length - 1; i++) {
        const px = side[i].x, py = side[i].y;
        const nx = side[i + 1].x, ny = side[i + 1].y;
        const segLen = Math.hypot(nx - px, ny - py);
        const steps = Math.max(1, Math.floor(segLen / (treeSpacing / zoom)));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const gx = px + (nx - px) * t, gy = py + (ny - py) * t;
          ctx.font = `${Math.max(5, 7 / zoom)}px serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("🌲", gx, gy);
        }
      }
    }
  }

  if (obj.name && zoom > 0.3) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = "#1d4ed8";
    ctx.font = `bold ${Math.max(8, 11 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.name, 0, -obj.width / 2 - 3 / zoom);
    ctx.restore();
  }
}

function drawGrass(ctx, obj, zoom) {
  // kept for compatibility, trees now drawn in drawCanal
}

function drawChakbandi(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const color = C.chakbandiStroke || "#22c55e";

  // Bold green single line with cross markers
  ctx.strokeStyle = isSelected ? "#86efac" : color;
  ctx.lineWidth = (isSelected ? 4 : 3.5) / zoom;
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Cross (+) markers at each point
  const crossSize = 8 / zoom;
  ctx.strokeStyle = isSelected ? "#86efac" : color;
  ctx.lineWidth = 2 / zoom;
  for (const pt of obj.points) {
    ctx.beginPath();
    ctx.moveTo(pt.x - crossSize, pt.y); ctx.lineTo(pt.x + crossSize, pt.y);
    ctx.moveTo(pt.x, pt.y - crossSize); ctx.lineTo(pt.x, pt.y + crossSize);
    ctx.stroke();
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

function drawOutlet(ctx, obj, isSelected, zoom, C) {
  const scale = (obj.arrowScale || 1) / zoom;
  const sx = obj.start.x, sy = obj.start.y;
  const ex = obj.end.x, ey = obj.end.y;
  const angle = Math.atan2(ey - sy, ex - sx);
  const len = Math.hypot(ex - sx, ey - sy);

  ctx.save();
  ctx.translate(sx, sy); ctx.rotate(angle);

  ctx.strokeStyle = isSelected ? "#67e8f9" : (C.outletStroke || "#06b6d4");
  ctx.lineWidth = (isSelected ? 2.5 : 2) / zoom;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

  const headLen = 16 * scale;
  const headAngle = Math.PI / 5;
  ctx.fillStyle = isSelected ? "#67e8f9" : (C.outletStroke || "#06b6d4");
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(len - headLen * Math.cos(headAngle), -headLen * Math.sin(headAngle));
  ctx.lineTo(len - headLen * Math.cos(headAngle), headLen * Math.sin(headAngle));
  ctx.closePath(); ctx.fill();

  if (obj.label && zoom > 0.3) {
    ctx.fillStyle = C.outletStroke || "#0891b2";
    ctx.font = `bold ${Math.max(8, 11 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.label, len / 2, -6 / zoom);
  }

  ctx.fillStyle = C.outletStroke || "#06b6d4";
  ctx.beginPath(); ctx.arc(0, 0, 4 / zoom, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}