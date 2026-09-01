import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, ZoomIn, ZoomOut, FileText } from "lucide-react";
import { getParallelPolyline, getMustateeelKillaGrid, getMustateelKillaCells, getMurabaKillaGrid, getMurabaKillaCells, DIMENSIONS, CHAKBANDI_SCALE, MUSTATEEL_SCALE, getMustateelMouzaSplit, calculateTotalGCA, calculateChakbandiGCA, calculateChakbandiLoopGCA, buildPrintHeaderHTML, buildPrintFooterHTML, mogaNumberFont, canalNameFont, getOutletDimensions } from "@/lib/gisEngine";
import PrintHeaderBox from "@/components/editor/PrintHeaderBox";
import { svgCanalNameOnPath, svgMogaFractionBox, svgCCAGCAFractionBox, svgMogaInfo, getOutletLabelPos, getChakbandiLabelPos, getCCAGCAText, buildLegendSVG, svgRoadName, svgAcreUses, acreUseHasLabel, svgRailwayTracks } from "@/lib/printRenderHelpers";
import { collectLandUses } from "@/lib/landUsePalette";
import { buildSideBoundarySVG, buildCanalStyleSVG, isNewCanalStyle } from "@/lib/canalStyles";
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

// Khaka Dasti (hand-drawn sketch) — lead-pencil grey palette for ALL element types.
// By default every element renders in graphite grey (pencil sketch). The user can
// selectively tick checkboxes to keep specific elements colourful (canal, road,
// chakbandi, moga, mustateel, etc.) while the rest stay grey.
const KHAKA_DASTI_GREY = {
  mustateelStroke: "#6b6b6b",
  murabaStroke: "#6b6b6b",
  gridStroke: "rgba(110,110,110,0.6)",
  labelColor: "#6b6b6b",
  acreStroke: "#6b6b6b",
  acreFill: "none",
  canalStroke: "#6b6b6b",
  canalFill: "#8a8a8a",
  khalStroke: "#6b6b6b",
  roadStroke: "#6b6b6b",
  chakbandiStroke: "#6b6b6b",
  mouzaStroke: "#6b6b6b",
  outletStroke: "#6b6b6b",
};

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "railway", "bridge", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

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
  const greyed = C._greyTypes?.has('mustateel') || C._greyTypes?.has('acre');
  const fillColor = greyed ? "none" : (obj.fillColor || C.acreFill || "rgba(234,179,8,0.08)");
  const strokeColor = greyed ? "#6b6b6b" : (C.acreStroke || "#eab308");
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
  // Use the chakbandi style selected in the object's properties — never force a
  // different style in Khaka Dasti. The colour follows C.chakbandiStroke (grey
  // when greyed, real colour when the user ticks the colourful checkbox).
  const style = obj.chakbandiStyle || "cross";
  const pts = obj.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const label = obj.name || "";
  const midPt = obj.points[Math.floor(obj.points.length/2)];
  // Line thickness — applies to ALL styles (1-10 level → world units via CHAKBANDI_SCALE)
  // Loops style defaults to a thinner line (2) per user preference.
  const defaultThk = style === "loops" ? 2 : (style === "stitched" ? 2 : 6);
  const lineW = CHAKBANDI_SCALE.lineWidth(obj.lineThickness ?? defaultThk);
  const lineColor = C.chakbandiStroke || "#22c55e";
  const labelSvg = label && midPt ? `<text x="${midPt.x.toFixed(1)}" y="${(midPt.y - 8).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="12" fill="${lineColor}">${label}</text>` : "";

  // 5 professional line styles. The style comes from the chakbandi's own properties;
  // the colour follows the grey/colorful toggle via C.chakbandiStroke.
  if (style === "khakaDasti") {
    return `<g>
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="miter"/>
  ${labelSvg}
</g>`;
  }
  if (style === "dashed") {
    // Thin continuous spine (line thickness) + thick dashes (dash thickness) on top,
    // so the path stays visible through the gaps even at large dash spacing.
    const dashGap = CHAKBANDI_SCALE.dashSpacing(obj.dashSpacing || 6);
    const dashW = CHAKBANDI_SCALE.dashThickness(obj.dashThickness ?? obj.lineThickness ?? defaultThk);
    const spineW = Math.max(1, lineW * 0.4);
    return `<g>
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="${spineW.toFixed(1)}" stroke-linecap="round" stroke-linejoin="miter"/>
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="${dashW.toFixed(1)}" stroke-dasharray="${(dashW*2.2).toFixed(1)},${dashGap.toFixed(1)}" stroke-linecap="butt" stroke-linejoin="miter"/>
  ${labelSvg}
</g>`;
  }
  if (style === "dotted") {
    const dotSize = CHAKBANDI_SCALE.dotSize(obj.dotSize || 4);
    const dotSpacing = CHAKBANDI_SCALE.dotSpacing(obj.dotSpacing || 4);
    return `<g>
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="${lineW}" stroke-dasharray="${Math.max(2,dotSize).toFixed(1)},${dotSpacing.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>
  ${labelSvg}
</g>`;
  }
  if (style === "stitched") {
    const spineW = Math.max(2, lineW);
    const tickLen = CHAKBANDI_SCALE.stitchSize(obj.stitchSize || 5);
    const tickSpacing = Math.max(4, CHAKBANDI_SCALE.stitchSpacing(obj.stitchSpacing || 2));
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
    // Spine segments join adjacent ring edges (never crossing the ring interiors),
    // then rings are drawn on top. Matches the canvas editor exactly.
    const r = CHAKBANDI_SCALE.ringSize(obj.ringSize || 4);
    const ringSpacing = Math.max(4, CHAKBANDI_SCALE.ringSpacing(obj.ringSpacing || 3));
    const centers = [];
    for (let i = 0; i < obj.points.length - 1; i++) {
      const a = obj.points[i], b = obj.points[i+1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(segLen / ringSpacing));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        centers.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    let spine = "";
    for (let i = 0; i < centers.length - 1; i++) {
      const p = centers[i], q = centers[i + 1];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= r * 2 + 0.001) continue;
      const ux = dx / d, uy = dy / d;
      spine += `<line x1="${(p.x + ux * r).toFixed(1)}" y1="${(p.y + uy * r).toFixed(1)}" x2="${(q.x - ux * r).toFixed(1)}" y2="${(q.y - uy * r).toFixed(1)}" stroke="${lineColor}" stroke-width="${lineW.toFixed(1)}" stroke-linecap="round"/>`;
    }
    let rings = "";
    for (const c of centers) {
      rings += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${lineColor}" stroke-width="${lineW.toFixed(1)}"/>`;
    }
    return `<g>${spine}${rings}${labelSvg}</g>`;
  }
  if (style === "loops") {
    // Spine segments join adjacent loop edges (never crossing the loop interiors),
    // then loops (ellipses) are drawn on top. Matches the canvas editor exactly.
    // Loops defaults: line size 2, loops size 6, loops spacing 7.
    const loopSize = CHAKBANDI_SCALE.loopsSize(obj.loopsSize || 5);
    const rx = loopSize * 1.4, ry = loopSize * 0.8;
    const loopSpacing = Math.max(4, CHAKBANDI_SCALE.loopsSpacing(obj.loopsSpacing || 5));
    const centers = [];
    for (let i = 0; i < obj.points.length - 1; i++) {
      const a = obj.points[i], b = obj.points[i+1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const steps = Math.max(1, Math.floor(segLen / loopSpacing));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        centers.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, ang });
      }
    }
    let spine = "";
    for (let i = 0; i < centers.length - 1; i++) {
      const p = centers[i], q = centers[i + 1];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= rx * 2 + 0.001) continue;
      const ux = dx / d, uy = dy / d;
      spine += `<line x1="${(p.x + ux * rx).toFixed(1)}" y1="${(p.y + uy * rx).toFixed(1)}" x2="${(q.x - ux * rx).toFixed(1)}" y2="${(q.y - uy * rx).toFixed(1)}" stroke="${lineColor}" stroke-width="${lineW.toFixed(1)}" stroke-linecap="round"/>`;
    }
    let loops = "";
    for (const c of centers) {
      const deg = (c.ang * 180 / Math.PI).toFixed(1);
      loops += `<ellipse cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${lineColor}" stroke-width="${lineW.toFixed(1)}" transform="rotate(${deg} ${c.x.toFixed(1)} ${c.y.toFixed(1)})"/>`;
    }
    return `<g>${spine}${loops}${labelSvg}</g>`;
  }

  // Default: Cross (×) pattern — keeps the user's chakbandi colour + thickness
  const color = C.chakbandiStroke || "#000000";
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

