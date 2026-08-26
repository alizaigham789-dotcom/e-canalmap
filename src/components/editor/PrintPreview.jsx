import React, { useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, ZoomIn, ZoomOut, FileText } from "lucide-react";
import { getParallelPolyline, getMustateeelKillaGrid, getMustateelKillaCells, getMurabaKillaGrid, getMurabaKillaCells, DIMENSIONS, CHAKBANDI_SCALE, MUSTATEEL_SCALE, getMustateelMouzaSplit, calculateTotalGCA, calculateChakbandiGCA, buildPrintHeaderHTML, buildPrintFooterHTML, mogaNumberFont, canalNameFont, getOutletDimensions } from "@/lib/gisEngine";
import PrintHeaderBox from "@/components/editor/PrintHeaderBox";
import { svgCanalNameOnPath, svgMogaFractionBox, svgCCAGCAFractionBox, svgMogaInfo, getOutletLabelPos, getChakbandiLabelPos, getCCAGCAText, buildLegendSVG, svgRoadName, svgAcreUses, acreUseHasLabel } from "@/lib/printRenderHelpers";
import { normalizeCanalStyle, canalStyleOf, canalWaterColor, canalBankColor, canalShapeOf, sideBoundaryOf } from "@/lib/canalStyles";
import { collectLandUses } from "@/lib/landUsePalette";
import { Move, Download, Share2, Loader2 } from "lucide-react";
import { canvasToPdfBlob, svgToCanvas, downloadBlob, shareBlob } from "@/lib/pdfExport";
import { toast } from "sonner";

// Lead-pencil print mode — dim grey lines like a hand-drawn sketch, red mouza
// Lead-pencil print mode — ONLY mustateel/muraba boundaries, their killa grid lines
// and parcel labels render in solid black (hand-drawn survey sketch). Everything
// else — canals, khals, roads, chakbandis, mouzas, outlets, acres — keeps its real
// assigned colour (no override → falls through to the user's colorSettings), so the
// pencil toggle never turns the canal/khal black & white.
const PENCIL_COLORS = {
  mustateelStroke: "#000000",
  murabaStroke: "#000000",
  gridStroke: "#000000",
  labelColor: "#000000",
};

// Khaka Dasti (hand-drawn sketch) — lead-pencil grey palette (not full black).
// Drawn mustateel boundaries are graphite grey; the internal killa grid is a lighter
// grey so the whole page reads like a light pencil sketch. Name labels are hidden
// (the surveyor writes them in by hand); a mustateel guide grid extends beyond the
// drawn parcels so any missed mustateel can be pencil-drawn later.
const KHAKA_DASTI_COLORS = {
  mustateelStroke: "#6b6b6b",
  murabaStroke: "#6b6b6b",
  gridStroke: "rgba(120,120,120,0.42)",
  labelColor: "#6b6b6b",
};

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "bridge", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

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
function svgMustateel(obj, C, idx, showKilla = true, mouzaSplit = null, showLabels = true, showNameLabel = true) {
  const cellW = obj.w / 2, cellH = obj.h / 5;
  const strokeColor = C.mustateelStroke || "#000000";
  const fontSize = Math.min(obj.w * 0.30, obj.h * 0.30);
  const killaGrid = getMustateeelKillaGrid();

  // Killa grid lines — slightly lighter than the boundary so they read as internal divisions
  const gridColor = C.gridStroke || strokeColor;
  let gridLines = "";
  gridLines += `<line x1="${obj.x + cellW}" y1="${obj.y}" x2="${obj.x + cellW}" y2="${obj.y + obj.h}" stroke="${gridColor}" stroke-width="0.7"/>`;
  for (let r = 1; r < 5; r++) {
    gridLines += `<line x1="${obj.x}" y1="${obj.y + r*cellH}" x2="${obj.x + obj.w}" y2="${obj.y + r*cellH}" stroke="${gridColor}" stroke-width="0.7"/>`;
  }

  // Killa numbers — only if showKilla is true
  let killaLabels = "";
  if (showKilla) {
    const killaFontSize = Math.max(6, Math.min(cellW, cellH) * 0.28);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 2; c++) {
        if (acreUseHasLabel(obj, killaGrid[r][c])) continue; // corner number drawn by svgAcreUses
        killaLabels += `<text x="${obj.x + c*cellW + cellW/2}" y="${obj.y + r*cellH + cellH/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${killaFontSize}" fill="${strokeColor}" fill-opacity="0.75">${killaGrid[r][c]}</text>`;
      }
    }
  }

  const label = obj.label || "";
  const labelY = obj.y + obj.h / 2;

  let labelSvg;
  if (mouzaSplit && obj.label2) {
    const lbl2Final = obj.label2;
    const fitFont = (text, halfW) => {
      let fpx = Math.min(obj.w, obj.h) * 0.26;
      const estW = text.length * fpx * 0.6;
      const maxW = (halfW || obj.w * 0.5) * 0.80;
      if (estW > maxW) fpx = Math.max(8, maxW / (text.length * 0.6));
      return fpx;
    };
    const f1 = fitFont(label, mouzaSplit.widthA);
    const f2 = fitFont(lbl2Final, mouzaSplit.widthB);
    labelSvg = `${label ? `<text x="${mouzaSplit.centerA.x}" y="${mouzaSplit.centerA.y}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${f1}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}${lbl2Final ? `<text x="${mouzaSplit.centerB.x}" y="${mouzaSplit.centerB.y}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${f2}" fill="${C.labelColor||'#1e293b'}">${lbl2Final}</text>` : ""}`;
  } else {
    // No mouza split — show only label1 centered
    const cx = obj.x + obj.w/2;
    labelSvg = `${label ? `<text x="${cx}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}`;
  }

  return `
<g key="must_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" />
  ${gridLines}
  ${svgAcreUses(obj, showKilla, strokeColor, showLabels)}
  ${killaLabels}
  ${obj.excluded ? svgExclusionHatch(obj, `must_${idx}`) : ""}
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" stroke="${strokeColor}" stroke-width="${MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness)}" stroke-linejoin="miter"/>
  ${showNameLabel ? labelSvg : ""}
</g>`;
}

