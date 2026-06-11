import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  ftToPx, screenToWorld, worldToScreen,
  snapToAcreGrid, snapToMustateeelGrid, snapToMurabaGrid,
  getParallelPolyline, getMustateeelKillaGrid, getMurabaKillaGrid,
  distToLineSegment, DIMENSIONS, BASE_SCALE
} from "@/lib/drawingEngine";

// ---- Color Constants ----
const COLORS = {
  background: "#0f1923",
  gridMinor: "rgba(59,130,246,0.06)",
  gridMajor: "rgba(59,130,246,0.15)",
  gridLabel: "rgba(59,130,246,0.4)",
  acre: { fill: "rgba(234,179,8,0.08)", stroke: "#ca8a04", text: "#fbbf24" },
  mustateel: { fill: "rgba(245,158,11,0.12)", stroke: "#d97706", selectedStroke: "#fbbf24", text: "#fde68a" },
  muraba: { fill: "rgba(249,115,22,0.10)", stroke: "#ea580c", selectedStroke: "#fb923c", text: "#fed7aa" },
  canal: { line: "#3b82f6", water: "rgba(59,130,246,0.15)" },
  grass: "#22c55e",
  outlet: { arrow: "#06b6d4", label: "#67e8f9" },
  selected: "#60a5fa",
  snapIndicator: "#a78bfa",
  cursor: "rgba(96,165,250,0.6)",
};