function svgCanal(obj, C, idx, outlets) {
  if (!obj.points || obj.points.length < 2) return "";
  const boundarySvg = buildSideBoundarySVG(obj, C);
  const cf = canalNameFont(obj.width || DIMENSIONS.CANAL_WIDTH);
  const bw = !!C?.bw;
  const unfilled = C._unfilled;
  const nameSvg = obj.name ? svgCanalNameOnPath(obj.points, obj.name, cf, outlets, bw) : "";
  if (unfilled) {
    const w = (obj.width || DIMENSIONS.CANAL_WIDTH);
    const halfW = w / 2;
    const left = getParallelPolyline(obj.points, -halfW);
    const right = getParallelPolyline(obj.points, halfW);
    const strokeColor = C.canalStroke || "#000000";
    return `
<g key="canal_${idx}">
  ${boundarySvg}
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="round"/>
  ${nameSvg}
</g>`;
  }
  if (isNewCanalStyle(obj.canalStyle)) {
    return `<g>${boundarySvg}${buildCanalStyleSVG(obj, obj.canalStyle, C)}${nameSvg}</g>`;
  }
  const w = (obj.width || DIMENSIONS.CANAL_WIDTH);
  const centerPath = pointsToSmoothPath(obj.points);
  // Vivid full-blue water (opaque, saturated, bright) — replaces the old translucent powder blue.
  // In B&W print mode these resolve to black/grey so the canal renders black & white
  // like every other tool (gradient stops use the same colours, not hardcoded blue).
  // Flat canal: vivid editor blue (matches the on-canvas look) unless a grey/B&W
  // print mode is active — then fall back to the greyed colours from C.
  const canalGreyed = C.bw || C._greyTypes?.has('canal');
  const fillColor = canalGreyed ? (C.canalFill || "#8a8a8a") : "#29A9E8";
  const strokeColor = canalGreyed ? (C.canalStroke || "#6b6b6b") : "#1688C7";
  if (obj.canalStyle === "flat") {
    const halfW = w / 2;
    const fillPath = parallelSmoothClosedPath(obj.points, halfW);
    const left = getParallelPolyline(obj.points, -halfW);
    const right = getParallelPolyline(obj.points, halfW);
    // Water gradient across the canal width (deep edges → bright center).
    // Uses fillColor/strokeColor so B&W mode turns the canal black & white.
    const p0 = obj.points[0], p1 = obj.points[obj.points.length - 1];
    const dirAng = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    const perpX = Math.cos(dirAng + Math.PI / 2), perpY = Math.sin(dirAng + Math.PI / 2);
    const midX = (p0.x + p1.x) / 2, midY = (p0.y + p1.y) / 2;
    const gx1 = (midX - perpX * halfW).toFixed(1), gy1 = (midY - perpY * halfW).toFixed(1);
    const gx2 = (midX + perpX * halfW).toFixed(1), gy2 = (midY + perpY * halfW).toFixed(1);
    const gradId = `canalWater_${idx}`;
    const gradDef = `<defs><linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${gx1}" y1="${gy1}" x2="${gx2}" y2="${gy2}"><stop offset="0" stop-color="${strokeColor}"/><stop offset="0.5" stop-color="${fillColor}"/><stop offset="1" stop-color="${strokeColor}"/></linearGradient></defs>`;
    return `
<g key="canal_${idx}">
  ${boundarySvg}
  ${gradDef}
  <path d="${fillPath}" fill="url(#${gradId})" />
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="round"/>
  ${nameSvg}
</g>`;
  }
  return `
<g key="canal_${idx}">
  ${boundarySvg}
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
  const greyed = C._greyTypes?.has('khal');
  const unfilled = C._unfilled;
  const color = greyed ? "#6b6b6b" : (C.khalStroke || "#0D47A1");
  const isDefaultKhal = !C.khalStroke || C.khalStroke === "#0D47A1" || C.khalStroke === "#2563eb";
  const khalFill = unfilled ? "none" : (greyed ? "#8a8a8a" : (obj.fillColor || (isDefaultKhal ? "#1565C0" : color)));
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
  const arrowSvg = obj.noArrow ? "" : (unfilled
    ? `<polygon points="${last.x.toFixed(1)},${last.y.toFixed(1)} ${p1x},${p1y} ${p2x},${p2y}" fill="none" stroke="${color}" stroke-width="2"/>`
    : `<polygon points="${last.x.toFixed(1)},${last.y.toFixed(1)} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}"/>`);
  return `
<g key="khal_${idx}">
  ${unfilled ? "" : `<polygon points="${fillPts}" fill="${khalFill}" />`}
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
  const greyed = C._greyTypes?.has('road');
  const edgeColor = greyed ? "#6b6b6b" : (obj.edgeColor || "#fbbf24");
  const edgeW = obj.edgeWidth || 2;
  const fillColor = greyed ? "#6b6b6b" : (obj.fillColor || "#1a1a1a");
  const centerDash = pointsToSmoothPath(obj.points);
  const nameSvg = obj.name ? svgRoadName(obj.points, obj.name, obj.width || DIMENSIONS.ROAD_WIDTH) : "";
  let railwaySvg = "";
  if (obj.railway && obj.railway.enabled) {
    const rwGauge = obj.railway.gaugeWidth || 24;
    const offset = (obj.railway.side === "left" ? -1 : 1) * ((obj.width || DIMENSIONS.ROAD_WIDTH) / 2 + rwGauge / 2 + 4);
    const rwPath = getParallelPolyline(obj.points, offset);
    railwaySvg = svgRailwayTracks(rwPath, rwGauge, obj.railway.style || 1, { tieSpacing: obj.railway.tieSpacing, gaugeWidth: obj.railway.gaugeWidth, lineWidthScale: 1.5 });
  }
  return `
<g key="road_${idx}">
  <path d="${fillPath}" fill="${fillColor}" />
  <path d="${pointsToSmoothPath(left)}" fill="none" stroke="${edgeColor}" stroke-width="${edgeW}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${pointsToSmoothPath(right)}" fill="none" stroke="${edgeColor}" stroke-width="${edgeW}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${centerDash}" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="14,8" stroke-linecap="round"/>
  ${railwaySvg}
  ${nameSvg}
</g>`;
}

