import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, ZoomIn, ZoomOut, FileText } from "lucide-react";
import { getParallelPolyline, getMustateeelKillaGrid, getMurabaKillaGrid, DIMENSIONS, drawSmoothPath, CHAKBANDI_SCALE, MUSTATEEL_SCALE, getMustateelMouzaSplit, getMogaColor, calculateTotalGCA, calculateChakbandiGCA, buildPrintFooterHTML, buildPrintHeaderHTML, canalLength, mogaNumberFont, canalNameFont, PAGE_SIZES } from "@/lib/gisEngine";
import PrintHeaderBox from "@/components/editor/PrintHeaderBox";
import { svgCanalNameOnPath, svgMogaFraction, svgMogaFractionBox, svgCCAGCAFractionBox, chakbandiLabelPosition, getOutletLabelPos, getChakbandiLabelPos, getCCAGCAText, buildLegendSVG } from "@/lib/printRenderHelpers";
import { Move } from "lucide-react";

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
function svgMustateel(obj, C, idx, showKilla = true, mouzaSplit = null) {
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

  let labelSvg;
  if (mouzaSplit) {
    const splitFont = Math.min(obj.w, obj.h) * 0.26;
    const lbl2 = obj.label2 || "";
    labelSvg = `${label ? `<text x="${mouzaSplit.centerA.x}" y="${mouzaSplit.centerA.y}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${splitFont}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}${lbl2 ? `<text x="${mouzaSplit.centerB.x}" y="${mouzaSplit.centerB.y}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${splitFont}" fill="${C.labelColor||'#1e293b'}">${lbl2}</text>` : ""}`;
  } else {
    const mogaNumSvg = obj.mogaNumber ? `<text x="${obj.x + 4}" y="${obj.y + 4}" text-anchor="start" dominant-baseline="hanging" font-family="'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${fontSize}" fill="${getMogaColor(C.labelColor)}">مو${obj.mogaNumber}</text>` : "";
    labelSvg = `${mogaNumSvg}${label ? `<text x="${obj.x + obj.w/2}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}`;
  }

  return `
<g key="must_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" />
  ${gridLines}
  ${killaLabels}
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" stroke="${strokeColor}" stroke-width="${MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness)}" stroke-linejoin="miter"/>
  ${labelSvg}
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
  const lineW = CHAKBANDI_SCALE.lineWidth(obj.lineThickness);
  const crossW = lineW * 0.6;
  const crossSize = CHAKBANDI_SCALE.crossSize(obj.crossSize);
  const spacing = CHAKBANDI_SCALE.crossSpacing(obj.crossSpacing);

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
      crosses += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${crossW}" stroke-linecap="round"/>`;
      crosses += `<line x1="${x3}" y1="${y3}" x2="${x4}" y2="${y4}" stroke="${color}" stroke-width="${crossW}" stroke-linecap="round"/>`;
    }
  }

  const label = obj.name || "";
  const midPt = obj.points[Math.floor(obj.points.length/2)];

  return `<g>
  <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="miter"/>
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
  // Canal name inside the canal — text on path, bright yellow + dark outline
  // Font = mustateel label font + 2 points
  const cf = canalNameFont();
  const nameSvg = obj.name ? svgCanalNameOnPath(obj.points, obj.name, cf) : "";
  return `
