// ============================================================
// CANAL STYLES — shared professional canal rendering
// Used by: GISRenderer (editor canvas), PrintPreview (print SVG),
// ExportDialog (export canvas + export SVG).
// Existing "flat" and "3d" styles stay in each renderer untouched;
// this module owns the 8 NEW styles + the Side Boundary feature.
// ============================================================

import { getParallelPolyline, DIMENSIONS, drawSmoothPath, drawSmoothPathContinue } from "@/lib/gisEngine";

export const CANAL_STYLES = [
  { key: "flat",         label: "Flat",        swatch: "#2196F3" },
  { key: "3d",           label: "3D Ribbon",    swatch: "#1d6fa5" },
  { key: "concrete",     label: "Concrete",    swatch: "#9ca3af" },
  { key: "earth",       label: "Earth",        swatch: "#a16207" },
  { key: "water",       label: "Water",        swatch: "#2196F3" },
  { key: "3dwater",     label: "3D Water",      swatch: "#0ea5e9" },
  { key: "green",       label: "Green",         swatch: "#16a34a" },
  { key: "greenWater",  label: "Green Water",   swatch: "linear-gradient(90deg,#16a34a 0 28%,#1d4ed8 28% 72%,#16a34a 72%)" },
  { key: "engineering", label: "Engineering",   swatch: "#2563eb" },
  { key: "dashed",      label: "Dashed",        swatch: "#3b82f6" },
  { key: "custom",      label: "Custom",        swatch: null },
  { key: "luminous",    label: "Luminous",      swatch: "#29b6f6" },
  { key: "dotted",      label: "Dotted",        swatch: "repeating-linear-gradient(90deg,#29b6f6,#29b6f6 4px,#fff 4px,#fff 5px)" },
  { key: "natural",     label: "Natural",       swatch: "linear-gradient(135deg,#4fc3f7 65%,#2e7d32 65%)" },
  { key: "dualTone",    label: "Dual Tone",     swatch: "linear-gradient(90deg,#29b6f6 0 50%,#0d47a1 50%)" },
  { key: "hatched",     label: "Hatched",       swatch: "repeating-linear-gradient(45deg,#4fc3f7,#4fc3f7 3px,#0d47a1 3px,#0d47a1 5px)" },
];

const NEW_STYLES = ["concrete", "earth", "water", "3dwater", "green", "greenWater", "engineering", "dashed", "custom", "luminous", "dotted", "natural", "dualTone", "hatched"];
export function isNewCanalStyle(style) { return NEW_STYLES.includes(style); }

// ---- canvas geometry helpers ----
// Smooth Catmull-Rom segments — canals turn fluidly at vertices with constant
// width and round joins (no miter spike), matching the print preview exactly.
function fillBetween(ctx, pts, halfW) {
  const left = getParallelPolyline(pts, -halfW);
  const right = getParallelPolyline(pts, halfW);
  const rightRev = [...right].reverse();
  ctx.beginPath();
  drawSmoothPath(ctx, left);
  ctx.lineTo(rightRev[0].x, rightRev[0].y);
  drawSmoothPathContinue(ctx, rightRev);
  ctx.closePath();
  ctx.fill();
}
function strokeCenter(ctx, pts) { ctx.beginPath(); drawSmoothPath(ctx, pts); ctx.stroke(); }
function strokeSide(ctx, side) { ctx.beginPath(); drawSmoothPath(ctx, side); ctx.stroke(); }
function bankLines(ctx, pts, halfW, color, lw) {
  const left = getParallelPolyline(pts, -halfW);
  const right = getParallelPolyline(pts, halfW);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = "round";
  strokeSide(ctx, left); strokeSide(ctx, right);
}