function svgRailway(obj, C, idx) {
  if (!obj.points || obj.points.length < 2) return "";
  const nameSvg = obj.name ? svgRoadName(obj.points, obj.name, obj.width || 24) : "";
  return `<g key="railway_${idx}">${svgRailwayTracks(obj.points, obj.width || 24, obj.railwayStyle || 1, { railColor: obj.railColor, tieColor: obj.tieColor, tieSpacing: obj.tieSpacing, gaugeWidth: obj.gaugeWidth })}${nameSvg}</g>`;
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
  const greyed = C._greyTypes?.has('outlet');
  const unfilled = C._unfilled;
  const color = greyed ? "#6b6b6b" : (obj.outletColor || C.outletStroke || "#dc2626");
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
    const mogaFill = unfilled ? "#000000" : "#FFD700";
    mogaInside = `<text transform="translate(${sx.toFixed(1)},${sy.toFixed(1)}) rotate(${canalAngDeg.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${cf.toFixed(1)}" paint-order="stroke" stroke="rgba(0,0,0,0.85)" stroke-width="${Math.max(2, cf * 0.18).toFixed(1)}" stroke-linejoin="round" fill="${mogaFill}">${mogaText}</text>`;
  }
  const blockFill = unfilled ? "none" : color;
  const blockStroke = unfilled ? color : "#7f1d1d";
  const shaftW = unfilled ? 2 : shaftWidth;
  const arrowFill = unfilled ? "none" : color;
  const arrowExtra = unfilled ? `stroke="${color}" stroke-width="2"` : "";
  return `<g key="outlet_${idx}">
    <rect x="${(sx - half).toFixed(1)}" y="${(sy - half).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${radius.toFixed(1)}" fill="${blockFill}" stroke="${blockStroke}" stroke-width="2"/>
    <line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${color}" stroke-width="${shaftW.toFixed(1)}" stroke-linecap="round"/>
    <polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${h1x},${h1y} ${h2x},${h2y}" fill="${arrowFill}" ${arrowExtra}/>
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
function buildKhakaDastiGuideGridSVG(parcelBounds, allBounds, targetAspect) {
  const mustW = DIMENSIONS.MUSTATEEL.width;
  const mustH = DIMENSIONS.MUSTATEEL.height;
  // The guide grid is anchored on the drawn PARCELS — 2 blank mustateels each side
  // (left/right), 1 at top, 1 at bottom. Roads and canals are NOT the anchor, so the
  // blank mustateels sit beyond the parcels (not beyond the road/canal).
  const leftCount = 2, rightCount = 2, topMust = 1, bottomMust = 1;
  const base = parcelBounds || allBounds;
  let startX = base.minX - leftCount * mustW;
  let endX = base.maxX + rightCount * mustW;
  let startY = base.minY - topMust * mustH;
  let endY = base.maxY + bottomMust * mustH;
  // Only if canals/roads extend BEYOND those blank mustateels, grow the grid on
  // that side to cover them. The parcel area stays the visual anchor.
  if (allBounds) {
    startX = Math.min(startX, allBounds.minX);
    endX = Math.max(endX, allBounds.maxX);
    startY = Math.min(startY, allBounds.minY);
    endY = Math.max(endY, allBounds.maxY);
  }
  // Fill the page: extend the BOTTOM with empty guide rows until the grid's aspect
  // matches the printable content area (targetAspect = contentW/contentH). The
  // drawn map stays at the top (1 dumi mustateel above it); the extra space fills
  // as empty guide grid below, so the whole page is used with no white gap.
  if (targetAspect && targetAspect > 0) {
    const width = endX - startX;
    const targetH = width / targetAspect;
    if (targetH > (endY - startY)) {
      const baseHY = Math.floor(startY / mustH) * mustH;
      endY = baseHY + Math.ceil((startY + targetH - baseHY) / mustH) * mustH;
    }
  }
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

function buildSVG(objects, colorSettings, filterMoga, killaVisibility = {}, mogaScale = 1, khakaDasti = false, targetAspect = null) {
  const C = colorSettings || {};
  const bounds = getObjectsBounds(objects);
  if (!bounds) return null;

  const pad = 20;
  let viewX, viewY, viewW, viewH, guideGridSvg = "";
  if (khakaDasti) {
    const parcelBounds = getObjectsBounds(objects.filter(o => ["acre","mustateel","muraba"].includes(o.type)));
    const guide = buildKhakaDastiGuideGridSVG(parcelBounds || bounds, bounds, targetAspect);
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
      case "railway":   svgParts.push(svgRailway(obj, C, idx)); break;
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
  const [bwUnfilledMode, setBwUnfilledMode] = useState(false);
  const [pencilMode, setPencilMode] = useState(false);
  const [khakaDastiMode, setKhakaDastiMode] = useState(false);
  // Per-element colourful toggle in Khaka Dasti — default all grey (pencil sketch),
  // user ticks to keep specific element types colourful.
  // Khaka Dasti colourful toggles persist across sessions — once the user ticks an
  // element colourful, that choice is remembered for later (not reset to grey each time).
  const KHAKA_COLORFUL_KEY = "khaka_dasti_colorful_prefs_v2";
  const [khakaColorful, setKhakaColorful] = useState(() => {
    // Default: canal, road, chakbandi, mouza, outlet (moga) kept colourful; rest grey.
    const base = { mustateel: false, muraba: false, canal: true, khal: false, road: true, chakbandi: true, mouza: true, outlet: true };
    try {
      const saved = localStorage.getItem(KHAKA_COLORFUL_KEY);
      if (saved) return { ...base, ...JSON.parse(saved) };
    } catch {}
    return base;
  });
  const updateKhakaColorful = useCallback((updater) => {
    setKhakaColorful(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem(KHAKA_COLORFUL_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const [pageOrientation, setPageOrientation] = useState("portrait");
  const [pageSize, setPageSize] = useState("A4");
  const [printMargin, setPrintMargin] = useState(0); // side margin removed per request

  // Compute page aspect ratio for preview container
  const pageAspect = useMemo(() => {
    const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;
    return pageOrientation === "portrait" ? dim.w / dim.h : dim.h / dim.w;
  }, [pageSize, pageOrientation]);
  // Page width in mm — used to convert the left/right print margin into a percentage
  // for the on-screen preview (the print window uses mm directly).
  const pageWidthMm = useMemo(() => {
    const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;
    return pageOrientation === "portrait" ? dim.w : dim.h;
  }, [pageSize, pageOrientation]);
  const marginPct = pageWidthMm > 0 ? (printMargin / pageWidthMm) * 100 : 0;
  // Khaka Dasti: target aspect of the printable content area (page minus the
  // compact header). The guide grid is extended downward with empty rows so its
  // aspect matches this — the grid then fills the whole page (starting right below
  // the header, no white gap), and the page isn't left mostly blank.
  const khakaTargetAspect = useMemo(() => {
    if (!khakaDastiMode) return null;
    const dim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.A4;
    const isLandscape = pageOrientation === "landscape";
    const pageW = isLandscape ? dim.h : dim.w;
    const pageH = isLandscape ? dim.w : dim.h;
    const headerFrac = 0.12; // compact header occupies ~12% of page height
    return pageW / (pageH * (1 - headerFrac));
  }, [khakaDastiMode, pageSize, pageOrientation]);
  const [showLegendInPrint, setShowLegendInPrint] = useState(true);
  const [showPageBorder, setShowPageBorder] = useState(false);
  const [legendMoveMode, setLegendMoveMode] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const svgWrapRef = useRef(null);

  // Mustateel print size (cm) — lock each mustateel to an exact cm width; height
  // follows the real 440×990 mustateel aspect (no distortion). Default = Auto =
  // current fit-to-page, so leaving it untouched keeps the existing print exactly.
  const MUST_W = DIMENSIONS.MUSTATEEL.width;
  const MUST_ASPECT_H = DIMENSIONS.MUSTATEEL.height / DIMENSIONS.MUSTATEEL.width; // 990/440 = 2.25
  const [mustOverride, setMustOverride] = useState(false); // false → current auto-fit
  const [mustCmW, setMustCmW] = useState(""); // mustateel width in cm (source of truth; height derived)
  const [heightEditing, setHeightEditing] = useState(null); // raw height text while typing (avoids decimal fight)
  const svgMeasureRef = useRef(null);
  const [measuredMustCm, setMeasuredMustCm] = useState({ w: 0, h: 0 });
  const [pagePxPerMm, setPagePxPerMm] = useState(0);

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
    if (bwUnfilledMode) {
      return {
        mustateelStroke: "#000000", mustateelFill: "none",
        murabaStroke: "#000000", murabaFill: "none",
        acreStroke: "#555555", acreFill: "none",
        canalStroke: "#000000", canalFill: "none",
        khalStroke: "#000000",
        roadStroke: "#222222",
        chakbandiStroke: "#000000",
        mouzaStroke: "#000000",
        labelColor: "#000000",
        outletStroke: "#000000",
        bw: true,
        _unfilled: true,
      };
    }
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
        bw: true,
      };
    }
    if (pencilMode) return { ...(colorSettings || {}), ...PENCIL_COLORS };
    if (khakaDastiMode) {
      const cs = colorSettings || {};
      // Build the set of types that should be greyed (not ticked colourful)
      const grey = new Set();
      const keys = ['mustateel','muraba','canal','khal','road','chakbandi','mouza','outlet'];
      for (const k of keys) if (!khakaColorful[k]) grey.add(k);
      // Start from grey palette, then restore real colours for colourful types
      const base = { ...cs, ...KHAKA_DASTI_GREY, _greyTypes: grey };
      if (khakaColorful.mustateel) { base.mustateelStroke = cs.mustateelStroke; base.gridStroke = cs.gridStroke; base.labelColor = cs.labelColor; }
      if (khakaColorful.muraba) { base.murabaStroke = cs.murabaStroke; }
      if (khakaColorful.canal) { base.canalStroke = cs.canalStroke; base.canalFill = cs.canalFill; }
      if (khakaColorful.khal) { base.khalStroke = cs.khalStroke; }
      if (khakaColorful.road) { base.roadStroke = cs.roadStroke; }
      if (khakaColorful.chakbandi) { base.chakbandiStroke = cs.chakbandiStroke; }
      if (khakaColorful.mouza) { base.mouzaStroke = cs.mouzaStroke; }
      if (khakaColorful.outlet) { base.outletStroke = cs.outletStroke; }
      return base;
    }
    return colorSettings || {};
  }, [bwUnfilledMode, bwMode, pencilMode, khakaDastiMode, khakaColorful, colorSettings]);

  const svgData = useMemo(
    () => buildSVG(objects, effectiveColors, mogaFilter || null, killaVisibility, 0.5, khakaDastiMode, khakaTargetAspect),
    [objects, effectiveColors, mogaFilter, killaVisibility, khakaDastiMode, khakaTargetAspect]
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
    () => buildSVG(objects, effectiveColors, mogaFilter || null, killaVisibility, 1, khakaDastiMode, khakaTargetAspect),
    [objects, effectiveColors, mogaFilter, killaVisibility, khakaDastiMode, khakaTargetAspect]
  );

  // Measure the mustateel cm that the current auto-fit (meet) actually produces,
  // straight from the live preview DOM — so the default shown always matches print.
  useEffect(() => {
    const recompute = () => {
      const pb = svgWrapRef.current, svg = svgMeasureRef.current, sd = svgData;
      if (!pb || !svg || !sd) return;
      const ppmm = pb.clientWidth / pageWidthMm;
      if (ppmm > 0) setPagePxPerMm(ppmm);
      if (!ppmm || ppmm <= 0) return;
      const meetScale = Math.min(svg.clientWidth / sd.viewW, svg.clientHeight / sd.viewH);
      if (!meetScale || meetScale <= 0) return;
      const wCm = (MUST_W * meetScale) / ppmm / 10;
      setMeasuredMustCm({ w: +wCm.toFixed(2), h: +(wCm * MUST_ASPECT_H).toFixed(2) });
    };
    recompute();
    let ro;
    if (svgWrapRef.current && window.ResizeObserver) {
      ro = new ResizeObserver(recompute);
      ro.observe(svgWrapRef.current);
    }
    return () => ro && ro.disconnect();
  }, [svgData, scale, pageWidthMm, MUST_W, MUST_ASPECT_H, mustOverride]);

  // mm-per-world-unit when overriding; null = keep current auto-fit (meet)
  const overrideMmPerWorld = (mustOverride && mustCmW && parseFloat(mustCmW) > 0)
    ? (parseFloat(mustCmW) * 10) / MUST_W
    : null;
  // Preview px size of the SVG when overriding (uses measured px-per-mm of the page)
  const overridePreviewStyle = (overrideMmPerWorld && pagePxPerMm > 0)
    ? {
        width: `${(svgData.viewW * overrideMmPerWorld * pagePxPerMm).toFixed(1)}px`,
        height: `${(svgData.viewH * overrideMmPerWorld * pagePxPerMm).toFixed(1)}px`,
        display: "block",
      }
    : { width: "100%", height: "100%", display: "block" };

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
    const roads = objects.filter(o => o.type === "road");
    const chakbandis = objects.filter(o => o.type === "chakbandi");
    const results = [];
    let total = 0;
    for (const ch of chakbandis) {
      if (ch.points?.length >= 3) {
        const gca = calculateChakbandiLoopGCA(ch, parcels, canals, roads);
        if (gca > 0 || ch.centerLabel) {
          const lp = getChakbandiLabelPos(ch, objects);
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

  const legendSVG = showLegendInPrint ? buildLegendSVG(svgData?.viewX, svgData?.viewY, svgData?.viewW, svgData?.viewH, effectiveColors, getObjectsBounds(objects), legendCustomPos, landUses, objects) : "";

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
    const roads = objects.filter(o => o.type === "road");
    const chakbandis = objects.filter(o => o.type === "chakbandi");
    const lblFont = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30;
    let gcaLabels = "";
    if (!khakaDastiMode) {
      for (const ch of chakbandis) {
        if (ch.points?.length >= 3) {
          const gca = calculateChakbandiLoopGCA(ch, parcels, canals, roads);
          if (gca > 0 || ch.centerLabel) {
            const lp = getChakbandiLabelPos(ch, objects);
            if (!lp) continue;
            const { cca, gca: gcaTxt } = getCCAGCAText(ch, gca);
            if (cca || gcaTxt) {
              gcaLabels += svgCCAGCAFractionBox(cca, gcaTxt, lp.x, lp.y, lblFont, "rgba(255,255,255,0.94)", effectiveColors.chakbandiStroke || "#166534");
            }
          }
        }
      }
    }

    // Mustateel-print-size override: render the SVG at an exact physical mm size so
    // each mustateel measures mustCmW cm wide (height follows the 440×990 aspect).
    const mapSvgStyle = overrideMmPerWorld
      ? `width:${(svgData.viewW * overrideMmPerWorld).toFixed(2)}mm;height:${(svgData.viewH * overrideMmPerWorld).toFixed(2)}mm;display:block;`
      : `width:100%;height:100%;display:block;`;
    const printLegendSVG = (showLegendInPrint && !khakaDastiMode) ? buildLegendSVG(svgData.viewX, svgData.viewY, svgData.viewW, svgData.viewH, effectiveColors, getObjectsBounds(objects), legendCustomPos, landUses, objects) : "";
    const printDocHtml = `<!DOCTYPE html><html><head>
      <title>${mapData?.title || "Map Print"}</title>
      <style>
        @font-face { font-family: 'Jameel Noori Nastaleeq'; src: url('https://cdn.jsdelivr.net/gh/tariq-abdullah/urdu-web-font-CDN/JameelNooriNastaleeq.woff') format('woff'); font-display: swap; }
        @page { margin: 0; size: ${pageSize} ${pageOrientation}; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; overflow:hidden; background:#fff; font-family: Rajdhani, Arial, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
        body { display: flex; flex-direction: column;${showPageBorder ? ` border:2px solid #3b82f6;` : ""} }
        .map-wrap { flex: 1; min-height: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
        .map-wrap svg { ${mapSvgStyle} }
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
      <div class="map-wrap" style="padding-left:${printMargin}mm; padding-right:${printMargin}mm;">
        <svg xmlns="http://www.w3.org/2000/svg"
             viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}"
             preserveAspectRatio="xMidYMid meet">
          <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
          ${printSvgData.svgBody}
          ${gcaLabels}
          ${printLegendSVG}
        </svg>
      </div>
      ${khakaDastiMode ? "" : footerHTML}
    </body></html>`;

    // Print via a hidden iframe — avoids the about:blank white-tab / popup-blocker
    // problem that left the user with a blank screen instead of a print preview.
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    let printed = false;
    const cleanup = () => { setTimeout(() => { try { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch {} }, 500); };
    const triggerPrint = () => {
      if (printed) return; printed = true;
      try {
        const cw = iframe.contentWindow;
        if (cw && typeof cw.addEventListener === "function") {
          cw.addEventListener("afterprint", cleanup, { once: true });
        }
        if (cw) { cw.focus(); cw.print(); }
        else cleanup();
      } catch { cleanup(); }
      // Fallback cleanup if the afterprint event never fires.
      setTimeout(cleanup, 45000);
    };
    iframe.onload = () => {
      const doc = iframe.contentDocument;
      const fontsReady = (doc && doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve();
      Promise.race([fontsReady, new Promise(r => setTimeout(r, 1200))])
        .then(() => setTimeout(triggerPrint, 100));
    };
    iframe.srcdoc = printDocHtml;
    // Safety net: if onload never fires (e.g. font CDN slow), still print.
    setTimeout(() => { if (!printed) triggerPrint(); }, 2200);
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
            {/* B&W Unfilled — outer lines only, empty inside (hand-colour after print) */}
            <button
              onClick={() => setBwUnfilledMode(v => !v)}
              className={`h-8 px-3 rounded-md text-xs font-bold border transition-all ${bwUnfilledMode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}
              title="Black & White Unfilled — canal/khal/moga outer lines only, empty inside for hand-colouring"
            >
              {bwUnfilledMode ? "⬛ B&W خالی" : "⚪ B&W خالی"}
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
          {/* Khaka Dasti per-element colourful toggles */}
          {khakaDastiMode && (
            <div className="flex items-center gap-1.5 flex-wrap bg-stone-100 rounded-lg px-2 py-1 border border-stone-300">
              <span className="text-[9px] font-bold text-stone-600 whitespace-nowrap" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>رنگین رکھیں:</span>
              {[
                { key: 'mustateel', label: 'مستطیل', color: '#6b6b6b' },
                { key: 'muraba', label: 'مر FCCa', color: '#6b6b6b' },
                { key: 'canal', label: 'کینال', color: '#1688C7' },
                { key: 'khal', label: 'خال', color: '#0D47A1' },
                { key: 'road', label: 'سڑک', color: '#1a1a1a' },
                { key: 'chakbandi', label: 'چکبندی', color: '#22c55e' },
                { key: 'mouza', label: 'موضع', color: '#dc2626' },
                { key: 'outlet', label: 'موگا', color: '#06b6d4' },
              ].map(({ key, label, color }) => (
                <label key={key} className="flex items-center gap-1 cursor-pointer select-none" title={`Keep ${label} colourful`}>
                  <input
                    type="checkbox"
                    checked={khakaColorful[key]}
                    onChange={e => updateKhakaColorful(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="w-3 h-3 accent-stone-600"
                  />
                  <span
                    className="text-[10px] font-medium"
                    style={{
                      fontFamily: "'Noto Nastaliq Urdu', sans-serif",
                      color: khakaColorful[key] ? color : '#9a9a9a',
                      textDecoration: khakaColorful[key] ? 'none' : 'line-through',
                    }}
                  >{label}</span>
                </label>
              ))}
            </div>
          )}
          {/* Legend toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={showLegendInPrint} onChange={e => setShowLegendInPrint(e.target.checked)}
              className="w-3 h-3 accent-blue-500" />
            <span className="text-[10px] text-slate-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>علامات دکھائیں</span>
          </label>
          {/* Page margin (left/right) — 0 = full page, no margin */}
          <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-slate-300">
            <span className="text-[10px] text-slate-600 whitespace-nowrap" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>پیج مارجن</span>
            <input
              type="range" min={0} max={40} step={1} value={printMargin}
              onChange={e => setPrintMargin(parseInt(e.target.value))}
              className="w-16 h-1 accent-blue-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-500 w-10">{printMargin}mm</span>
          </div>
          {/* Mustateel print size (cm) — length/width linked by real 440×990 aspect */}
          <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-slate-300 flex-wrap">
            <span className="text-[10px] text-slate-600 whitespace-nowrap" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>مستطیل پرنٹ سائز</span>
            <label className="flex items-center gap-1 cursor-pointer select-none" title="Auto = current fit-to-page (unchanged print)">
              <input type="checkbox" checked={!mustOverride} onChange={e => setMustOverride(!e.target.checked)} className="w-3 h-3 accent-blue-500" />
              <span className="text-[9px] text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>آٹو</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>چوڑائی</span>
              <input type="number" min={1} max={5} step={0.1}
                value={mustOverride ? mustCmW : (measuredMustCm.w ? String(+measuredMustCm.w.toFixed(2)) : "")}
                onChange={e => { setMustOverride(true); setMustCmW(e.target.value); setHeightEditing(null); }}
                className="w-14 h-6 text-[10px] text-center border border-slate-200 rounded font-mono bg-white focus:border-blue-500 outline-none" />
              <span className="text-[8px] text-slate-400">cm</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>لمبائی</span>
              <input type="number" min={1} max={5} step={0.1}
                value={heightEditing !== null
                  ? heightEditing
                  : (mustOverride
                      ? (mustCmW && !isNaN(parseFloat(mustCmW)) ? String(+(parseFloat(mustCmW) * MUST_ASPECT_H).toFixed(2)) : "")
                      : (measuredMustCm.h ? String(+measuredMustCm.h.toFixed(2)) : ""))}
                onChange={e => { setMustOverride(true); setHeightEditing(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n)) setMustCmW(n / MUST_ASPECT_H); }}
                onBlur={() => setHeightEditing(null)}
                className="w-14 h-6 text-[10px] text-center border border-slate-200 rounded font-mono bg-white focus:border-blue-500 outline-none" />
              <span className="text-[8px] text-slate-400">cm</span>
            </div>
            <span className="text-[8px] text-slate-400" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>1–5 سینٹی میٹر · دونوں باہمی جڑے ہوئے</span>
          </div>
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
            {/* SVG Map — pure inline vector, fills remaining space between header & footer.
                Left/right page margin applies here only (header & footer stay full-width). */}
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center" style={{ paddingLeft: `${marginPct}%`, paddingRight: `${marginPct}%` }}>
              {inlineSvgMarkup ? (
                <svg
                  ref={svgMeasureRef}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox={`${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={overridePreviewStyle}
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