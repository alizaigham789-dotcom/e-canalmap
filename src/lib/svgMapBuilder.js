// ============================================================
// SVG MAP BUILDER — Shared SVG rendering for print/export
// Extracted from PrintPreview.jsx so bulk print can reuse it
// ============================================================

import {
  getParallelPolyline, getMustateeelKillaGrid, getMustateelKillaCells, getMurabaKillaGrid, getMurabaKillaCells,
  getKanalBoxes, getExcludedKanals,
  DIMENSIONS, CHAKBANDI_SCALE, MUSTATEEL_SCALE,
  getMustateelMouzaSplit, getMogaColor, effectiveKillaVisible,
  mogaNumberFont, canalNameFont, getOutletDimensions,
} from "@/lib/gisEngine";
import {
  svgCanalNameOnPath, svgMogaFractionBox,
  svgCCAGCAFractionBox, svgMogaInfo, getOutletLabelPos, getChakbandiLabelPos,
  getCCAGCAText, buildLegendSVG, svgRoadName, svgAcreUses, acreUseHasLabel, svgKanalFills, acreHasFill,
} from "@/lib/printRenderHelpers";

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "bridge", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

export function getObjectsBounds(objects) {
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
function svgExclusionHatch(obj, idx) {
  const spacing = obj.exclusionSpacing || 60;
  const color = obj.exclusionColor || "#000000";
  // Print: line width = 25% less than the parcel's own boundary width
  let width;
  if (obj.type === "mustateel") width = MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness) * 0.75;
  else if (obj.type === "muraba") width = 6.5 * 0.75;
  else width = 1 * 0.75;

  // Per-kanal exclusion rects — matches the editor canvas via getExcludedKanals.
  let rects;
  if (obj.type === "mustateel" || obj.type === "muraba") {
    const exK = getExcludedKanals(obj);
    if (!exK.some(e => e)) return "";
    const cells = obj.type === "muraba" ? getMurabaKillaCells(obj) : getMustateelKillaCells(obj);
    rects = [];
    for (const cell of cells) {
      const ex = exK[cell.killa - 1];
      if (!ex) continue;
      if (ex.boxes.length === 8) {
        rects.push({ x: cell.x, y: cell.y, w: cell.w, h: cell.h });
      } else {
        for (const b of getKanalBoxes(cell)) {
          if (ex.boxes.includes(b.box)) rects.push({ x: b.x, y: b.y, w: b.w, h: b.h });
        }
      }
    }
  } else {
    rects = [{ x: obj.x, y: obj.y, w: obj.w, h: obj.h }];
  }
  if (rects.length === 0) return "";

  let result = "";
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    const id = `excl_${idx}_${i}`;
    let lines = "";
    for (let d = -rect.h; d < rect.w; d += spacing) {
      lines += `<line x1="${(rect.x + d).toFixed(1)}" y1="${rect.y.toFixed(1)}" x2="${(rect.x + d + rect.h).toFixed(1)}" y2="${(rect.y + rect.h).toFixed(1)}" stroke="${color}" stroke-width="${width}"/>`;
    }
    result += `<clipPath id="${id}"><rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"/></clipPath><g clip-path="url(#${id})">${lines}</g>`;
  }
  return result;
}

function svgMustateel(obj, C, idx, showKilla = true, mouzaSplit = null, showLabels = true) {
  const cellW = obj.w / 2, cellH = obj.h / 5;
  const strokeColor = C.mustateelStroke || "#000000";
  const fontSize = Math.min(obj.w * 0.30, obj.h * 0.30);
  const killaGrid = getMustateeelKillaGrid();

  const gridColor = C.gridStroke || strokeColor;
  let gridLines = "";
  gridLines += `<line x1="${obj.x + cellW}" y1="${obj.y}" x2="${obj.x + cellW}" y2="${obj.y + obj.h}" stroke="${gridColor}" stroke-width="0.7"/>`;
  for (let r = 1; r < 5; r++) {
    gridLines += `<line x1="${obj.x}" y1="${obj.y + r*cellH}" x2="${obj.x + obj.w}" y2="${obj.y + r*cellH}" stroke="${gridColor}" stroke-width="0.7"/>`;
  }

  let killaLabels = "";
  if (showKilla) {
    const killaFontSize = Math.max(6, Math.min(cellW, cellH) * 0.28);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 2; c++) {
        if (acreHasFill(obj, killaGrid[r][c])) continue; // filled cell — colour shows, number hidden
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
    labelSvg = `${label ? `<text x="${obj.x + obj.w/2}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}`;
  }

  return `
<g key="must_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" />
  ${gridLines}
  ${svgAcreUses(obj, showKilla, strokeColor, showLabels)}
  ${svgKanalFills(obj)}
  ${killaLabels}
  ${obj.excluded ? svgExclusionHatch(obj, `must_${idx}`) : ""}
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" stroke="${strokeColor}" stroke-width="${MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness)}" stroke-linejoin="miter"/>
  ${labelSvg}
</g>`;
}