<g key="canal_${idx}">
  <path d="${fillPath}" fill="${fillColor}" />
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${nameSvg}
</g>`;
}

function svgKhal(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const halfW = (obj.width || DIMENSIONS.KHAL_WIDTH) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const color = C.khalStroke || "#2563eb";
  // Straight polylines (no smooth curve — matches editor exactly)
  const leftPts = left.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const rightPts = right.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // Closed fill path — straight segments
  const fillPts = [...left, ...[...right].reverse()].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // Flow arrow at the ending point — 5× size, head at end, tail behind
  const last = obj.points[obj.points.length - 1];
  let prev = obj.points[0];
  for (let i = obj.points.length - 2; i >= 0; i--) {
    const p = obj.points[i];
    if (Math.hypot(last.x - p.x, last.y - p.y) > halfW * 2) { prev = p; break; }
  }
  const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
  const aLen = halfW * 12.5;   // 5× original
  const aW = halfW * 5;        // 5× tail width
  const p1x = (last.x - aLen * Math.cos(ang) - aW * Math.sin(ang)).toFixed(1);
  const p1y = (last.y - aLen * Math.sin(ang) + aW * Math.cos(ang)).toFixed(1);
  const p2x = (last.x - aLen * Math.cos(ang) + aW * Math.sin(ang)).toFixed(1);
  const p2y = (last.y - aLen * Math.sin(ang) - aW * Math.cos(ang)).toFixed(1);
  return `
<g key="khal_${idx}">
  <polygon points="${fillPts}" fill="${color}22" />
  <polyline points="${leftPts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${rightPts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <polygon points="${last.x.toFixed(1)},${last.y.toFixed(1)} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}"/>
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

function svgOutlet(obj, C, idx) {
  if (!obj.start || !obj.end) return "";
  const color = obj.outletColor || C.outletStroke || "#06b6d4";
  const size = DIMENSIONS.CANAL_WIDTH * 10;
  const half = size / 2;
  const { x: sx, y: sy } = obj.start;
  const { x: ex, y: ey } = obj.end;
  const angle = Math.atan2(ey - sy, ex - sx);
  const headLen = size * 1.6, headW = size;
  const h1x = (ex - headLen * Math.cos(angle) - headW * Math.sin(angle)).toFixed(1);
  const h1y = (ey - headLen * Math.sin(angle) + headW * Math.cos(angle)).toFixed(1);
  const h2x = (ex - headLen * Math.cos(angle) + headW * Math.sin(angle)).toFixed(1);
  const h2y = (ey - headLen * Math.sin(angle) - headW * Math.cos(angle)).toFixed(1);
  // Moga number — fraction inside a square box at labelPos (draggable)
  const numFont = mogaNumberFont();
  const lp = getOutletLabelPos(obj);
  const numLabel = svgMogaFractionBox(obj.mogha_number, obj.mogha_side, lp.x, lp.y, numFont, "rgba(120,225,245,0.92)", "#4a6772");
  return `<g key="outlet_${idx}">
    <rect x="${(sx - half).toFixed(1)}" y="${(sy - half).toFixed(1)}" width="${size}" height="${size}" fill="${color}" stroke="#0e7490" stroke-width="1"/>
    <line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${color}" stroke-width="${(size * 0.25).toFixed(1)}" stroke-linecap="round"/>
    <polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${h1x},${h1y} ${h2x},${h2y}" fill="${color}"/>
    ${numLabel}
  </g>`;
}