function svgMuraba(obj, C, idx, showKilla = true, mouzaSplit = null, showNameLabel = true) {
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
        killaLabels += `<text x="${obj.x + c*cellW + cellW/2}" y="${obj.y + r*cellH + cellH/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${killaFontSize}" fill="${strokeColor}" fill-opacity="0.70">${killaGrid[r][c]}</text>`;
      }
    }
  }

  const label = obj.label || "";
  const label2 = obj.label2 || "";
  let labelSvg;
  if (mouzaSplit && label2) {
    const fitFont = (text, halfW) => {
      let fpx = Math.min(obj.w, obj.h) * 0.20;
      const estW = text.length * fpx * 0.6;
      const maxW = (halfW || obj.w * 0.5) * 0.80;
      if (estW > maxW) fpx = Math.max(8, maxW / (text.length * 0.6));
      return fpx;
    };
    const f1 = fitFont(label, mouzaSplit.widthA);
    const f2 = fitFont(label2, mouzaSplit.widthB);
    labelSvg = `${label ? `<text x="${mouzaSplit.centerA.x}" y="${mouzaSplit.centerA.y}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${f1}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}${label2 ? `<text x="${mouzaSplit.centerB.x}" y="${mouzaSplit.centerB.y}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${f2}" fill="${C.labelColor||'#1e293b'}">${label2}</text>` : ""}`;
  } else {
    labelSvg = `${label ? `<text x="${obj.x + obj.w/2}" y="${obj.y + obj.h/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="900" font-size="${fontSize}" fill="${C.labelColor||'#1e293b'}">${label}</text>` : ""}`;
  }

  return `
<g key="murb_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" />
  ${gridLines}
  ${killaLabels}
  ${obj.excluded ? svgExclusionHatch(obj, `murb_${idx}`) : ""}
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="none" stroke="${strokeColor}" stroke-width="${MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness)}" stroke-linejoin="miter"/>
  ${showNameLabel ? labelSvg : ""}
</g>`;
}