// ============================================================
// SIDE BOUNDARY — canvas
// Real-world width in feet, perpendicular to the canal path.
// Drawn BEFORE the canal body so the canal sits on top.
// ============================================================
export function drawSideBoundaryCanvas(ctx, obj, zoom, C) {
  if (!obj.sideBoundary) return;
  const leftFt = Math.max(0, obj.leftBoundaryFt || 0);
  const rightFt = Math.max(0, obj.rightBoundaryFt || 0);
  if (!leftFt && !rightFt) return;
  const halfW = (obj.width || DIMENSIONS.CANAL_WIDTH) / 2;
  const bw = !!C?.bw;
  const fill = bw ? "#6b7280" : (obj.boundaryColor || "#b08968");
  const edge = bw ? "#374151" : (obj.boundaryEdgeColor || "#6b4f3a");
  const drawStrip = (innerOff, outerOff) => {
    const inner = getParallelPolyline(obj.points, innerOff);
    const outer = getParallelPolyline(obj.points, outerOff);
    ctx.fillStyle = fill;
    ctx.beginPath();
    drawSmoothPath(ctx, inner);
    ctx.lineTo(outer[outer.length - 1].x, outer[outer.length - 1].y);
    drawSmoothPathContinue(ctx, [...outer].reverse());
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); drawSmoothPath(ctx, outer); ctx.stroke();
  };
  if (leftFt > 0) drawStrip(-halfW, -(halfW + leftFt));
  if (rightFt > 0) drawStrip(halfW, halfW + rightFt);
}