function svgMuraba(obj, C, idx, showKilla = true) {
  const cellW = obj.w / 5, cellH = obj.h / 5;
  const strokeColor = C.murabaStroke || "#000000";
  const fontSize = Math.min(obj.w * 0.22, obj.h * 0.22);
  const killaGrid = getMurabaKillaGrid();

  const gridColor = C.gridStroke || strokeColor;
  let gridLines = "";
  for (let c = 1; c < 5; c++) {
    gridLines += `<line x1="${obj.x + c*cellW}" y1="${obj.y}" x2="${obj.x + c*cellW}" y2="${obj.y + obj.h}" stroke="${gridColor}" stroke-width="0.7"/>`;
  }
  for (let r = 1; r < 5; r++) {
    gridLines += `<line x1="${obj.x}" y1="${obj.y + r*cellH}" x2="${obj.x + obj.w}" y2="${obj.y + r*cellH}" stroke="${gridColor}" stroke-width="0.7"/>`;
  }

  let killaLabels = "";
  if (showKilla) {
    const killaFontSize = Math.max(5, Math.min(cellW, cellH) * 0.24);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (acreHasFill(obj, killaGrid[r][c])) continue; // filled cell — colour shows, number hidden
        killaLabels += `<text x="${obj.x + c*cellW + cellW/2}" y="${obj.y + r*cellH + cellH/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${killaFontSize}" fill="${strokeColor}" fill-opacity="0.70">${killaGrid[r][c]}</text>`;
      }
    }
  }

  const label = obj.label || "";
  return `
<g key="murb_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" />
  ${gridLines}
  ${svgKanalFills(obj)}
  ${killaLabels}
  ${obj.excluded ? svgExclusionHatch(obj, `murb_${idx}`) : ""}
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
  ${obj.excluded ? svgExclusionHatch(obj, `acre_${idx}`) : ""}
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

function svgCanal(obj, C, idx, outlets) {
  if (!obj.points || obj.points.length < 2) return "";
  const w = (obj.width || DIMENSIONS.CANAL_WIDTH);
  const centerPath = pointsToSmoothPath(obj.points);
  const fillColor = C.canalFill || "rgba(163,218,244,0.70)";
  const strokeColor = C.canalStroke || "#2B7AB8";
  const cf = canalNameFont(obj.width || DIMENSIONS.CANAL_WIDTH);
  const nameSvg = obj.name ? svgCanalNameOnPath(obj.points, obj.name, cf, outlets) : "";
  if (obj.canalStyle === "flat") {
    const halfW = w / 2;
    const fillPath = parallelSmoothClosedPath(obj.points, halfW);
    const left = getParallelPolyline(obj.points, -halfW);
    const right = getParallelPolyline(obj.points, halfW);
    return `
<g key="canal_${idx}">
  <path d="${fillPath}" fill="${fillColor}" />
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="round"/>
  ${nameSvg}
</g>`;
  }
  return `
<g key="canal_${idx}">
  <path d="${centerPath}" fill="none" stroke="${strokeColor}" stroke-width="${w + 8}" stroke-linecap="round" stroke-linejoin="round" opacity="0.18"/>
  <path d="${centerPath}" fill="none" stroke="${strokeColor}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${centerPath}" fill="none" stroke="${fillColor}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${centerPath}" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="${Math.max(1, w * 0.12).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>
  ${nameSvg}
</g>`;
}

function svgKhal(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const halfW = (obj.width || DIMENSIONS.KHAL_WIDTH) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const color = C.khalStroke || "#000000";
  const khalFill = obj.fillColor || C.khalFill || "rgba(59,130,246,0.80)";
  const leftPts = left.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const rightPts = right.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillPts = [...left, ...[...right].reverse()].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = obj.points[obj.points.length - 1];
  let prev = obj.points[0];
  for (let i = obj.points.length - 2; i >= 0; i--) {
    const p = obj.points[i];
    if (Math.hypot(last.x - p.x, last.y - p.y) > halfW * 2) { prev = p; break; }
  }
  const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
  const aLen = halfW * 6.25;
  const aW = halfW * 2.5;
  const p1x = (last.x - aLen * Math.cos(ang) - aW * Math.sin(ang)).toFixed(1);
  const p1y = (last.y - aLen * Math.sin(ang) + aW * Math.cos(ang)).toFixed(1);
  const p2x = (last.x - aLen * Math.cos(ang) + aW * Math.sin(ang)).toFixed(1);
  const p2y = (last.y - aLen * Math.sin(ang) - aW * Math.cos(ang)).toFixed(1);
  return `