function svgExclusionHatch(obj, idx) {
  const spacing = obj.exclusionSpacing || 60;
  const color = obj.exclusionColor || "#000000";
  // Print: line width = 25% less than the parcel's own boundary width
  let width;
  if (obj.type === "mustateel") width = MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness) * 0.75;
  else if (obj.type === "muraba") width = MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness) * 0.75;
  else width = 1 * 0.75;

  let rects;
  if (obj.excludedAcres && obj.type === "mustateel") {
    rects = getMustateelKillaCells(obj)
      .filter(cell => obj.excludedAcres[cell.killa - 1])
      .map(cell => ({ x: cell.x, y: cell.y, w: cell.w, h: cell.h }));
  } else if (obj.excludedAcres && obj.type === "muraba") {
    rects = getMurabaKillaCells(obj)
      .filter(cell => obj.excludedAcres[cell.killa - 1])
      .map(cell => ({ x: cell.x, y: cell.y, w: cell.w, h: cell.h }));
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

function svgAcre(obj, C, idx) {
  const fillColor = obj.fillColor || C.acreFill || "rgba(234,179,8,0.08)";
  const strokeColor = C.acreStroke || "#eab308";
  const fontSize = Math.min(obj.w, obj.h) * 0.22;
  return `
<g key="acre_${idx}">
  <rect x="${obj.x}" y="${obj.y}" width="${obj.w}" height="${obj.h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"/>
  ${obj.excluded ? svgExclusionHatch(obj, idx) : ""}
  ${obj.label ? `<text x="${obj.x + obj.w/2}" y="${obj.y + obj.h/2}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${fontSize}" fill="${C.labelColor||'#1e293b'}">${obj.label}</text>` : ""}
</g>`;
}

function svgChakbandi(obj, C, idx, viewW, khakaDasti = false) {
  if (!obj.points || obj.points.length < 2) return "";
  const style = khakaDasti ? "khakaDasti" : (obj.chakbandiStyle || "cross");
  const pts = obj.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const label = obj.name || "";
  const midPt = obj.points[Math.floor(obj.points.length/2)];
  const mustW = MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness || 5);
  const lineColor = style === "khakaDasti" ? "#22c55e" : (C.chakbandiStroke || "#22c55e");
  const labelSvg = label && midPt ? `<text x="${midPt.x.toFixed(1)}" y="${(midPt.y - 8).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="12" fill="${lineColor}">${label}</text>` : "";

  // 5 professional line styles. Khaka Dasti = solid green line at mustateel-border
  // width (forced on by the Print خاکہ دستی toggle). Cross keeps the user's colour.
  if (style === "khakaDasti") {
    return `<g>
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="${mustW}" stroke-linecap="round" stroke-linejoin="miter"/>
  ${labelSvg}
</g>`;
  }
  if (style === "dashed") {
    return `<g>
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="${mustW}" stroke-dasharray="${(mustW*2.2).toFixed(1)},${(mustW*1.4).toFixed(1)}" stroke-linecap="butt" stroke-linejoin="miter"/>
  ${labelSvg}
</g>`;
  }
  if (style === "dotted") {
    return `<g>
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="${mustW}" stroke-dasharray="${Math.max(2,mustW*0.5).toFixed(1)},${(mustW*1.2).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>
  ${labelSvg}
</g>`;
  }
  if (style === "stitched") {
    const spineW = Math.max(2, mustW * 0.5);
    const tickLen = mustW * 1.1;
    const tickSpacing = Math.max(20, mustW * 2.5);
    let ticks = "";
    for (let i = 0; i < obj.points.length - 1; i++) {
      const a = obj.points[i], b = obj.points[i+1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const steps = Math.max(1, Math.floor(segLen / tickSpacing));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t;
        ticks += `<line x1="${(cx - nx*tickLen).toFixed(1)}" y1="${(cy - ny*tickLen).toFixed(1)}" x2="${(cx + nx*tickLen).toFixed(1)}" y2="${(cy + ny*tickLen).toFixed(1)}" stroke="${lineColor}" stroke-width="${Math.max(1.5, spineW*0.7).toFixed(1)}" stroke-linecap="round"/>`;
      }
    }
    return `<g>
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="${spineW}" stroke-linecap="round" stroke-linejoin="miter"/>
  ${ticks}
  ${labelSvg}
</g>`;
  }

  if (style === "rings") {
    // Series of empty circles (rings) along the line — "chakbandi line just rings"
    const r = mustW;
    const ringW = Math.max(1.5, mustW * 0.5);
    const ringSpacing = Math.max(16, mustW * 2.2);
    let rings = "";
    for (let i = 0; i < obj.points.length - 1; i++) {
      const a = obj.points[i], b = obj.points[i+1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(segLen / ringSpacing));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t;
        rings += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${lineColor}" stroke-width="${ringW.toFixed(1)}"/>`;
      }
    }
    return `<g>${rings}${labelSvg}</g>`;
  }
  if (style === "loops") {
    // Pencil-drawn loops — flattened ellipses (chipti shape) with the stroke
    // endpoints sticking out along the line, like a hand-drawn cursive loop.
    const rx = mustW * 1.4, ry = mustW * 0.8;
    const loopW = Math.max(1.5, mustW * 0.5);
    const loopSpacing = Math.max(20, mustW * 3);
    let loops = "";
    for (let i = 0; i < obj.points.length - 1; i++) {
      const a = obj.points[i], b = obj.points[i+1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const deg = (ang * 180 / Math.PI).toFixed(1);
      const dirX = Math.cos(ang), dirY = Math.sin(ang);
      const steps = Math.max(1, Math.floor(segLen / loopSpacing));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t;
        loops += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${lineColor}" stroke-width="${loopW.toFixed(1)}" transform="rotate(${deg} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
        const stub = rx * 1.6;
        loops += `<line x1="${(cx - dirX*stub).toFixed(1)}" y1="${(cy - dirY*stub).toFixed(1)}" x2="${(cx + dirX*stub).toFixed(1)}" y2="${(cy + dirY*stub).toFixed(1)}" stroke="${lineColor}" stroke-width="${loopW.toFixed(1)}" stroke-linecap="round"/>`;
      }
    }
    return `<g>${loops}${labelSvg}</g>`;
  }

  // Default: Cross (×) pattern — keeps the user's chakbandi colour + thickness
  const color = C.chakbandiStroke || "#000000";
  const lineW = CHAKBANDI_SCALE.lineWidth(obj.lineThickness);
  const crossW = lineW * 0.6;
  const crossSize = CHAKBANDI_SCALE.crossSize(obj.crossSize);
  const spacing = CHAKBANDI_SCALE.crossSpacing(obj.crossSpacing);

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

  return `<g>
  <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="miter"/>
  ${crosses}
  ${label && midPt ? `<text x="${midPt.x.toFixed(1)}" y="${(midPt.y - 8).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="12" fill="${color}">${label}</text>` : ""}
</g>`;
}

// Canal SVG — 10 professional styles + 10 shapes + side boundaries.
// Style/Shape/Boundary change ONLY appearance; width, points, geometry and
// editing stay exactly as before. Mirrors the editor canvas rendering.
function svgCanal(obj, C, idx, outlets) {
  if (!obj.points || obj.points.length < 2) return "";
  const w = (obj.width || DIMENSIONS.CANAL_WIDTH);
  const halfW = w / 2;
  const style = normalizeCanalStyle(obj.canalStyle);
  const s = canalStyleOf(obj);
  const shape = canalShapeOf(obj);
  const smooth = shape.smooth;
  const water = C.canalFill || canalWaterColor(obj);
  const bank = C.canalStroke || canalBankColor(obj);
  const cf = canalNameFont(obj.width || DIMENSIONS.CANAL_WIDTH);
  const nameSvg = obj.name ? svgCanalNameOnPath(obj.points, obj.name, cf, outlets) : "";
  const tension = smooth ? 0.4 : 0;
  const pth = (pts) => pointsToSmoothPath(pts, tension);

  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const fillPath = `${pth(left)} L${right[right.length - 1].x.toFixed(1)},${right[right.length - 1].y.toFixed(1)} ${pth([...right].reverse()).replace(/^M[\d.,\s-]+/, "")} Z`;
  const centerPath = pth(obj.points);

  // Side boundary bands
  const sb = sideBoundaryOf(obj);
  let bandsSvg = "";
  if (sb.enabled && (sb.leftWidth || sb.rightWidth)) {
    const drawBand = (innerOff, outerOff) => {
      const inner = getParallelPolyline(obj.points, innerOff);
      const outer = getParallelPolyline(obj.points, outerOff);
      const bp = `${pth(inner)} L${outer[outer.length - 1].x.toFixed(1)},${outer[outer.length - 1].y.toFixed(1)} ${pth([...outer].reverse()).replace(/^M[\d.,\s-]+/, "")} Z`;
      return `<path d="${bp}" fill="${sb.color}"/><path d="${pth(outer)}" fill="none" stroke="${sb.edgeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    };
    if (sb.leftWidth > 0) bandsSvg += drawBand(-halfW, -(halfW + sb.leftWidth));
    if (sb.rightWidth > 0) bandsSvg += drawBand(halfW, halfW + sb.rightWidth);
  }

  // Banks + end caps
  const capLine = shape.cap === "round" ? "round" : "butt";
  let banksSvg = "";
  for (const side of [left, right]) {
    banksSvg += `<path d="${pth(side)}" fill="none" stroke="${bank}" stroke-width="2.5" stroke-linecap="${capLine}" stroke-linejoin="round"/>`;
  }
  if (shape.cap === "square") {
    banksSvg += `<line x1="${left[0].x.toFixed(1)}" y1="${left[0].y.toFixed(1)}" x2="${right[0].x.toFixed(1)}" y2="${right[0].y.toFixed(1)}" stroke="${bank}" stroke-width="2.5"/>`;
    banksSvg += `<line x1="${left[left.length - 1].x.toFixed(1)}" y1="${left[left.length - 1].y.toFixed(1)}" x2="${right[right.length - 1].x.toFixed(1)}" y2="${right[right.length - 1].y.toFixed(1)}" stroke="${bank}" stroke-width="2.5"/>`;
  } else if (shape.cap === "arrow") {
    const pts = obj.points;
    const last = pts[pts.length - 1], prev = pts[pts.length - 2] || pts[0];
    const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
    const aLen = w * 0.9, aW = w * 0.5;
    const p1x = (last.x - aLen * Math.cos(ang) - aW * Math.sin(ang)).toFixed(1);
    const p1y = (last.y - aLen * Math.sin(ang) + aW * Math.cos(ang)).toFixed(1);
    const p2x = (last.x - aLen * Math.cos(ang) + aW * Math.sin(ang)).toFixed(1);
    const p2y = (last.y - aLen * Math.sin(ang) - aW * Math.cos(ang)).toFixed(1);
    banksSvg += `<polygon points="${last.x.toFixed(1)},${last.y.toFixed(1)} ${p1x},${p1y} ${p2x},${p2y}" fill="${bank}"/>`;
  }

  // Gradient def for classic / custom
  const gradId = `canalWater_${idx}`;
  const p0 = obj.points[0], p1 = obj.points[obj.points.length - 1];
  const dirAng = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  const perpX = Math.cos(dirAng + Math.PI / 2), perpY = Math.sin(dirAng + Math.PI / 2);
  const midX = (p0.x + p1.x) / 2, midY = (p0.y + p1.y) / 2;
  const gx1 = (midX - perpX * halfW).toFixed(1), gy1 = (midY - perpY * halfW).toFixed(1);
  const gx2 = (midX + perpX * halfW).toFixed(1), gy2 = (midY + perpY * halfW).toFixed(1);
  const gradDef = `<defs><linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${gx1}" y1="${gy1}" x2="${gx2}" y2="${gy2}"><stop offset="0" stop-color="${bank}"/><stop offset="0.5" stop-color="${water}"/><stop offset="1" stop-color="${bank}"/></linearGradient></defs>`;

  // Water ripples
  let ripplesSvg = "";
  if (style === "water" || style === "3dwater") {
    for (const off of [-w * 0.18, w * 0.18]) {
      const rip = getParallelPolyline(obj.points, off);
      ripplesSvg += `<path d="${pth(rip)}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="${Math.max(1, w * 0.08).toFixed(1)}" stroke-linecap="round" stroke-dasharray="10,8"/>`;
    }
  }

  let bodySvg = "";
  if (style === "3d" || style === "3dwater") {
    bodySvg = `
  <path d="${centerPath}" fill="none" stroke="${bank}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${centerPath}" fill="none" stroke="${water}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${centerPath}" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="${Math.max(1, w * 0.12).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>${ripplesSvg ? "\n  " + ripplesSvg : ""}`;
  } else if (style === "engineeringBlue") {
    bodySvg = `
  <path d="${centerPath}" fill="none" stroke="${bank}" stroke-width="${Math.max(2, w * 0.5).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${centerPath}" fill="none" stroke="#ffffff" stroke-width="${Math.max(1, w * 0.12).toFixed(1)}" stroke-linecap="round" stroke-dasharray="14,10"/>`;
  } else if (style === "dashed") {
    bodySvg = `
  <path d="${centerPath}" fill="none" stroke="${water}" stroke-width="${Math.max(2, w * 0.6).toFixed(1)}" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="18,10"/>`;
  } else {
    let preBanks = "";
    if (style === "concrete") {
      preBanks = `<path d="${pth(left)}" fill="none" stroke="${s.concrete}" stroke-width="${Math.max(3, w * 0.18).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${pth(right)}" fill="none" stroke="${s.concrete}" stroke-width="${Math.max(3, w * 0.18).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (style === "earth") {
      preBanks = `<path d="${pth(left)}" fill="none" stroke="${s.grass}" stroke-width="${Math.max(2, w * 0.10).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${pth(right)}" fill="none" stroke="${s.grass}" stroke-width="${Math.max(2, w * 0.10).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (style === "green") {
      preBanks = `<path d="${pth(left)}" fill="none" stroke="${s.bank}" stroke-width="${Math.max(3, w * 0.14).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${pth(right)}" fill="none" stroke="${s.bank}" stroke-width="${Math.max(3, w * 0.14).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const waterFill = (style === "classic" || style === "custom")
      ? `<path d="${fillPath}" fill="url(#${gradId})"/>`
      : `<path d="${fillPath}" fill="${water}"/>`;
    const shimmer = (style === "classic" || style === "custom")
      ? `<path d="${centerPath}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="${Math.max(1, w * 0.10).toFixed(1)}" stroke-linecap="round" stroke-dasharray="14,10"/>`
      : "";
    bodySvg = `
  ${gradDef}
  ${preBanks}
  ${waterFill}
  ${ripplesSvg}
  ${shimmer}
  ${banksSvg}`;
  }

  return `<g key="canal_${idx}">
  ${bandsSvg}${bodySvg}
  ${nameSvg}
</g>`;
}