const GISCanvas = forwardRef(function GISCanvas(
  {
    objects, activeTool, zoom, pan, layers,
    selectedId, onSelect, onAddObject, onUpdateObject,
    canalDraft, onCanalPointAdd, onCanalFinish,
    outletDraft, onOutletStart, onOutletFinish,
    snapPos, onSnapPosChange, onPanChange, onZoomChange,
    showGrid,
  },
  ref
) {
  const canvasRef = useRef(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const animRef = useRef(null);
  const renderNeeded = useRef(true);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  // ---- Main Render Loop ----
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    drawGrid(ctx, W, H, zoom, pan);
    drawObjects(ctx, objects, zoom, selectedId, layers, canalDraft, outletDraft, snapPos);

    ctx.restore();

    // Snap indicator (screen space)
    if (snapPos) {
      const sx = snapPos.x * zoom + pan.x;
      const sy = snapPos.y * zoom + pan.y;
      ctx.strokeStyle = COLORS.snapIndicator;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy);
      ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10);
      ctx.stroke();
    }
  }, [objects, activeTool, zoom, pan, layers, selectedId, canalDraft, outletDraft, snapPos]);

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
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

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
    } else if (activeTool === "outlet") {
      if (!outletDraft) {
        // find nearest canal
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
      // Hit test objects (reverse order = top first)
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      onSelect(hit ? hit.id : null);
    } else if (activeTool === "eraser") {
      const hit = hitTest(worldRaw.x, worldRaw.y, objects);
      if (hit) onAddObject("__delete__", { id: hit.id });
    }
  }, [activeTool, pan, zoom, objects, getSnappedWorld, onAddObject, onCanalPointAdd, onOutletStart, onOutletFinish, onSelect, outletDraft]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleDblClick = useCallback((e) => {
    if (activeTool === "canal") onCanalFinish();
  }, [activeTool, onCanalFinish]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.05, Math.min(20, zoom * factor));
    // Zoom toward mouse
    const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
    const newPanY = my - (my - pan.y) * (newZoom / zoom);
    onZoomChange(newZoom, { x: newPanX, y: newPanY });
  }, [zoom, pan, onZoomChange]);

  const cursorClass = {
    select: "cursor-default",
    pan: "cursor-grab",
    eraser: "cursor-cell",
    canal: "cursor-crosshair",
    outlet: "cursor-crosshair",
    acre: "cursor-crosshair",
    mustateel: "cursor-crosshair",
    muraba: "cursor-crosshair",
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
    } else if (o.type === "canal") {
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

  // Minor grid (acre)
  if (zoom > 0.3) {
    ctx.strokeStyle = COLORS.gridMinor;
    ctx.beginPath();
    for (let x = startX; x < endX; x += acreW) {
      ctx.moveTo(x, startY); ctx.lineTo(x, endY);
    }
    for (let y = startY; y < endY; y += acreH) {
      ctx.moveTo(startX, y); ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  // Major grid (mustateel)
  const mustW = ftToPx(DIMENSIONS.MUSTATEEL.width, 1);
  const mustH = ftToPx(DIMENSIONS.MUSTATEEL.height, 1);
  ctx.strokeStyle = COLORS.gridMajor;
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (let x = Math.floor(startX / mustW) * mustW; x < endX; x += mustW) {
    ctx.moveTo(x, startY); ctx.lineTo(x, endY);
  }
  for (let y = Math.floor(startY / mustH) * mustH; y < endY; y += mustH) {
    ctx.moveTo(startX, y); ctx.lineTo(endX, y);
  }
  ctx.stroke();
}

// ---- Object Drawing ----
function drawObjects(ctx, objects, zoom, selectedId, layers, canalDraft, outletDraft, snapPos) {
  // Sort: muraba -> mustateel -> acre -> canal -> outlet
  const order = ["muraba", "mustateel", "acre", "canal", "outlet"];
  const sorted = [...objects].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  for (const obj of sorted) {
    const layer = layers[obj.type] || { visible: true };
    if (!layer.visible) continue;

    const isSelected = obj.id === selectedId;

    if (obj.type === "acre") drawAcre(ctx, obj, isSelected, zoom);
    else if (obj.type === "mustateel") drawMustateel(ctx, obj, isSelected, zoom);
    else if (obj.type === "muraba") drawMuraba(ctx, obj, isSelected, zoom);
    else if (obj.type === "canal") {
      drawCanal(ctx, obj, isSelected, zoom);
      const grassLayer = layers["grass"] || { visible: true };
      if (grassLayer.visible) drawGrass(ctx, obj, zoom);
    }
    else if (obj.type === "outlet") drawOutlet(ctx, obj, isSelected, zoom);
  }

  // Canal draft
  if (canalDraft && canalDraft.length > 0) {
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.moveTo(canalDraft[0].x, canalDraft[0].y);
    for (let i = 1; i < canalDraft.length; i++) ctx.lineTo(canalDraft[i].x, canalDraft[i].y);
    if (snapPos) ctx.lineTo(snapPos.x, snapPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Draw draft points
    for (const pt of canalDraft) {
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4 / zoom, 0, Math.PI * 2);
      ctx.fill();
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

function drawAcre(ctx, obj, isSelected, zoom) {
  ctx.fillStyle = COLORS.acre.fill;
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.strokeStyle = isSelected ? COLORS.selected : COLORS.acre.stroke;
  ctx.lineWidth = (isSelected ? 2 : 1) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  if (zoom > 0.5) {
    ctx.fillStyle = COLORS.acre.text;
    ctx.font = `${Math.max(8, 11 / zoom)}px JetBrains Mono, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (obj.label) ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
  }
}

function drawMustateel(ctx, obj, isSelected, zoom) {
  ctx.fillStyle = COLORS.mustateel.fill;
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.strokeStyle = isSelected ? COLORS.mustateel.selectedStroke : COLORS.mustateel.stroke;
  ctx.lineWidth = (isSelected ? 2.5 : 1.5) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Killa grid lines
  if (zoom > 0.3) {
    ctx.strokeStyle = "rgba(245,158,11,0.25)";
    ctx.lineWidth = 0.5 / zoom;
    const cellW = obj.w / 2, cellH = obj.h / 5;
    // Vertical divider
    ctx.beginPath();
    ctx.moveTo(obj.x + cellW, obj.y);
    ctx.lineTo(obj.x + cellW, obj.y + obj.h);
    ctx.stroke();
    // Horizontal dividers
    ctx.beginPath();
    for (let r = 1; r < 5; r++) {
      ctx.moveTo(obj.x, obj.y + r * cellH);
      ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
    }
    ctx.stroke();

    // Killa numbers
    if (zoom > 0.5) {
      const grid = getMustateeelKillaGrid();
      ctx.fillStyle = COLORS.mustateel.text;
      ctx.font = `bold ${Math.max(7, 10 / zoom)}px Rajdhani, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
          const kx = obj.x + c * cellW + cellW / 2;
          const ky = obj.y + r * cellH + cellH / 2;
          ctx.fillText(String(grid[r][c]), kx, ky);
        }
      }
    }
  }

  // Label & owner
  if (zoom > 0.2 && obj.label) {
    ctx.fillStyle = "rgba(253,230,138,0.9)";
    ctx.font = `bold ${Math.max(8, 12 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + 4 / zoom);
  }
  if (zoom > 0.2 && obj.showOwner && obj.ownerName) {
    ctx.fillStyle = "rgba(253,230,138,0.7)";
    ctx.font = `${Math.max(7, 9 / zoom)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(obj.ownerName, obj.x + obj.w / 2, obj.y + obj.h - 4 / zoom);
  }
}

function drawMuraba(ctx, obj, isSelected, zoom) {
  ctx.fillStyle = COLORS.muraba.fill;
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.strokeStyle = isSelected ? COLORS.muraba.selectedStroke : COLORS.muraba.stroke;
  ctx.lineWidth = (isSelected ? 3 : 2) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // 5×5 killa grid
  if (zoom > 0.15) {
    ctx.strokeStyle = "rgba(249,115,22,0.2)";
    ctx.lineWidth = 0.5 / zoom;
    const cellW = obj.w / 5, cellH = obj.h / 5;
    ctx.beginPath();
    for (let c = 1; c < 5; c++) {
      ctx.moveTo(obj.x + c * cellW, obj.y);
      ctx.lineTo(obj.x + c * cellW, obj.y + obj.h);
    }
    for (let r = 1; r < 5; r++) {
      ctx.moveTo(obj.x, obj.y + r * cellH);
      ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
    }
    ctx.stroke();

    // Killa numbers
    if (zoom > 0.3) {
      const grid = getMurabaKillaGrid();
      ctx.fillStyle = COLORS.muraba.text;
      ctx.font = `bold ${Math.max(6, 9 / zoom)}px Rajdhani, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const kx = obj.x + c * cellW + cellW / 2;
          const ky = obj.y + r * cellH + cellH / 2;
          ctx.fillText(String(grid[r][c]), kx, ky);
        }
      }
    }
  }

  // Label
  if (zoom > 0.1 && obj.label) {
    ctx.fillStyle = "rgba(253,186,116,0.95)";
    ctx.font = `bold ${Math.max(9, 14 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + 5 / zoom);
  }
  if (zoom > 0.1 && obj.showOwner && obj.ownerName) {
    ctx.fillStyle = "rgba(253,186,116,0.7)";
    ctx.font = `${Math.max(7, 10 / zoom)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(obj.ownerName, obj.x + obj.w / 2, obj.y + obj.h - 5 / zoom);
  }
}

function drawCanal(ctx, obj, isSelected, zoom) {
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
  ctx.fillStyle = "rgba(59,130,246,0.25)";
  ctx.fill();

  // Canal walls
  ctx.strokeStyle = isSelected ? "#93c5fd" : COLORS.canal.line;
  ctx.lineWidth = (isSelected ? 2 : 1.5) / zoom;
  for (const side of [left, right]) {
    ctx.beginPath();
    ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Canal name
  if (obj.name && zoom > 0.3) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    ctx.save();
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#93c5fd";
    ctx.font = `bold ${Math.max(8, 11 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(obj.name, 0, -obj.width / 2 - 3 / zoom);
    ctx.restore();
  }
}

function drawGrass(ctx, obj, zoom) {
  if (obj.points.length < 2 || zoom < 0.4) return;
  const halfW = obj.width / 2 + 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);

  for (const side of [left, right]) {
    for (let i = 0; i < side.length - 1; i++) {
      const px = side[i].x, py = side[i].y;
      const nx = side[i + 1].x, ny = side[i + 1].y;
      const segLen = Math.hypot(nx - px, ny - py);
      const steps = Math.max(2, Math.floor(segLen / (6 / zoom)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const gx = px + (nx - px) * t;
        const gy = py + (ny - py) * t;
        ctx.fillStyle = COLORS.grass;
        ctx.font = `${Math.max(6, 8 / zoom)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🌿", gx, gy);
      }
    }
  }
}

function drawOutlet(ctx, obj, isSelected, zoom) {
  const scale = (obj.arrowScale || 1) / zoom;
  const sx = obj.start.x, sy = obj.start.y;
  const ex = obj.end.x, ey = obj.end.y;
  const angle = Math.atan2(ey - sy, ex - sx);
  const len = Math.hypot(ex - sx, ey - sy);

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);

  // Shaft
  ctx.strokeStyle = isSelected ? "#67e8f9" : COLORS.outlet.arrow;
  ctx.lineWidth = (isSelected ? 2.5 : 2) / zoom;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.stroke();

  // Arrowhead
  const headLen = 16 * scale;
  const headAngle = Math.PI / 5;
  ctx.fillStyle = isSelected ? "#67e8f9" : COLORS.outlet.arrow;
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(len - headLen * Math.cos(headAngle), -headLen * Math.sin(headAngle));
  ctx.lineTo(len - headLen * Math.cos(headAngle), headLen * Math.sin(headAngle));
  ctx.closePath();
  ctx.fill();

  // Label
  if (obj.label && zoom > 0.3) {
    ctx.fillStyle = COLORS.outlet.label;
    ctx.font = `bold ${Math.max(8, 11 / zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(obj.label, len / 2, -6 / zoom);
  }

  // Tail circle
  ctx.fillStyle = COLORS.outlet.arrow;
  ctx.beginPath();
  ctx.arc(0, 0, 4 / zoom, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}