<g key="khal_${idx}">
  <polygon points="${fillPts}" fill="${khalFill}" />
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
  const edgeColor = obj.edgeColor || "#fbbf24";
  const edgeW = obj.edgeWidth || 2;
  const fillColor = obj.fillColor || "#1a1a1a";
  const centerDash = pointsToSmoothPath(obj.points);
  const nameSvg = obj.name ? svgRoadName(obj.points, obj.name, obj.width || DIMENSIONS.ROAD_WIDTH) : "";
  return `
<g key="road_${idx}">
  <path d="${fillPath}" fill="${fillColor}" />
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${edgeColor}" stroke-width="${edgeW}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${edgeColor}" stroke-width="${edgeW}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${centerDash}" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="14,8" stroke-linecap="round"/>
  ${nameSvg}
</g>`;
}

function svgBridge(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const halfW = (obj.width || 28) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const color = "#dc2626";
  const leftPts = left.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const rightPts = right.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const rungSpacing = obj.rungSpacing || 20;
  let rungs = "";
  for (let i = 0; i < obj.points.length - 1; i++) {
    const a = obj.points[i], b = obj.points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.floor(segLen / rungSpacing));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const lIdx = Math.min(i, left.length - 1);
      const lNext = Math.min(i + 1, left.length - 1);
      const rIdx = Math.min(i, right.length - 1);
      const rNext = Math.min(i + 1, right.length - 1);
      const lx = (left[lIdx].x + (left[lNext].x - left[lIdx].x) * t).toFixed(1);
      const ly = (left[lIdx].y + (left[lNext].y - left[lIdx].y) * t).toFixed(1);
      const rx = (right[rIdx].x + (right[rNext].x - right[rIdx].x) * t).toFixed(1);
      const ry = (right[rIdx].y + (right[rNext].y - right[rIdx].y) * t).toFixed(1);
      rungs += `<line x1="${lx}" y1="${ly}" x2="${rx}" y2="${ry}" stroke="${color}" stroke-width="2" stroke-dasharray="4,3" stroke-linecap="round"/>`;
    }
  }
  return `
<g key="bridge_${idx}">
  <polyline points="${leftPts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="4,3" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${rightPts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="4,3" stroke-linecap="round" stroke-linejoin="round"/>
  ${rungs}
</g>`;
}

function svgOutlet(obj, C, idx) {
  if (!obj.start || !obj.end) return "";
  const color = obj.outletColor || C.outletStroke || "#06b6d4";
  // Shared dimensions — identical to editor canvas & print preview
  const { size, shaftWidth, headLen, headW, radius } = getOutletDimensions(obj);
  const half = size / 2;
  const { x: sx, y: sy } = obj.start;
  const { x: ex, y: ey } = obj.end;
  const angle = Math.atan2(ey - sy, ex - sx);
  const h1x = (ex - headLen * Math.cos(angle) - headW * Math.sin(angle)).toFixed(1);
  const h1y = (ey - headLen * Math.sin(angle) + headW * Math.cos(angle)).toFixed(1);
  const h2x = (ex - headLen * Math.cos(angle) + headW * Math.sin(angle)).toFixed(1);
  const h2y = (ey - headLen * Math.sin(angle) - headW * Math.cos(angle)).toFixed(1);
  // Moga number INSIDE the canal — along the canal direction (perpendicular to the
  // outlet shaft), kept upright like the canal name. Same colours as the canal name.
  let mogaInside = "";
  if (obj.mogha_number || obj.mogha_side) {
    const mogaText = [obj.mogha_number, obj.mogha_side].filter(Boolean).join("/");
    let canalAng = angle + Math.PI / 2;
    if (canalAng > Math.PI / 2 || canalAng < -Math.PI / 2) canalAng += Math.PI;
    const canalAngDeg = canalAng * 180 / Math.PI;
    const cf = canalNameFont(obj.canalWidth || DIMENSIONS.CANAL_WIDTH);
    mogaInside = `<text transform="translate(${sx.toFixed(1)},${sy.toFixed(1)}) rotate(${canalAngDeg.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${cf.toFixed(1)}" paint-order="stroke" stroke="rgba(0,0,0,0.85)" stroke-width="${Math.max(2, cf * 0.18).toFixed(1)}" stroke-linejoin="round" fill="#FFD700">${mogaText}</text>`;
  }
  return `<g key="outlet_${idx}">
    <rect x="${(sx - half).toFixed(1)}" y="${(sy - half).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${radius.toFixed(1)}" fill="${color}" stroke="#0e7490" stroke-width="2"/>
    <line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${color}" stroke-width="${shaftWidth.toFixed(1)}" stroke-linecap="round"/>
    <polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${h1x},${h1y} ${h2x},${h2y}" fill="${color}"/>
    ${mogaInside}
    ${svgMogaInfo(obj, size * 1.2)}
  </g>`;
}