// ============================================================
// NEW CANAL STYLES — canvas
// ============================================================
export function drawCanalStyleCanvas(ctx, obj, style, zoom, C) {
  const w = Math.max(2, obj.width || DIMENSIONS.CANAL_WIDTH);
  const halfW = w / 2;
  const pts = obj.points;
  const custom = obj.customColor;
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  // B&W print mode — render every new canal style as greyscale (grey banks + dark water)
  if (C?.bw) {
    ctx.fillStyle = "#9ca3af"; fillBetween(ctx, pts, halfW);
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = halfW * 1.0; strokeCenter(ctx, pts);
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = Math.max(1, halfW * 0.1); strokeCenter(ctx, pts);
    bankLines(ctx, pts, halfW, "#374151", Math.max(2, 2 / zoom));
    return;
  }

  switch (style) {
    case "concrete":
      ctx.fillStyle = "#9ca3af"; fillBetween(ctx, pts, halfW);
      ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = halfW * 0.9; strokeCenter(ctx, pts);
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = Math.max(1, halfW * 0.12); strokeCenter(ctx, pts);
      bankLines(ctx, pts, halfW, "#4b5563", Math.max(2, 2 / zoom));
      return;
    case "earth":
      ctx.fillStyle = "#a16207"; fillBetween(ctx, pts, halfW);
      ctx.strokeStyle = "#65a30d"; ctx.lineWidth = halfW * 1.5; strokeCenter(ctx, pts);
      ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = halfW * 0.7; strokeCenter(ctx, pts);
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = Math.max(1, halfW * 0.1); strokeCenter(ctx, pts);
      bankLines(ctx, pts, halfW, "#451a03", Math.max(2, 2 / zoom));
      return;
    case "water":
      ctx.fillStyle = "#2196F3"; fillBetween(ctx, pts, halfW);
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = Math.max(1, halfW * 0.1);
      ctx.setLineDash([14 / zoom, 10 / zoom]); strokeCenter(ctx, pts); ctx.setLineDash([]);
      bankLines(ctx, pts, halfW, "#1976D2", Math.max(2, 2 / zoom));
      return;
    case "3dwater":
      ctx.strokeStyle = "#0c4a6e"; ctx.lineWidth = w + 3; strokeCenter(ctx, pts);
      ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = w * 0.72; strokeCenter(ctx, pts);
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = Math.max(1, w * 0.1); strokeCenter(ctx, pts);
      return;
    case "green":
      ctx.fillStyle = "#16a34a"; fillBetween(ctx, pts, halfW);
      ctx.strokeStyle = "#4ade80"; ctx.lineWidth = halfW * 0.9; strokeCenter(ctx, pts);
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = Math.max(1, halfW * 0.1); strokeCenter(ctx, pts);
      bankLines(ctx, pts, halfW, "#15803d", Math.max(2, 2 / zoom));
      return;
    case "greenWater":
      ctx.fillStyle = "#16a34a"; fillBetween(ctx, pts, halfW);
      ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = halfW * 1.2; strokeCenter(ctx, pts);
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = Math.max(1, halfW * 0.1); strokeCenter(ctx, pts);
      bankLines(ctx, pts, halfW, "#15803d", Math.max(2, 2 / zoom));
      return;
    case "engineering":
      ctx.fillStyle = "#2563eb"; fillBetween(ctx, pts, halfW);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.5, halfW * 0.08);
      ctx.setLineDash([14 / zoom, 8 / zoom]); strokeCenter(ctx, pts); ctx.setLineDash([]);
      bankLines(ctx, pts, halfW, "#1e3a8a", Math.max(2, 2 / zoom));
      return;
    case "dashed":
      ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = "#3b82f6"; fillBetween(ctx, pts, halfW); ctx.restore();
      ctx.setLineDash([10 / zoom, 6 / zoom]);
      bankLines(ctx, pts, halfW, "#1d4ed8", Math.max(2, 2 / zoom));
      ctx.setLineDash([]);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.5, halfW * 0.1);
      ctx.setLineDash([12 / zoom, 8 / zoom]); strokeCenter(ctx, pts); ctx.setLineDash([]);
      return;
    case "custom": {
      const c = custom || "#29A9E8";
      ctx.fillStyle = c; fillBetween(ctx, pts, halfW);
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = Math.max(1, halfW * 0.1);
      ctx.setLineDash([14 / zoom, 10 / zoom]); strokeCenter(ctx, pts); ctx.setLineDash([]);
      bankLines(ctx, pts, halfW, c, Math.max(2, 2 / zoom));
      return;
    }
    case "luminous": {
      // Vibrant luminous blue (#29b6f6) + dark blue border (#0d47a1) — glowing solid
      ctx.strokeStyle = "#0d47a1";
      ctx.lineWidth = w + Math.max(1, 3 / zoom);
      ctx.lineCap = "butt"; ctx.lineJoin = "round";
      strokeCenter(ctx, pts);
      ctx.strokeStyle = "#29b6f6";
      ctx.lineWidth = w;
      strokeCenter(ctx, pts);
      // Subtle inner glow
      ctx.strokeStyle = "rgba(129,212,250,0.45)";
      ctx.lineWidth = w * 0.5;
      strokeCenter(ctx, pts);
      return;
    }
    case "dotted": {
      // Light blue fill with white dotted center + dark blue banks
      ctx.fillStyle = "#29b6f6";
      fillBetween(ctx, pts, halfW);
      bankLines(ctx, pts, halfW, "#0d47a1", Math.max(2, 2 / zoom));
      // White dotted center line
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.5, w * 0.15);
      ctx.lineCap = "round";
      ctx.setLineDash([1, Math.max(5, w * 0.5) / zoom]);
      strokeCenter(ctx, pts);
      ctx.setLineDash([]);
      return;
    }
    case "natural": {
      // Textured water (#4fc3f7) with soft natural green banks (#2e7d32)
      ctx.fillStyle = "#4fc3f7";
      fillBetween(ctx, pts, halfW);
      // Soft inner ripple
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = Math.max(1, w * 0.08);
      ctx.setLineDash([8 / zoom, 6 / zoom]);
      strokeCenter(ctx, pts);
      ctx.setLineDash([]);
      // Natural green banks
      bankLines(ctx, pts, halfW, "#2e7d32", Math.max(2, 2.5 / zoom));
      return;
    }
    case "dualTone": {
      // Split: light bright blue (#29b6f6) + deep dark blue (#0d47a1) — dual tone
      ctx.fillStyle = "#0d47a1";
      fillBetween(ctx, pts, halfW);
      // Light blue overlay on left half (from -halfW to center)
      const leftEdge = getParallelPolyline(pts, -halfW);
      const centerRev = [...pts].reverse();
      ctx.fillStyle = "#29b6f6";
      ctx.beginPath();
      drawSmoothPath(ctx, leftEdge);
      ctx.lineTo(centerRev[0].x, centerRev[0].y);
      drawSmoothPathContinue(ctx, centerRev);
      ctx.closePath();
      ctx.fill();
      // Divider line at center
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = Math.max(0.5, 1 / zoom);
      strokeCenter(ctx, pts);
      // Banks
      bankLines(ctx, pts, halfW, "#0d47a1", Math.max(2, 2 / zoom));
      return;
    }
    case "hatched": {
      // Base water fill + diagonal hatch lines + dark banks
      ctx.fillStyle = "#4fc3f7";
      fillBetween(ctx, pts, halfW);
      // Clip to canal shape and draw diagonal hatch
      const left = getParallelPolyline(pts, -halfW);
      const right = getParallelPolyline(pts, halfW);
      const rightRev = [...right].reverse();
      ctx.save();
      ctx.beginPath();
      drawSmoothPath(ctx, left);
      ctx.lineTo(rightRev[0].x, rightRev[0].y);
      drawSmoothPathContinue(ctx, rightRev);
      ctx.closePath();
      ctx.clip();
      // Diagonal hatch lines (y - x = c)
      let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
      for (const p of pts) { if (p.x < bMinX) bMinX = p.x; if (p.y < bMinY) bMinY = p.y; if (p.x > bMaxX) bMaxX = p.x; if (p.y > bMaxY) bMaxY = p.y; }
      const hatchSpacing = Math.max(6, halfW * 1.2);
      ctx.strokeStyle = "rgba(13,71,161,0.35)";
      ctx.lineWidth = Math.max(1, 1.5 / zoom);
      for (let c = bMinY - bMaxX; c < bMaxY - bMinX; c += hatchSpacing) {
        ctx.beginPath();
        ctx.moveTo(bMinX, bMinX + c);
        ctx.lineTo(bMaxX, bMaxX + c);
        ctx.stroke();
      }
      ctx.restore();
      bankLines(ctx, pts, halfW, "#0d47a1", Math.max(2, 2 / zoom));
      return;
    }
  }
}

