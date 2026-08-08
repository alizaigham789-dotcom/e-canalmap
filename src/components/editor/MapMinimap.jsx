import React, { useRef, useEffect, useCallback } from "react";

// Small overview preview of the whole map with a viewport rectangle.
// Sits in a bottom corner so a lost/scrolled-away map can be located and
// re-centered with a single click or drag.
//
// Props:
//   objects       — current map objects (world coordinates)
//   zoom, pan      — current main-canvas viewport
//   mainCanvasRef — ref to GISCanvas (exposes getCanvas()) so we can read
//                   the main canvas pixel size and compute the viewport rect
//   onNavigate    — (pan) => void  — called with a new pan to re-center
//   colorSettings — for consistent object colors

const MINI_W = 116;
const MINI_H = 82;
const PAD = 8;

// Simplified color palette for the minimap (keeps it readable at small size)
const TYPE_COLOR = {
  acre: "#eab308",
  mustateel: "#ef4444",
  muraba: "#f97316",
  canal: "#2B7AB8",
  khal: "#2563eb",
  road: "#b45309",
  chakbandi: "#22c55e",
  mouza: "#000000",
  outlet: "#06b6d4",
  damageMarker: "#dc2626",
};

// Collect all world points from an object (for bounds + drawing)
function objPoints(obj) {
  if (obj.x !== undefined && obj.w !== undefined) {
    return [
      { x: obj.x, y: obj.y },
      { x: obj.x + obj.w, y: obj.y + obj.h },
    ];
  }
  if (Array.isArray(obj.points) && obj.points.length) return obj.points;
  if (obj.start && obj.end) return [obj.start, obj.end];
  return [];
}

function worldBounds(objects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    for (const p of objPoints(o)) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

export default function MapMinimap({ objects, zoom, pan, mainCanvasRef, onNavigate, colorSettings }) {
  const canvasRef = useRef(null);
  const dragRef = useRef(false);
  const transformRef = useRef(null); // { scale, offX, offY } world→mini

  // Draw the minimap whenever objects / viewport change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    // Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    const bounds = worldBounds(objects);
    if (!bounds) {
      transformRef.current = null;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No objects", W / 2, H / 2);
      return;
    }

    const bw = Math.max(1, bounds.maxX - bounds.minX);
    const bh = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
    // Center the content
    const offX = (W - bw * scale) / 2 - bounds.minX * scale;
    const offY = (H - bh * scale) / 2 - bounds.minY * scale;
    transformRef.current = { scale, offX, offY };

    const w2m = (wx, wy) => ({ x: wx * scale + offX, y: wy * scale + offY });

    // Draw objects
    for (const obj of objects) {
      const color = (colorSettings && obj.type === "chakbandi" && colorSettings.chakbandiStroke) || TYPE_COLOR[obj.type] || "#64748b";
      ctx.strokeStyle = color;
      ctx.fillStyle = color + "22"; // light fill
      ctx.lineWidth = 1;

      if (obj.x !== undefined && obj.w !== undefined) {
        const a = w2m(obj.x, obj.y);
        const b = w2m(obj.x + obj.w, obj.y + obj.h);
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      } else if (Array.isArray(obj.points) && obj.points.length >= 2) {
        ctx.beginPath();
        const p0 = w2m(obj.points[0].x, obj.points[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < obj.points.length; i++) {
          const p = w2m(obj.points[i].x, obj.points[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.lineWidth = obj.type === "chakbandi" ? 1.5 : 1.2;
        ctx.stroke();
      } else if (obj.start && obj.end) {
        const a = w2m(obj.start.x, obj.start.y);
        const b = w2m(obj.end.x, obj.end.y);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else if (Array.isArray(obj.points) && obj.points.length === 1) {
        const p = w2m(obj.points[0].x, obj.points[0].y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw the current viewport rectangle
    const main = mainCanvasRef?.current?.getCanvas?.();
    if (main && zoom) {
      const mw = main.clientWidth;
      const mh = main.clientHeight;
      // World coords of the viewport
      const vLeft = -pan.x / zoom;
      const vTop = -pan.y / zoom;
      const vW = mw / zoom;
      const vH = mh / zoom;
      const a = w2m(vLeft, vTop);
      const b = w2m(vLeft + vW, vTop + vH);
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.setLineDash([]);
      // Semi-transparent fill so the viewport is obvious even when off-content
      ctx.fillStyle = "rgba(37,99,235,0.10)";
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
  }, [objects, zoom, pan, colorSettings]);

  // Convert a minimap mouse event to world coordinates, then re-center the main canvas
  const navigateTo = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const t = transformRef.current;
    const main = mainCanvasRef?.current?.getCanvas?.();
    if (!canvas || !t || !main) return;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    // mini → world
    const wx = (mx - t.offX) / t.scale;
    const wy = (my - t.offY) / t.scale;
    // Re-center: world point should map to the center of the main canvas
    const mw = main.clientWidth;
    const mh = main.clientHeight;
    onNavigate({ x: mw / 2 - wx * zoom, y: mh / 2 - wy * zoom });
  }, [zoom, onNavigate, mainCanvasRef]);

  const handleDown = (e) => {
    e.preventDefault();
    dragRef.current = true;
    navigateTo(e.clientX, e.clientY);
  };
  const handleMove = (e) => {
    if (!dragRef.current) return;
    navigateTo(e.clientX, e.clientY);
  };
  const handleUp = () => { dragRef.current = false; };

  // Touch support
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    dragRef.current = true;
    const t = e.touches[0];
    navigateTo(t.clientX, t.clientY);
  };
  const handleTouchMove = (e) => {
    if (!dragRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    navigateTo(t.clientX, t.clientY);
  };
  const handleTouchEnd = () => { dragRef.current = false; };

  return (
    <div
      className="absolute bottom-2 right-2 z-20 rounded-lg overflow-hidden shadow-lg border border-slate-300 bg-white/95 backdrop-blur-sm"
      title="Map preview — click or drag to re-center"
    >
      <canvas
        ref={canvasRef}
        width={MINI_W}
        height={MINI_H}
        style={{ width: MINI_W, height: MINI_H, display: "block", cursor: "pointer", touchAction: "none" }}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <div className="absolute top-0.5 left-1 text-[8px] text-slate-400 font-mono pointer-events-none leading-none bg-white/70 px-1 rounded">
        Preview
      </div>
    </div>
  );
}