function svgMouza(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const pts = obj.points.map(p => `${p.x},${p.y}`).join(" ");
  const lw = obj.lineWidth || 3;
  const isDashed = obj.lineStyle !== "solid";
  const dashAttr = isDashed ? ` stroke-dasharray="25,12"` : "";
  const color = (!C.mouzaStroke || C.mouzaStroke === '#000000') ? '#dc2626' : C.mouzaStroke;
  // Labels — label1 above the line, label2 below the line (mouza names on each side)
  const mid = Math.floor(obj.points.length / 2);
  const p = obj.points[mid];
  const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
  const angleDeg = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
  const labelFont = Math.max(14, Math.min(40, lw * 4)) * 5;
  const offset = (lw / 2 + labelFont * 0.6) * 2;
  const text1 = obj.label1 || obj.name || "";
  const text2 = obj.label2 || "";
  let labels = "";
  if (text1) {
    labels += `<text transform="translate(${p.x},${p.y}) rotate(${angleDeg.toFixed(1)})" x="0" y="${(-offset).toFixed(1)}" text-anchor="middle" dominant-baseline="bottom" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${labelFont}" fill="${color}">${text1}</text>`;
  }
  if (text2) {
    labels += `<text transform="translate(${p.x},${p.y}) rotate(${angleDeg.toFixed(1)})" x="0" y="${offset.toFixed(1)}" text-anchor="middle" dominant-baseline="top" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${labelFont}" fill="${color}">${text2}</text>`;
  }
  return `<polyline key="mouza_${idx}" points="${pts}" fill="none" stroke="${color}" stroke-width="${lw}" stroke-linecap="round"${dashAttr}/>${labels}`;
}

// ─── MAIN SVG GENERATOR ───────────────────────────────────────────────────────
export function buildSVG(objects, colorSettings, filterMoga, killaVisibility = {}) {
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
  const showAcreLabels = killaVisibility.acreUseLabels !== false;

  const filtered = filterMoga
    ? objects.filter(o => {
        if (o.type === "chakbandi") return o.mogaNumber === filterMoga;
        if (o.type === "mustateel") return o.mogaNumber === filterMoga || !o.mogaNumber;
        return true;
      })
    : objects;

  const sorted = [...filtered].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));
  const mouzaObjects = objects.filter(o => o.type === "mouza");
  const allOutlets = objects.filter(o => o.type === "outlet");

  let svgParts = [];
  sorted.forEach((obj, idx) => {
    switch (obj.type) {
      case "mustateel": svgParts.push(svgMustateel(obj, C, idx, effectiveKillaVisible(obj, showKillaMustateel), getMustateelMouzaSplit(obj, mouzaObjects), showAcreLabels)); break;
      case "muraba":    svgParts.push(svgMuraba(obj, C, idx, showKillaMuraba)); break;
      case "acre":      svgParts.push(svgAcre(obj, C, idx)); break;
      case "chakbandi": svgParts.push(svgChakbandi(obj, C, idx, viewW)); break;
      case "canal":     svgParts.push(svgCanal(obj, C, idx, allOutlets)); break;
      case "khal":      svgParts.push(svgKhal(obj, C, idx)); break;
      case "road":      svgParts.push(svgRoad(obj, C, idx)); break;
      case "bridge":    svgParts.push(svgBridge(obj, C, idx)); break;
      case "mouza":     svgParts.push(svgMouza(obj, C, idx)); break;
      case "outlet":    svgParts.push(svgOutlet(obj, C, idx)); break;
      default: break;
    }
  });

  return { svgBody: svgParts.join("\n"), viewX, viewY, viewW, viewH };
}