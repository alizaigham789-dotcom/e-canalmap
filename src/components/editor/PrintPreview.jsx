import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, ZoomIn, ZoomOut, FileText } from "lucide-react";
import { getParallelPolyline, getMustateeelKillaGrid, getMurabaKillaGrid, DIMENSIONS, drawSmoothPath } from "@/lib/gisEngine";

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

function hexToRgbStr(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "239,68,68";
}

function getObjectsBounds(objects) {
  if (!objects || objects.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.w); maxY = Math.max(maxY, o.y + o.h);
    } else if (o.points?.length > 0) {
      for (const p of o.points) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    } else if (o.start && o.end) {
      minX = Math.min(minX, o.start.x, o.end.x); minY = Math.min(minY, o.start.y, o.end.y);
      maxX = Math.max(maxX, o.start.x, o.end.x); maxY = Math.max(maxY, o.start.y, o.end.y);
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// ─── SVG PATH HELPERS ─────────────────────────────────────────────────────────
function pointsToSmoothPath(points, tension = 0.4) {
  if (!points || points.length < 2) return "";
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 2;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 2;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 2;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 2;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function parallelSmoothClosedPath(pts, offset) {
  if (!pts || pts.length < 2) return "";
  const left = getParallelPolyline(pts, -offset);
  const right = getParallelPolyline(pts, offset);
  const rightRev = [...right].reverse();
  const leftPath = pointsToSmoothPath(left);
  const rightRevPart = pointsToSmoothPath(rightRev).replace(/^M[\d.,\s-]+/, "");
  return `${leftPath} L${rightRev[0].x},${rightRev[0].y} ${rightRevPart} Z`;
}

// ─── SVG OBJECT RENDERERS ─────────────────────────────────────────────────────
function svgMustateel(obj, C, idx, showKilla = true) {
  const cellW = obj.w / 2, cellH = obj.h / 5;
  const strokeColor = C.mustateelStroke || "#000000";
  const fontSize = Math.min(obj.w * 0.30, obj.h * 0.30);
  const killaGrid = getMustateeelKillaGrid();

  // Killa grid lines — solid, slightly thinner than boundary
  let gridLines = "";
  gridLines += `<line x1="${obj.x + cellW}" y1="${obj.y}" x2="${obj.x + cellW}" y2="${obj.y + obj.h}" stroke="${strokeColor}" stroke-width="1.2"/>`;
  for (let r = 1; r < 5; r++) {
    gridLines += `<line x1="${obj.x}" y1="${obj.y + r*cellH}" x2="${obj.x + obj.w}" y2="${obj.y + r*cellH}" stroke="${strokeColor}" stroke-width="1.2"/>`;
  }

  // Killa numbers — only if showKilla is true
  let killaLabels = "";
  if (showKilla) {
    const killaFontSize = Math.max(6, Math.min(cellW, cellH) * 0.28);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 2; c++) {
        killaLabels += `<text x="${obj.x + c*cellW + cellW/2}" y="${obj.y + r*cellH + cellH/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${killaFontSize}" fill="${strokeColor}" fill-opacity="0.75">${killaGrid[r][c]}</text>`;
      }
    }
  }

  const label = obj.label || "";
  const labelY = obj.y + obj.h / 2;

  return `
<g key="must_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" />
  ${gridLines}
  ${killaLabels}
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" stroke="${strokeColor}" stroke-width="220" stroke-linejoin="miter"/>
  ${label ? `<text x="${obj.x + obj.w/2}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}
</g>`;
}

function svgMuraba(obj, C, idx, showKilla = true) {
  const cellW = obj.w / 5, cellH = obj.h / 5;
  const strokeColor = C.murabaStroke || "#000000";
  const fontSize = Math.min(obj.w * 0.22, obj.h * 0.22);
  const killaGrid = getMurabaKillaGrid();

  let gridLines = "";
  for (let c = 1; c < 5; c++) {
    gridLines += `<line x1="${obj.x + c*cellW}" y1="${obj.y}" x2="${obj.x + c*cellW}" y2="${obj.y + obj.h}" stroke="${strokeColor}" stroke-width="1.2"/>`;
  }
  for (let r = 1; r < 5; r++) {
    gridLines += `<line x1="${obj.x}" y1="${obj.y + r*cellH}" x2="${obj.x + obj.w}" y2="${obj.y + r*cellH}" stroke="${strokeColor}" stroke-width="1.2"/>`;
  }

  let killaLabels = "";
  if (showKilla) {
    const killaFontSize = Math.max(5, Math.min(cellW, cellH) * 0.24);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        killaLabels += `<text x="${obj.x + c*cellW + cellW/2}" y="${obj.y + r*cellH + cellH/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${killaFontSize}" fill="${strokeColor}" fill-opacity="0.70">${killaGrid[r][c]}</text>`;
      }
    }
  }

  const label = obj.label || "";
  return `
<g key="murb_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" />
  ${gridLines}
  ${killaLabels}
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" stroke="${strokeColor}" stroke-width="6.5" stroke-linejoin="miter"/>
  ${label ? `<text x="${obj.x + obj.w/2}" y="${obj.y + obj.h/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}
</g>`;
}

function svgAcre(obj, C, idx) {
  const fillColor = obj.fillColor || C.acreFill || "rgba(234,179,8,0.08)";
  const strokeColor = C.acreStroke || "#eab308";
  const fontSize = Math.min(obj.w, obj.h) * 0.22;
  return `
<g key="acre_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"/>
  ${obj.label ? `<text x="${obj.x + obj.w/2}" y="${obj.y + obj.h/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${fontSize}" fill="${C.labelColor||'#1e293b'}">${obj.label}</text>` : ""}
</g>`;
}

function svgChakbandi(obj, C, idx, viewW) {
  if (!obj.points || obj.points.length < 2) return "";
  const color = C.chakbandiStroke || "#000000";
  // crossSize and spacing are in world units — 10× thicker for print clarity
  const crossSize = obj.crossSize || 60;
  const spacing = obj.crossSpacing || 80;

  const pts = obj.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  let crosses = "";
  for (let i = 0; i < obj.points.length - 1; i++) {
    const a = obj.points[i], b = obj.points[i+1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const steps = Math.max(1, Math.floor(segLen / spacing));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = a.x + (b.x - a.x) * t;
      const cy = a.y + (b.y - a.y) * t;
      // Exact same formula as GISRenderer.jsx drawChakbandi
      const x1 = (cx + (-crossSize*cos - -crossSize*sin)).toFixed(1);
      const y1 = (cy + (-crossSize*sin + -crossSize*cos)).toFixed(1);
      const x2 = (cx + ( crossSize*cos -  crossSize*sin)).toFixed(1);
      const y2 = (cy + ( crossSize*sin +  crossSize*cos)).toFixed(1);
      const x3 = (cx + ( crossSize*cos - -crossSize*sin)).toFixed(1);
      const y3 = (cy + ( crossSize*sin + -crossSize*cos)).toFixed(1);
      const x4 = (cx + (-crossSize*cos -  crossSize*sin)).toFixed(1);
      const y4 = (cy + (-crossSize*sin +  crossSize*cos)).toFixed(1);
      crosses += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="180" stroke-linecap="round"/>`;
      crosses += `<line x1="${x3}" y1="${y3}" x2="${x4}" y2="${y4}" stroke="${color}" stroke-width="180" stroke-linecap="round"/>`;
    }
  }

  const label = obj.name || "";
  const midPt = obj.points[Math.floor(obj.points.length/2)];

  return `<g>
  <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="300" stroke-linecap="round" stroke-linejoin="miter"/>
  ${crosses}
  ${label && midPt ? `<text x="${midPt.x.toFixed(1)}" y="${(midPt.y - 8).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="12" fill="${color}">${label}</text>` : ""}
</g>`;
}

function svgCanal(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const halfW = (obj.width || DIMENSIONS.CANAL_WIDTH) / 2;
  const fillPath = parallelSmoothClosedPath(obj.points, halfW);
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const fillColor = C.canalFill || "rgba(30,144,255,0.25)";
  const strokeColor = C.canalStroke || "#0284c7";
  return `
<g key="canal_${idx}">
  <path d="${fillPath}" fill="${fillColor}" />
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${obj.name ? `<text x="${obj.points[Math.floor(obj.points.length/2)].x}" y="${obj.points[Math.floor(obj.points.length/2)].y}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="14" fill="#dc2626">${obj.name}</text>` : ""}
</g>`;
}

function svgKhal(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const halfW = (obj.width || DIMENSIONS.KHAL_WIDTH) / 2;
  const fillPath = parallelSmoothClosedPath(obj.points, halfW);
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const color = C.khalStroke || "#2563eb";
  return `
<g key="khal_${idx}">
  <path d="${fillPath}" fill="${color}22" />
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;
}

function svgRoad(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const halfW = (obj.width || DIMENSIONS.ROAD_WIDTH) / 2;
  const fillPath = parallelSmoothClosedPath(obj.points, halfW);
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const color = C.roadStroke || "#b45309";
  const centerDash = pointsToSmoothPath(obj.points);
  return `
<g key="road_${idx}">
  <path d="${fillPath}" fill="#3a3a3a" />
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${centerDash}" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="10,6" stroke-linecap="round"/>
</g>`;
}

function svgMouza(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const pts = obj.points.map(p => `${p.x},${p.y}`).join(" ");
  return `<polyline key="mouza_${idx}" points="${pts}" fill="none" stroke="${C.mouzaStroke || '#000'}" stroke-width="1" stroke-dasharray="4,4"/>`;
}

// ─── MAIN SVG GENERATOR ───────────────────────────────────────────────────────
function buildSVG(objects, colorSettings, filterMoga, killaVisibility = {}) {
  const C = colorSettings || {};
  const bounds = getObjectsBounds(objects);
  if (!bounds) return null;

  const pad = 80;
  const viewX = bounds.minX - pad;
  const viewY = bounds.minY - pad;
  const viewW = (bounds.maxX - bounds.minX) + pad * 2;
  const viewH = (bounds.maxY - bounds.minY) + pad * 2;

  const showKillaMustateel = killaVisibility.mustateel !== false;
  const showKillaMuraba = killaVisibility.muraba !== false;

  // Filter objects by moga if needed
  const filtered = filterMoga
    ? objects.filter(o => {
        if (o.type === "chakbandi") return o.mogaNumber === filterMoga;
        if (o.type === "mustateel") return o.mogaNumber === filterMoga || !o.mogaNumber;
        return true;
      })
    : objects;

  const sorted = [...filtered].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));

  let svgParts = [];
  sorted.forEach((obj, idx) => {
    switch (obj.type) {
      case "mustateel": svgParts.push(svgMustateel(obj, C, idx, showKillaMustateel)); break;
      case "muraba":    svgParts.push(svgMuraba(obj, C, idx, showKillaMuraba)); break;
      case "acre":      svgParts.push(svgAcre(obj, C, idx)); break;
      case "chakbandi": svgParts.push(svgChakbandi(obj, C, idx, viewW)); break;
      case "canal":     svgParts.push(svgCanal(obj, C, idx)); break;
      case "khal":      svgParts.push(svgKhal(obj, C, idx)); break;
      case "road":      svgParts.push(svgRoad(obj, C, idx)); break;
      case "mouza":     svgParts.push(svgMouza(obj, C, idx)); break;
      default: break;
    }
  });

  return { svgBody: svgParts.join("\n"), viewX, viewY, viewW, viewH };
}

// ─── SLIDER HELPER ─────────────────────────────────────────────────────────────
function SettingSlider({ label, value, min, max, step, onChange, unit = "" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 whitespace-nowrap">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-20 h-1 accent-blue-400 cursor-pointer"
      />
      <span className="text-[10px] font-mono text-slate-300 w-8">{value}{unit}</span>
    </div>
  );
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────
export default function PrintPreview({ mapData, objects, colorSettings, onClose, selectedMogaFilter, killaVisibility = {} }) {
  const [scale, setScale] = useState(100);
  const [mogaFilter, setMogaFilter] = useState(selectedMogaFilter || "");
  const [bwMode, setBwMode] = useState(false);

  // Extract all mogas from objects
  const availableMogas = useMemo(() => {
    const s = new Set();
    for (const o of objects) {
      if ((o.type === "chakbandi" || o.type === "mustateel") && o.mogaNumber) s.add(o.mogaNumber);
    }
    return [...s].sort((a, b) => parseInt(a) - parseInt(b));
  }, [objects]);

  // In B&W mode, override all colors to black/grey
  const effectiveColors = useMemo(() => {
    if (!bwMode) return colorSettings || {};
    return {
      mustateelStroke: "#000000", mustateelFill: "none",
      murabaStroke: "#000000", murabaFill: "none",
      acreStroke: "#555555", acreFill: "none",
      canalStroke: "#333333", canalFill: "rgba(0,0,0,0.08)",
      khalStroke: "#444444",
      roadStroke: "#222222",
      chakbandiStroke: "#000000",
      mouzaStroke: "#000000",
      labelColor: "#000000",
      outletStroke: "#333333",
    };
  }, [bwMode, colorSettings]);

  const svgData = useMemo(
    () => buildSVG(objects, effectiveColors, mogaFilter || null, killaVisibility),
    [objects, effectiveColors, mogaFilter, killaVisibility]
  );

  const svgString = svgData
    ? `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}"
     width="${svgData.viewW}" height="${svgData.viewH}">
  <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
  ${svgData.svgBody}
</svg>`
    : null;

  // Inline SVG markup for preview (preserves exact vector scaling)
  const inlineSvgMarkup = svgData
    ? `<rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>${svgData.svgBody}`
    : null;

  // ─── VECTOR PRINT ─────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!svgData) return;
    const title = `${mapData?.title || "Chakbandi Map"}${mogaFilter ? ` — Moga ${mogaFilter}` : ""}`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${title}</title>
      <style>
        @page { margin: 8mm; size: A4 landscape; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; font-family: Rajdhani, Arial, sans-serif; }
        .header { border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; }
        .title { font-size:18px; font-weight:bold; text-transform:uppercase; letter-spacing:2px; }
        .map-wrap { width:100%; }
        .map-wrap svg { width:100%; height:auto; display:block; }
        .footer { border-top:1px solid #aaa; margin-top:6px; padding-top:5px; display:flex; justify-content:space-between; font-size:9px; color:#555; }
        .legend { display:flex; gap:12px; flex-wrap:wrap; }
        .li { display:flex; align-items:center; gap:4px; font-size:9px; }
        .lb { display:inline-block; width:20px; height:3px; border-radius:1px; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="title">CHAKBANDI GIS — ${title}</div>
          <div style="font-size:10px;color:#444;margin-top:2px;">
            ${mapData?.village ? `Village: <b>${mapData.village}</b>` : ""}
            ${mapData?.tehsil ? ` | Sub Division: <b>${mapData.tehsil}</b>` : ""}
            ${mapData?.district ? ` | Division: <b>${mapData.district}</b>` : ""}
            ${mogaFilter ? ` | <b>Moga ${mogaFilter}</b>` : ""}
          </div>
        </div>
        <div style="font-size:10px;color:#555;text-align:right;">
          Status: <b>${(mapData?.status||"draft").toUpperCase()}</b><br/>
          Date: ${new Date().toLocaleDateString()}<br/>
          Parcels: ${mapData?.total_parcels || 0}
        </div>
      </div>
      <div class="map-wrap">
        <svg xmlns="http://www.w3.org/2000/svg"
             viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}"
             style="width:100%;height:auto;display:block;">
          <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
          ${svgData.svgBody}
        </svg>
      </div>
      <div class="footer">
        <div class="legend">
          <div class="li"><span class="lb" style="background:#ef4444"></span>Mustateel/Muraba</div>
          <div class="li"><span class="lb" style="background:#eab308"></span>Acre</div>
          <div class="li"><span class="lb" style="background:#3b82f6"></span>Canal</div>
          <div class="li"><span class="lb" style="background:#22c55e"></span>Chakbandi</div>
          <div class="li"><span class="lb" style="background:#06b6d4"></span>Outlet</div>
        </div>
        <div>Vector SVG | Chakbandi GIS | 1 Killa = 220×198 ft</div>
      </div>
    </body></html>`);
    win.document.close();
    win.onload = () => win.print();
  };

  // ─── SVG DOWNLOAD ────────────────────────────────────────────────────────────
  const handleDownloadSVG = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mapData?.title || "map"}${mogaFilter ? `_moga_${mogaFilter}` : ""}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1420] border border-slate-700 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Printer className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white font-heading tracking-wider">VECTOR PRINT PREVIEW</span>
            <span className="text-xs text-slate-500">{mapData?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white"
                onClick={() => setScale(s => Math.max(25, s - 10))}><ZoomOut className="w-3 h-3" /></Button>
              <span className="text-xs text-slate-300 font-mono w-10 text-center">{scale}%</span>
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white"
                onClick={() => setScale(s => Math.min(200, s + 10))}><ZoomIn className="w-3 h-3" /></Button>
            </div>
            {/* B&W Toggle */}
            <button
              onClick={() => setBwMode(v => !v)}
              className={`h-8 px-3 rounded-md text-xs font-bold border transition-all ${bwMode ? "bg-white text-black border-white" : "bg-slate-800 text-slate-300 border-slate-600 hover:text-white"}`}
              title="Black & White Mode"
            >
              {bwMode ? "🎨 Colour" : "⬛ B&W"}
            </button>
            {/* SVG Download */}
            <Button size="sm" variant="outline"
              className="h-8 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-xs gap-1"
              onClick={handleDownloadSVG}>
              <FileText className="w-3.5 h-3.5" /> SVG
            </Button>
            {/* Print */}
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-white" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Moga filter bar */}
        <div className="flex items-center gap-3 px-5 py-2 bg-slate-900 border-b border-slate-700 flex-wrap">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono shrink-0">Print Mode</span>
          <button
            onClick={() => setMogaFilter("")}
            className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${!mogaFilter ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            Full Map
          </button>
          {availableMogas.map(m => (
            <button key={m}
              onClick={() => setMogaFilter(mogaFilter === m ? "" : m)}
              className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${mogaFilter === m ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              Moga {m}
            </button>
          ))}
          {availableMogas.length === 0 && (
            <span className="text-[10px] text-slate-500 italic">
              Assign Moga Numbers to Chakbandi lines to enable single-Moga printing
            </span>
          )}
          <span className="text-[9px] text-green-500 ml-auto font-mono">⬡ Vector SVG — Sharp at any scale</span>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex items-start justify-center">
          <div className="bg-white shadow-2xl" style={{ width: `${scale}%`, minWidth: 500 }}>
            {/* Map header */}
            <div style={{ padding:"10px 14px", borderBottom:"2px solid #000", display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:"bold", textTransform:"uppercase", letterSpacing:2, fontFamily:"Rajdhani,Arial,sans-serif" }}>
                  CHAKBANDI GIS — {mapData?.title || "Cadastral Map"}
                  {mogaFilter && <span style={{ color:"#16a34a", marginLeft:8 }}>| Moga {mogaFilter}</span>}
                </div>
                <div style={{ fontSize:10, color:"#444", marginTop:2 }}>
                  {mapData?.village && `Village: ${mapData.village}`}
                  {mapData?.tehsil && ` | Sub Division: ${mapData.tehsil}`}
                  {mapData?.district && ` | Division: ${mapData.district}`}
                </div>
              </div>
              <div style={{ fontSize:10, color:"#555", textAlign:"right" }}>
                <div>Status: <b>{(mapData?.status||"draft").toUpperCase()}</b></div>
                <div>Date: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* SVG Map — pure inline vector (no img tag, preserves cross sizes exactly) */}
            {inlineSvgMarkup ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}`}
                style={{ width:"100%", display:"block" }}
                dangerouslySetInnerHTML={{ __html: inlineSvgMarkup }}
              />
            ) : (
              <div style={{ padding:40, textAlign:"center", color:"#999" }}>No objects to print</div>
            )}

            {/* Footer legend */}
            <div style={{ padding:"6px 14px", borderTop:"1px solid #bbb", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {[["Mustateel","#ef4444"],["Acre","#eab308"],["Canal","#3b82f6"],["Chakbandi","#22c55e"],["Road","#b45309"]].map(([label,color]) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:4, fontSize:9, color:"#333" }}>
                    <span style={{ display:"inline-block", width:18, height:3, background:color, borderRadius:1 }}></span>{label}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:9, color:"#777" }}>Vector SVG | Survey-grade Cadastral | Chakbandi GIS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}