// ============================================================
// SVG smooth-path helpers
// Smooth Catmull-Rom curves — fluid turns, constant width, no miter spike
// (matches the editor canvas rendering exactly).
// ============================================================
function pointsToLinePath(pts) {
  if (!pts || pts.length < 2) return "";
  const f = (n) => Number(n).toFixed(1);
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) d += ` L${f(pts[i].x)},${f(pts[i].y)}`;
  return d;
}
function pointsToSmoothPath(pts, tension = 0.4) {
  if (!pts || pts.length < 2) return "";
  const f = (n) => Number(n).toFixed(1);
  if (pts.length === 2) return `M${f(pts[0].x)},${f(pts[0].y)} L${f(pts[1].x)},${f(pts[1].y)}`;
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 2;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 2;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 2;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 2;
    d += ` C${f(cp1x)},${f(cp1y)} ${f(cp2x)},${f(cp2y)} ${f(p2.x)},${f(p2.y)}`;
  }
  return d;
}
function stripLeadM(d) { return d.replace(/^M[0-9.,\- ]+/, ""); }

function fillPathD(pts, halfW) {
  const left = getParallelPolyline(pts, -halfW);
  const right = getParallelPolyline(pts, halfW);
  let d = pointsToSmoothPath(left);
  d += ` L${Number(right[right.length - 1].x).toFixed(1)},${Number(right[right.length - 1].y).toFixed(1)}`;
  d += ` ${stripLeadM(pointsToSmoothPath([...right].reverse()))} Z`;
  return d;
}
function bandPathD(pts, innerOff, outerOff) {
  const inner = getParallelPolyline(pts, innerOff);
  const outer = getParallelPolyline(pts, outerOff);
  let d = pointsToSmoothPath(inner);
  d += ` L${Number(outer[outer.length - 1].x).toFixed(1)},${Number(outer[outer.length - 1].y).toFixed(1)}`;
  d += ` ${stripLeadM(pointsToSmoothPath([...outer].reverse()))} Z`;
  return d;
}
function svgFill(pts, halfW, fill, opacity) {
  return `<path d="${fillPathD(pts, halfW)}" fill="${fill}"${opacity != null ? ` fill-opacity="${opacity}"` : ""}/>`;
}
function svgCenter(pts, stroke, width, dash) {
  return `<path d="${pointsToSmoothPath(pts)}" fill="none" stroke="${stroke}" stroke-width="${Number(width).toFixed(2)}"${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;
}
function svgBanks(pts, halfW, stroke, width) {
  const left = getParallelPolyline(pts, -halfW), right = getParallelPolyline(pts, halfW);
  return `<path d="${pointsToSmoothPath(left)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/><path d="${pointsToSmoothPath(right)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ============================================================
// SIDE BOUNDARY — SVG
// ============================================================
export function buildSideBoundarySVG(obj, C) {
  if (!obj.sideBoundary) return "";
  const leftFt = Math.max(0, obj.leftBoundaryFt || 0);
  const rightFt = Math.max(0, obj.rightBoundaryFt || 0);
  if (!leftFt && !rightFt) return "";
  const halfW = (obj.width || DIMENSIONS.CANAL_WIDTH) / 2;
  const bw = !!C?.bw;
  const fill = bw ? "#6b7280" : (obj.boundaryColor || "#b08968");
  const edge = bw ? "#374151" : (obj.boundaryEdgeColor || "#6b4f3a");
  let svg = "";
  const strip = (innerOff, outerOff) => {
    svg += `<path d="${bandPathD(obj.points, innerOff, outerOff)}" fill="${fill}"/>`;
    const outer = getParallelPolyline(obj.points, outerOff);
    svg += `<path d="${pointsToLinePath(outer)}" fill="none" stroke="${edge}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  if (leftFt > 0) strip(-halfW, -(halfW + leftFt));
  if (rightFt > 0) strip(halfW, halfW + rightFt);
  return svg;
}

// ============================================================
// NEW CANAL STYLES — SVG
// ============================================================
export function buildCanalStyleSVG(obj, style, C) {
  const w = Math.max(2, obj.width || DIMENSIONS.CANAL_WIDTH);
  const halfW = w / 2;
  const pts = obj.points;
  const custom = obj.customColor;
  // B&W print mode — render every new canal style as greyscale (grey banks + dark water)
  if (C?.bw) {
    return svgFill(pts, halfW, "#9ca3af")
      + svgCenter(pts, "#1f2937", halfW * 1.0)
      + svgCenter(pts, "rgba(255,255,255,0.35)", Math.max(1, halfW * 0.1))
      + svgBanks(pts, halfW, "#374151", 2);
  }
  switch (style) {
    case "concrete":
      return svgFill(pts, halfW, "#9ca3af")
        + svgCenter(pts, "#1d4ed8", halfW * 0.9)
        + svgCenter(pts, "rgba(255,255,255,0.35)", Math.max(1, halfW * 0.12))
        + svgBanks(pts, halfW, "#4b5563", 2);
    case "earth":
      return svgFill(pts, halfW, "#a16207")
        + svgCenter(pts, "#65a30d", halfW * 1.5)
        + svgCenter(pts, "#1d4ed8", halfW * 0.7)
        + svgCenter(pts, "rgba(255,255,255,0.3)", Math.max(1, halfW * 0.1))
        + svgBanks(pts, halfW, "#451a03", 2);
    case "water":
      return svgFill(pts, halfW, "#2196F3")
        + svgCenter(pts, "rgba(255,255,255,0.45)", Math.max(1, halfW * 0.1), "14,10")
        + svgBanks(pts, halfW, "#1976D2", 2);
    case "3dwater":
      return svgCenter(pts, "#0c4a6e", w + 3)
        + svgCenter(pts, "#0ea5e9", w * 0.72)
        + svgCenter(pts, "rgba(255,255,255,0.35)", Math.max(1, w * 0.1));
    case "green":
      return svgFill(pts, halfW, "#16a34a")
        + svgCenter(pts, "#4ade80", halfW * 0.9)
        + svgCenter(pts, "rgba(255,255,255,0.25)", Math.max(1, halfW * 0.1))
        + svgBanks(pts, halfW, "#15803d", 2);
    case "greenWater":
      return svgFill(pts, halfW, "#16a34a")
        + svgCenter(pts, "#1d4ed8", halfW * 1.2)
        + svgCenter(pts, "rgba(255,255,255,0.3)", Math.max(1, halfW * 0.1))
        + svgBanks(pts, halfW, "#15803d", 2);
    case "engineering":
      return svgFill(pts, halfW, "#2563eb")
        + svgCenter(pts, "#ffffff", Math.max(1.5, halfW * 0.08), "14,8")
        + svgBanks(pts, halfW, "#1e3a8a", 2);
    case "dashed":
      return svgFill(pts, halfW, "#3b82f6", 0.4)
        + `<path d="${pointsToSmoothPath(getParallelPolyline(pts, -halfW))}" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="10,6" stroke-linecap="round" stroke-linejoin="round"/>`
        + `<path d="${pointsToSmoothPath(getParallelPolyline(pts, halfW))}" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-dasharray="10,6" stroke-linecap="round" stroke-linejoin="round"/>`
        + svgCenter(pts, "#ffffff", Math.max(1.5, halfW * 0.1), "12,8");
    case "custom": {
      const c = custom || "#29A9E8";
      return svgFill(pts, halfW, c)
        + svgCenter(pts, "rgba(255,255,255,0.3)", Math.max(1, halfW * 0.1), "14,10")
        + svgBanks(pts, halfW, c, 2);
    }
    case "luminous":
      return svgCenter(pts, "#0d47a1", w + 3)
        + svgCenter(pts, "#29b6f6", w)
        + svgCenter(pts, "rgba(129,212,250,0.45)", Math.max(1, w * 0.5));
    case "dotted":
      return svgFill(pts, halfW, "#29b6f6")
        + svgBanks(pts, halfW, "#0d47a1", 2)
        + `<path d="${pointsToSmoothPath(pts)}" fill="none" stroke="#ffffff" stroke-width="${Math.max(1.5, w * 0.15).toFixed(1)}" stroke-linecap="round" stroke-dasharray="1,${Math.max(5, w * 0.5).toFixed(1)}"/>`;
    case "natural":
      return svgFill(pts, halfW, "#4fc3f7")
        + `<path d="${pointsToSmoothPath(pts)}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="${Math.max(1, w * 0.08).toFixed(1)}" stroke-dasharray="8,6"/>`
        + svgBanks(pts, halfW, "#2e7d32", 2.5);
    case "dualTone": {
      const darkFill = svgFill(pts, halfW, "#0d47a1");
      const leftEdge = getParallelPolyline(pts, -halfW);
      const centerRev = [...pts].reverse();
      let d = pointsToSmoothPath(leftEdge);
      d += ` L${Number(centerRev[0].x).toFixed(1)},${Number(centerRev[0].y).toFixed(1)}`;
      d += ` ${stripLeadM(pointsToSmoothPath(centerRev))} Z`;
      const lightFill = `<path d="${d}" fill="#29b6f6"/>`;
      const divider = `<path d="${pointsToSmoothPath(pts)}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`;
      return darkFill + lightFill + divider + svgBanks(pts, halfW, "#0d47a1", 2);
    }
    case "hatched": {
      const clipId = `hatch_${Math.random().toString(36).slice(2, 8)}`;
      let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
      for (const p of pts) { if (p.x < bMinX) bMinX = p.x; if (p.y < bMinY) bMinY = p.y; if (p.x > bMaxX) bMaxX = p.x; if (p.y > bMaxY) bMaxY = p.y; }
      const hatchSpacing = Math.max(6, halfW * 1.2);
      let hatchLines = "";
      for (let c = bMinY - bMaxX; c < bMaxY - bMinX; c += hatchSpacing) {
        hatchLines += `<line x1="${bMinX.toFixed(1)}" y1="${(bMinX + c).toFixed(1)}" x2="${bMaxX.toFixed(1)}" y2="${(bMaxX + c).toFixed(1)}" stroke="rgba(13,71,161,0.35)" stroke-width="1.5"/>`;
      }
      return svgFill(pts, halfW, "#4fc3f7")
        + `<clipPath id="${clipId}"><path d="${fillPathD(pts, halfW)}"/></clipPath><g clip-path="url(#${clipId})">${hatchLines}</g>`
        + svgBanks(pts, halfW, "#0d47a1", 2);
    }
  }
  return "";
}