function svgKhal(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const halfW = (obj.width || DIMENSIONS.KHAL_WIDTH) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const color = C.khalStroke || "#0D47A1";
  const isDefaultKhal = !C.khalStroke || C.khalStroke === "#0D47A1" || C.khalStroke === "#2563eb";
  const khalFill = obj.fillColor || (isDefaultKhal ? "#1565C0" : color);
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
  const aLen = halfW * 6.25;   // 2.5× original — halved from 5×
  const aW = halfW * 2.5;      // 2.5× tail width — halved from 5×
  const p1x = (last.x - aLen * Math.cos(ang) - aW * Math.sin(ang)).toFixed(1);
  const p1y = (last.y - aLen * Math.sin(ang) + aW * Math.cos(ang)).toFixed(1);
  const p2x = (last.x - aLen * Math.cos(ang) + aW * Math.sin(ang)).toFixed(1);
  const p2y = (last.y - aLen * Math.sin(ang) - aW * Math.cos(ang)).toFixed(1);
  const arrowSvg = obj.noArrow ? "" : `<polygon points="${last.x.toFixed(1)},${last.y.toFixed(1)} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}"/>`;
  return `
<g key="khal_${idx}">
  <polygon points="${fillPts}" fill="${khalFill}" />
  <polyline points="${leftPts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${rightPts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${arrowSvg}
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
  // Rungs — perpendicular lines between rails at regular intervals
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

function svgOutlet(obj, C, idx, mogaScale = 1) {
  if (!obj.start || !obj.end) return "";
  const color = obj.outletColor || C.outletStroke || "#06b6d4";
  // Shared dimensions — identical to editor canvas & all export formats
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
function buildBackgroundGridSVG(viewX, viewY, viewW, viewH) {
  const acreW = DIMENSIONS.ACRE.width, acreH = DIMENSIONS.ACRE.height;
  const mustW = DIMENSIONS.MUSTATEEL.width, mustH = DIMENSIONS.MUSTATEEL.height;
  const endX = viewX + viewW, endY = viewY + viewH;
  const killaColor = "rgba(130,130,130,0.28)";
  const mustColor = "rgba(80,80,80,0.42)";
  let lines = "";
  // Killa (acre) grid — thin faint pencil
  for (let x = Math.floor(viewX / acreW) * acreW; x <= endX; x += acreW) {
    lines += `<line x1="${x}" y1="${viewY}" x2="${x}" y2="${endY}" stroke="${killaColor}" stroke-width="0.4"/>`;
  }
  for (let y = Math.floor(viewY / acreH) * acreH; y <= endY; y += acreH) {
    lines += `<line x1="${viewX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${killaColor}" stroke-width="0.4"/>`;
  }
  // Mustateel grid — thicker (still faint pencil) so it reads above the killa grid
  for (let x = Math.floor(viewX / mustW) * mustW; x <= endX; x += mustW) {
    lines += `<line x1="${x}" y1="${viewY}" x2="${x}" y2="${endY}" stroke="${mustColor}" stroke-width="1.0"/>`;
  }
  for (let y = Math.floor(viewY / mustH) * mustH; y <= endY; y += mustH) {
    lines += `<line x1="${viewX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${mustColor}" stroke-width="1.0"/>`;
  }
  return lines;
}

// Khaka Dasti guide grid — mustateel-sized cells extending 3 mustateels left/right
// and 1 mustateel top/bottom beyond the drawn parcels, aligned to the global
// mustateel grid. Lead-pencil grey so it reads as a light pencil guide a surveyor
// can pencil-draw a missed mustateel onto.
function buildKhakaDastiGuideGridSVG(bounds) {
  const mustW = DIMENSIONS.MUSTATEEL.width;
  const mustH = DIMENSIONS.MUSTATEEL.height;
  // Margins: 1.5 mustateels top (undrawn guide space), 3 mustateels each side,
  // bottom any (kept 1). The drawn map sits inside this guide grid.
  const leftCount = 3, rightCount = 3, topMust = 1.5, bottomMust = 1;
  const startX = bounds.minX - leftCount * mustW;
  const endX = bounds.maxX + rightCount * mustW;
  const startY = bounds.minY - topMust * mustH;
  const endY = bounds.maxY + bottomMust * mustH;
  // Very dim guide cells — boundaries much lighter than drawn mustateels,
  // killa grid even lighter so it reads as faint pencil guide lines.
  const boundaryColor = "rgba(130,130,130,0.25)";
  const killaColor = "rgba(130,130,130,0.15)";
  const boundaryW = MUSTATEEL_SCALE.boundaryWidth() * 0.7;
  const cellW = mustW / 2, cellH = mustH / 5;
  let lines = "";
  // Guide grid is aligned to the GLOBAL mustateel grid (multiples of mustW/mustH
  // from the world origin) — the same grid the drawn mustateels snap to. This
  // keeps every guide line sitting exactly on top of the drawn mustateel edges
  // (never offset / "mustateel kahi aur grid line kahi aur").
  const firstVX = Math.floor(startX / mustW) * mustW;
  for (let x = firstVX; x <= endX + 0.5; x += mustW) {
    lines += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${endY}" stroke="${boundaryColor}" stroke-width="${boundaryW}"/>`;
  }
  const firstHY = Math.floor(startY / mustH) * mustH;
  for (let y = firstHY; y <= endY + 0.5; y += mustH) {
    lines += `<line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${boundaryColor}" stroke-width="${boundaryW}"/>`;
  }
  // Killa grid inside each mustateel cell (very dim) — aligned to the global grid
  for (let x = firstVX; x < endX; x += mustW) {
    const midX = x + cellW;
    lines += `<line x1="${midX}" y1="${startY}" x2="${midX}" y2="${endY}" stroke="${killaColor}" stroke-width="0.7"/>`;
  }
  for (let y = firstHY; y < endY; y += mustH) {
    for (let r = 1; r < 5; r++) {
      const hy = y + r * cellH;
      lines += `<line x1="${startX}" y1="${hy}" x2="${endX}" y2="${hy}" stroke="${killaColor}" stroke-width="0.7"/>`;
    }
  }
  return { lines, startX, startY, endX, endY };
}