function svgMouza(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const pts = obj.points.map(p => `${p.x},${p.y}`).join(" ");
  const mouzaWidth = (CHAKBANDI_SCALE.lineWidth() * 5) / 3; // 3× thinner
  return `<polyline key="mouza_${idx}" points="${pts}" fill="none" stroke="${C.mouzaStroke || '#000'}" stroke-width="${mouzaWidth}" stroke-linecap="round" stroke-dasharray="25,12"/>`;
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
  const mouzaObjects = objects.filter(o => o.type === "mouza");

  let svgParts = [];
  sorted.forEach((obj, idx) => {
    switch (obj.type) {
      case "mustateel": svgParts.push(svgMustateel(obj, C, idx, showKillaMustateel, getMustateelMouzaSplit(obj, mouzaObjects))); break;
      case "muraba":    svgParts.push(svgMuraba(obj, C, idx, showKillaMuraba)); break;
      case "acre":      svgParts.push(svgAcre(obj, C, idx)); break;
      case "chakbandi": svgParts.push(svgChakbandi(obj, C, idx, viewW)); break;
      case "canal":     svgParts.push(svgCanal(obj, C, idx)); break;
      case "khal":      svgParts.push(svgKhal(obj, C, idx)); break;
      case "road":      svgParts.push(svgRoad(obj, C, idx)); break;
      case "mouza":     svgParts.push(svgMouza(obj, C, idx)); break;
      case "outlet":    svgParts.push(svgOutlet(obj, C, idx)); break;
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
export default function PrintPreview({ mapData, objects, colorSettings, onClose, selectedMogaFilter, killaVisibility = {}, pageBorderStyle = "none" }) {
  const [scale, setScale] = useState(100);
  const [mogaFilter, setMogaFilter] = useState(selectedMogaFilter || "");
  const [bwMode, setBwMode] = useState(false);
  const [pageOrientation, setPageOrientation] = useState("landscape");
  const [pageSize, setPageSize] = useState("A4");
  const [showLegendInPrint, setShowLegendInPrint] = useState(true);
  const [showPageBorder, setShowPageBorder] = useState(false);
  const [legendCustomPos, setLegendCustomPos] = useState(null); // null = auto; {x, y} in SVG coords
  const [legendMoveMode, setLegendMoveMode] = useState(false);
  const legendDragRef = useRef(null);
  const svgWrapRef = useRef(null);

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

  // Convert screen coordinates to SVG world coordinates (must be after svgData)
  const screenToSVG = useCallback((clientX, clientY) => {
    if (!svgWrapRef.current || !svgData) return null;
    const svgEl = svgWrapRef.current.querySelector("svg");
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const wx = svgData.viewX + (sx / rect.width) * svgData.viewW;
    const wy = svgData.viewY + (sy / rect.height) * svgData.viewH;
    return { x: wx, y: wy };
  }, [svgData]);

  const handlePreviewClick = useCallback((e) => {
    if (!legendMoveMode) return;
    const pos = screenToSVG(e.clientX, e.clientY);
    if (pos) {
      setLegendCustomPos(pos);
      setLegendMoveMode(false);
    }
  }, [legendMoveMode, screenToSVG]);

  // Auto-calculate CCA/GCA per chakbandi — use user's centerLabel if entered
  const gcaData = useMemo(() => {
    const mustateels = objects.filter(o => o.type === "mustateel");
    const canals = objects.filter(o => o.type === "canal");
    const chakbandis = objects.filter(o => o.type === "chakbandi");
    const results = [];
    let total = 0;
    for (const ch of chakbandis) {
      if (ch.points?.length >= 3) {
        const gca = calculateChakbandiGCA(ch, mustateels, canals);
        if (gca > 0 || ch.centerLabel) {
          const lp = getChakbandiLabelPos(ch);
          if (!lp) continue;
          const { cca, gca: gcaTxt } = getCCAGCAText(ch, gca);
          results.push({ x: lp.x, y: lp.y, cca, gca: gcaTxt });
          total += gca;
        }
      }
    }
    return { results, total };
  }, [objects]);

  // CCA/GCA fraction labels for SVG preview/export
  const gcaSvgLabels = useMemo(() => {
    if (!gcaData.results.length) return "";
    const ch = effectiveColors.chakbandiStroke || "#166534";
    const lblFont = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30;
    return gcaData.results.map(({ x, y, cca, gca }) =>
      svgCCAGCAFractionBox(cca, gca, x, y, lblFont, "rgba(255,255,255,0.94)", ch)
    ).join("");
  }, [gcaData, effectiveColors]);

  const legendSVG = showLegendInPrint ? buildLegendSVG(svgData?.viewX, svgData?.viewY, svgData?.viewW, svgData?.viewH, effectiveColors, getObjectsBounds(objects), legendCustomPos) : "";

  const svgString = svgData
    ? `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}"
     width="${svgData.viewW}" height="${svgData.viewH}">
  <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
  ${svgData.svgBody}
  ${gcaSvgLabels}
  ${legendSVG}
</svg>`
    : null;

  const inlineSvgMarkup = svgData
    ? `<rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>${svgData.svgBody}${gcaSvgLabels}${legendSVG}`
    : null;

  // ─── VECTOR PRINT — single page, Urdu header ─────────────────────────────────
  const handlePrint = () => {
    if (!svgData) return;
    const totalGCA = calculateTotalGCA(objects);
    const headerHTML = buildPrintHeaderHTML(mapData);
    const footerHTML = buildPrintFooterHTML(mapData);

    // Auto-calculated CCA/GCA for each chakbandi — use user's centerLabel if entered,
    // positioned ABOVE the chakbandi boundary (not at centroid)
    const mustateels = objects.filter(o => o.type === "mustateel");
    const canals = objects.filter(o => o.type === "canal");
    const chakbandis = objects.filter(o => o.type === "chakbandi");
    const lblFont = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30;
    let gcaLabels = "";
    for (const ch of chakbandis) {
      if (ch.points?.length >= 3) {
        const gca = calculateChakbandiGCA(ch, mustateels, canals);
        if (gca > 0 || ch.centerLabel) {
          const lp = getChakbandiLabelPos(ch);
          if (!lp) continue;
          const { cca, gca: gcaTxt } = getCCAGCAText(ch, gca);
          if (cca || gcaTxt) {
            gcaLabels += svgCCAGCAFractionBox(cca, gcaTxt, lp.x, lp.y, lblFont, "rgba(255,255,255,0.94)", effectiveColors.chakbandiStroke || "#166534");
          }
        }
      }
    }

    const win = window.open("", "_blank");
    if (!win) { return; }
    const printLegendSVG = showLegendInPrint ? buildLegendSVG(svgData.viewX, svgData.viewY, svgData.viewW, svgData.viewH, effectiveColors, getObjectsBounds(objects), legendCustomPos) : "";
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Khaka Dasti</title>
      <style>
        @font-face { font-family: 'Jameel Noori Nastaleeq'; src: url('https://cdn.jsdelivr.net/gh/tariq-abdullah/urdu-web-font-CDN/JameelNooriNastaleeq.woff') format('woff'); font-display: swap; }
        @page { margin: 6mm; size: ${pageSize} ${pageOrientation}; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; overflow:hidden; background:#fff; font-family: Rajdhani, Arial, sans-serif; }
        body { display: flex; flex-direction: column;${showPageBorder ? ` border:2px solid #3b82f6;` : ""} }
        .map-wrap { flex: 1; min-height: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .map-wrap svg { max-width:100%; max-height:100%; width:auto; height:auto; display:block; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      </style>
    </head><body>
      ${headerHTML}
      <div class="map-wrap">
        <svg xmlns="http://www.w3.org/2000/svg"
             viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}"
             preserveAspectRatio="xMidYMid meet"
             style="max-width:100%;max-height:100%;display:block;">
          <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
          ${svgData.svgBody}
          ${gcaLabels}
          ${printLegendSVG}
        </svg>
      </div>
      ${footerHTML}
    </body></html>`);
    win.document.close();
    win.onload = () => { setTimeout(() => win.print(), 500); };
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Printer className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-slate-800 font-heading tracking-wider">PRINT PREVIEW</span>
            <span className="text-xs text-slate-500">{mapData?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-slate-800"
                onClick={() => setScale(s => Math.max(25, s - 10))}><ZoomOut className="w-3 h-3" /></Button>
              <span className="text-xs text-slate-700 font-mono w-10 text-center">{scale}%</span>
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-500 hover:text-slate-800"
                onClick={() => setScale(s => Math.min(200, s + 10))}><ZoomIn className="w-3 h-3" /></Button>
            </div>
            {/* B&W Toggle */}
            <button
              onClick={() => setBwMode(v => !v)}
              className={`h-8 px-3 rounded-md text-xs font-bold border transition-all ${bwMode ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}
              title="Black & White Mode"
            >
              {bwMode ? "🎨 Colour" : "⬛ B&W"}
            </button>
            {/* SVG Download */}
            <Button size="sm" variant="outline"
              className="h-8 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs gap-1"
              onClick={handleDownloadSVG}>
              <FileText className="w-3.5 h-3.5" /> SVG
            </Button>
            {/* Page size */}
            <select
              value={pageSize}
              onChange={e => setPageSize(e.target.value)}
              className="h-8 bg-white border border-slate-300 rounded-lg text-[10px] text-slate-700 px-2 font-bold cursor-pointer"
              title="Page Size"
            >
              {["A4", "A3", "A2", "A1", "A0"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Page orientation */}
            <div className="flex items-center bg-white rounded-lg overflow-hidden border border-slate-300">
              <button
                onClick={() => setPageOrientation("landscape")}
                className={`px-2 h-8 text-[10px] font-bold transition-all ${pageOrientation === "landscape" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-800"}`}
              >
                ⬌ Landscape
              </button>
              <button
                onClick={() => setPageOrientation("portrait")}
                className={`px-2 h-8 text-[10px] font-bold transition-all ${pageOrientation === "portrait" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-800"}`}
              >
                ⬍ Portrait
              </button>
            </div>
            {/* Print */}
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-700" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Moga filter bar */}
        <div className="flex items-center gap-3 px-5 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono shrink-0">Print Mode</span>
          <button
            onClick={() => setMogaFilter("")}
            className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${!mogaFilter ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"}`}
          >
            Full Map
          </button>
          {availableMogas.map(m => (
            <button key={m}
              onClick={() => setMogaFilter(mogaFilter === m ? "" : m)}
              className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${mogaFilter === m ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"}`}
            >
              Moga {m}
            </button>
          ))}
          {availableMogas.length === 0 && (
            <span className="text-[10px] text-slate-400 italic">
              Assign Moga Numbers to Chakbandi lines to enable single-Moga printing
            </span>
          )}
          {/* Legend toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={showLegendInPrint} onChange={e => setShowLegendInPrint(e.target.checked)}
              className="w-3 h-3 accent-blue-500" />
            <span className="text-[10px] text-slate-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>علامات دکھائیں</span>
          </label>
          {/* Page border toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={showPageBorder} onChange={e => setShowPageBorder(e.target.checked)}
              className="w-3 h-3 accent-blue-500" />
            <span className="text-[10px] text-slate-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>پیج باکس</span>
          </label>
          {showLegendInPrint && (
            <>
              <button
                onClick={() => setLegendMoveMode(v => !v)}
                className={`text-[10px] px-2 py-1 rounded font-medium transition-all ${legendMoveMode ? "bg-green-600 text-white animate-pulse" : "bg-blue-600 text-white hover:bg-blue-500"}`}
                title="Click then click on map to place legend"
              >
                <Move className="w-3 h-3 inline mr-1" />
                {legendMoveMode ? "Click on map…" : "Move Legend"}
              </button>
              {legendCustomPos !== null && (
                <button
                  onClick={() => setLegendCustomPos(null)}
                  className="text-[10px] px-2 py-1 rounded font-medium bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
                  title="Reset legend position to auto"
                >
                  Auto
                </button>
              )}
            </>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-100 p-6 flex items-start justify-center">
          <div
            ref={svgWrapRef}
            className={`bg-white shadow-2xl relative ${legendMoveMode ? "cursor-crosshair ring-4 ring-green-400/50" : ""}`}
            style={{ width: `${scale}%`, minWidth: 500, border: showPageBorder ? `2px solid #3b82f6` : "none" }}
            onClick={handlePreviewClick}
          >
            <PrintHeaderBox mapData={mapData} />
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

            {/* Footer info */}
            <div style={{ padding:"6px 14px", borderTop:"1px solid #bbb", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6, fontSize:9, color:"#777" }}>
            </div>
            {/* Signature footer — مرتب کنندہ / ضلعدار at the end */}
            <div dangerouslySetInnerHTML={{ __html: buildPrintFooterHTML(mapData) }} />
          </div>
        </div>
      </div>
    </div>
  );
}