function buildSVG(objects, colorSettings, filterMoga, killaVisibility = {}, mogaScale = 1, khakaDasti = false) {
  const C = colorSettings || {};
  const bounds = getObjectsBounds(objects);
  if (!bounds) return null;

  const pad = 20;
  let viewX, viewY, viewW, viewH, guideGridSvg = "";
  if (khakaDasti) {
    const guide = buildKhakaDastiGuideGridSVG(bounds);
    guideGridSvg = guide.lines;
    viewX = guide.startX - pad;
    viewY = guide.startY - pad;
    viewW = (guide.endX - guide.startX) + pad * 2;
    viewH = (guide.endY - guide.startY) + pad * 2;
  } else {
    viewX = bounds.minX - pad;
    viewY = bounds.minY - pad;
    viewW = (bounds.maxX - bounds.minX) + pad * 2;
    viewH = (bounds.maxY - bounds.minY) + pad * 2;
  }

  const showKillaMustateel = killaVisibility.mustateel !== false;
  const showKillaMuraba = killaVisibility.muraba !== false;
  const showAcreLabels = killaVisibility.acreUseLabels !== false;

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
  const allOutlets = objects.filter(o => o.type === "outlet");

  let svgParts = [];
  if (khakaDasti) svgParts.push(guideGridSvg);
  sorted.forEach((obj, idx) => {
    switch (obj.type) {
      case "mustateel": svgParts.push(svgMustateel(obj, C, idx, obj.excluded || showKillaMustateel, getMustateelMouzaSplit(obj, mouzaObjects) || (obj.label2 ? { centerA: { x: obj.x + obj.w/2, y: obj.y + obj.h*0.25 }, centerB: { x: obj.x + obj.w/2, y: obj.y + obj.h*0.75 }, widthA: obj.w, widthB: obj.w } : null), showAcreLabels, true)); break;
      case "muraba":    svgParts.push(svgMuraba(obj, C, idx, showKillaMuraba, getMustateelMouzaSplit(obj, mouzaObjects) || (obj.label2 ? { centerA: { x: obj.x + obj.w/2, y: obj.y + obj.h*0.25 }, centerB: { x: obj.x + obj.w/2, y: obj.y + obj.h*0.75 }, widthA: obj.w, widthB: obj.w } : null), true)); break;
      case "acre":      svgParts.push(svgAcre(obj, C, idx)); break;
      case "chakbandi": svgParts.push(svgChakbandi(obj, C, idx, viewW, khakaDasti)); break;
      case "canal":     svgParts.push(svgCanal(obj, C, idx, allOutlets)); break;
      case "khal":      svgParts.push(svgKhal(obj, C, idx)); break;
      case "road":      svgParts.push(svgRoad(obj, C, idx)); break;
      case "bridge":    svgParts.push(svgBridge(obj, C, idx)); break;
      case "mouza":     svgParts.push(svgMouza(obj, C, idx)); break;
      case "outlet":    svgParts.push(svgOutlet(obj, C, idx, mogaScale)); break;
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

// Page dimensions in mm (width × height, portrait)
const PAGE_DIMENSIONS = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 },
  A0: { w: 841, h: 1189 },
};

// ─── COMPONENT ─────────────────────────────────────────────────────────────────
export default function PrintPreview({ mapData, objects, colorSettings, onClose, selectedMogaFilter, killaVisibility = {}, pageBorderStyle = "none" }) {
  const [scale, setScale] = useState(100);
  const [mogaFilter, setMogaFilter] = useState(selectedMogaFilter || "");
  const [bwMode, setBwMode] = useState(false);
  const [pencilMode, setPencilMode] = useState(false);
  const [khakaDastiMode, setKhakaDastiMode] = useState(false);
  const [pageOrientation, setPageOrientation] = useState("portrait");
  const [pageSize, setPageSize] = useState("A4");
  const [printMargin, setPrintMargin] = useState(0); // side margin removed per request

  // Compute page aspect ratio for preview container
  const pageAspect = useMemo(() => {
    const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;
    return pageOrientation === "portrait" ? dim.w / dim.h : dim.h / dim.w;
  }, [pageSize, pageOrientation]);
  const [showLegendInPrint, setShowLegendInPrint] = useState(true);
  const [showPageBorder, setShowPageBorder] = useState(false);
  const [legendMoveMode, setLegendMoveMode] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const svgWrapRef = useRef(null);

  // Persist legend position per-map in localStorage so it survives close/reopen
  const legendKey = mapData?.id ? `legend_pos_${mapData.id}` : null;
  const [legendCustomPos, setLegendCustomPos] = useState(() => {
    if (!legendKey) return null;
    try {
      const saved = localStorage.getItem(legendKey);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const updateLegendPos = useCallback((pos) => {
    setLegendCustomPos(pos);
    if (legendKey) {
      if (pos) localStorage.setItem(legendKey, JSON.stringify(pos));
      else localStorage.removeItem(legendKey);
    }
  }, [legendKey]);

  // Extract all mogas from objects
  const availableMogas = useMemo(() => {
    const s = new Set();
    for (const o of objects) {
      if ((o.type === "chakbandi" || o.type === "mustateel") && o.mogaNumber) s.add(o.mogaNumber);
    }
    return [...s].sort((a, b) => parseInt(a) - parseInt(b));
  }, [objects]);

  // In B&W mode, override all colors to black/grey; pencil mode uses dim grey + red mouza
  const effectiveColors = useMemo(() => {
    if (bwMode) {
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
    }
    if (pencilMode) return { ...(colorSettings || {}), ...PENCIL_COLORS };
    return colorSettings || {};
  }, [bwMode, pencilMode, colorSettings]);

  const svgData = useMemo(
    () => buildSVG(objects, effectiveColors, mogaFilter || null, killaVisibility, 0.5, khakaDastiMode),
    [objects, effectiveColors, mogaFilter, killaVisibility, khakaDastiMode]
  );

  // Per-acre land-uses actually shown (respecting the moga filter) — for the legend
  const landUses = useMemo(() => {
    if (!mogaFilter) return collectLandUses(objects);
    const filtered = objects.filter(o => {
      if (o.type === "chakbandi") return o.mogaNumber === mogaFilter;
      if (o.type === "mustateel") return o.mogaNumber === mogaFilter || !o.mogaNumber;
      return true;
    });
    return collectLandUses(filtered);
  }, [objects, mogaFilter]);

  // Full-scale SVG for actual print / SVG download — moga at 100%
  const printSvgData = useMemo(
    () => buildSVG(objects, effectiveColors, mogaFilter || null, killaVisibility, 1, khakaDastiMode),
    [objects, effectiveColors, mogaFilter, killaVisibility, khakaDastiMode]
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
      updateLegendPos(pos);
      setLegendMoveMode(false);
    }
  }, [legendMoveMode, screenToSVG, updateLegendPos]);

  // Auto-calculate CCA/GCA per chakbandi — use user's centerLabel if entered
  const gcaData = useMemo(() => {
    const parcels = objects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type));
    const canals = objects.filter(o => o.type === "canal");
    const chakbandis = objects.filter(o => o.type === "chakbandi");
    const results = [];
    let total = 0;
    for (const ch of chakbandis) {
      if (ch.points?.length >= 3) {
        const gca = calculateChakbandiGCA(ch, parcels, canals);
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

  const legendSVG = showLegendInPrint ? buildLegendSVG(svgData?.viewX, svgData?.viewY, svgData?.viewW, svgData?.viewH, effectiveColors, getObjectsBounds(objects), legendCustomPos, landUses) : "";

  const svgString = printSvgData
    ? `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="${printSvgData.viewX} ${printSvgData.viewY} ${printSvgData.viewW} ${printSvgData.viewH}"
     width="${printSvgData.viewW}" height="${printSvgData.viewH}">
  <rect x="${printSvgData.viewX}" y="${printSvgData.viewY}" width="${printSvgData.viewW}" height="${printSvgData.viewH}" fill="white"/>
  ${printSvgData.svgBody}
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
    // Mobile browsers can't handle window.open + document.write + print reliably
    // (shows about:blank). Fall back to direct PDF download on mobile.
    const isMobile = (typeof window !== "undefined" && window.innerWidth < 768) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    if (isMobile) { handleDownloadPDF(); return; }
    const totalGCA = calculateTotalGCA(objects);
    const headerHTML = buildPrintHeaderHTML(mapData, { compactBottom: khakaDastiMode });
    const footerHTML = buildPrintFooterHTML(mapData);

    // Auto-calculated CCA/GCA for each chakbandi — use user's centerLabel if entered,
    // positioned ABOVE the chakbandi boundary (not at centroid)
    const parcels = objects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type));
    const canals = objects.filter(o => o.type === "canal");
    const chakbandis = objects.filter(o => o.type === "chakbandi");
    const lblFont = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30;
    let gcaLabels = "";
    if (!khakaDastiMode) {
      for (const ch of chakbandis) {
        if (ch.points?.length >= 3) {
          const gca = calculateChakbandiGCA(ch, parcels, canals);
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
    }

    const win = window.open("", "_blank");
    if (!win) { return; }
    const printLegendSVG = (showLegendInPrint && !khakaDastiMode) ? buildLegendSVG(svgData.viewX, svgData.viewY, svgData.viewW, svgData.viewH, effectiveColors, getObjectsBounds(objects), legendCustomPos, landUses) : "";
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Khaka Dasti</title>
      <style>
        @font-face { font-family: 'Jameel Noori Nastaleeq'; src: url('https://cdn.jsdelivr.net/gh/tariq-abdullah/urdu-web-font-CDN/JameelNooriNastaleeq.woff') format('woff'); font-display: swap; }
        @page { margin: 0; size: ${pageSize} ${pageOrientation}; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; overflow:hidden; background:#fff; font-family: Rajdhani, Arial, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
        body { display: flex; flex-direction: column;${showPageBorder ? ` border:2px solid #3b82f6;` : ""} }
        .map-wrap { flex: 1; min-height: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
        .map-wrap svg { width:100%; height:100%; display:block; }
        .map-wrap svg * { -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
        @media print {
          @page { margin: 0; size: ${pageSize} ${pageOrientation}; }
          html, body { width:100%; height:100%; overflow:hidden; -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
          body { -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
          * { -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
        }
      </style>
    </head><body>
      ${headerHTML}
      <div class="map-wrap">
        <svg xmlns="http://www.w3.org/2000/svg"
             viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}"
             preserveAspectRatio="xMidYMid meet"
              style="width:100%;height:100%;display:block;">
          <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
          ${printSvgData.svgBody}
          ${gcaLabels}
          ${printLegendSVG}
        </svg>
      </div>
      ${khakaDastiMode ? "" : footerHTML}
    </body></html>`);
    win.document.close();
    let printed = false;
    const doPrint = () => { if (printed) return; printed = true; setTimeout(() => win.print(), 400); };
    win.onload = () => setTimeout(doPrint, 600);
    setTimeout(doPrint, 1500);
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

  // ─── PDF FILE DOWNLOAD (jsPDF — saves to storage on mobile) ──────────────────
  const handleDownloadPDF = async () => {
    if (!svgString) return;
    setPdfLoading(true);
    try {
      const canvas = await svgToCanvas(svgString, 2);
      const blob = await canvasToPdfBlob(canvas, mapData, pageOrientation, pageSize, printMargin);
      downloadBlob(blob, `${mapData?.title || "map"}${mogaFilter ? `_moga_${mogaFilter}` : ""}.pdf`);
      toast.success("PDF محفوظ ہو گیا");
    } catch (e) {
      toast.error("PDF بنانے میں مسئلہ");
    }
    setPdfLoading(false);
  };

  // ─── SHARE PDF (Web Share API — WhatsApp etc.) ───────────────────────────────
  const handleSharePDF = async () => {
    if (!svgString) return;
    setPdfLoading(true);
    try {
      const canvas = await svgToCanvas(svgString, 2);
      const blob = await canvasToPdfBlob(canvas, mapData, pageOrientation, pageSize, printMargin);
      const fname = `${mapData?.title || "map"}${mogaFilter ? `_moga_${mogaFilter}` : ""}.pdf`;
      const result = await shareBlob(blob, fname, mapData?.title || "Map", "Chakbandi GIS Map");
      if (result === "unsupported") {
        downloadBlob(blob, fname);
        toast.info("شیئرنگ سپورٹڈ نہیں — PDF ڈاؤن لوڈ ہو گیا");
      }
    } catch (e) {
      toast.error("شیئر کرنے میں مسئلہ");
    }
    setPdfLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-none sm:rounded-2xl shadow-2xl flex flex-col w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[95vh]">

        {/* Header */}
        <div className="flex flex-col gap-2 px-3 sm:px-5 py-2 sm:py-3 border-b border-slate-200 bg-slate-50 rounded-none sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Printer className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-bold text-slate-800 font-heading tracking-wider shrink-0">PRINT PREVIEW</span>
              <span className="text-xs text-slate-500 truncate hidden sm:inline">{mapData?.title}</span>
            </div>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-700 shrink-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
            {/* Pencil Mode Toggle — lead-pencil sketch style, red mouza */}
            <button
              onClick={() => setPencilMode(v => !v)}
              className={`h-8 px-3 rounded-md text-xs font-bold border transition-all ${pencilMode ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}
              title="Lead Pencil Mode — dim grey lines, red mouza"
            >
              ✏️ پنسل
            </button>
            {/* Khaka Dasti — hand-drawn pencil sketch: only drawn mustateels + faint full-page grid */}
            <button
              onClick={() => setKhakaDastiMode(v => !v)}
              className={`h-8 px-3 rounded-md text-xs font-bold border transition-all ${khakaDastiMode ? "bg-stone-700 text-white border-stone-700" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}
              title="Khaka Dasti — hand-drawn pencil sketch with full-page grid"
            >
              ✏️ خاکہ دستی
            </button>
            {/* SVG Download */}
            <Button size="sm" variant="outline"
              className="h-8 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs gap-1"
              onClick={handleDownloadSVG}>
              <FileText className="w-3.5 h-3.5" /> SVG
            </Button>
            {/* PDF File Download — saves to storage on mobile */}
            <Button size="sm" variant="outline" disabled={pdfLoading}
              className="h-8 border-red-300 text-red-600 hover:text-red-900 hover:bg-red-50 text-xs gap-1"
              onClick={handleDownloadPDF}>
              {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
            </Button>
            {/* Share PDF — WhatsApp etc. */}
            <Button size="sm" disabled={pdfLoading}
              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1"
              onClick={handleSharePDF}>
              {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />} شیئر
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
          </div>
        </div>

        {/* Options bar */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
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
                  onClick={() => updateLegendPos(null)}
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
        <div className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-6 flex items-start justify-center">
          <div
            ref={svgWrapRef}
            className={`bg-white shadow-2xl relative flex flex-col ${legendMoveMode ? "cursor-crosshair ring-4 ring-green-400/50" : ""}`}
            style={{ width: `${scale}%`, minWidth: 280, maxWidth: pageOrientation === "portrait" ? 460 : 900, aspectRatio: pageAspect, border: showPageBorder ? `2px solid #3b82f6` : "none" }}
            onClick={handlePreviewClick}
          >
            <PrintHeaderBox mapData={mapData} compact={khakaDastiMode} />
            {/* SVG Map — pure inline vector, fills remaining space between header & footer */}
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
              {inlineSvgMarkup ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox={`${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ width:"100%", height:"100%", display:"block" }}
                  dangerouslySetInnerHTML={{ __html: inlineSvgMarkup }}
                />
              ) : (
                <div style={{ padding:40, textAlign:"center", color:"#999" }}>No objects to print</div>
              )}
            </div>
            {!khakaDastiMode && (
              <div dangerouslySetInnerHTML={{ __html: buildPrintFooterHTML(mapData) }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}