// ============================================================
// PRINT/EXPORT RENDER HELPERS
// Shared logic for SVG + Canvas rendering of moga fractions
// and canal name text-on-path — used by PrintPreview & ExportDialog
// ============================================================

import { getParallelPolyline, DIMENSIONS } from "@/lib/gisEngine";

// ─── Canal name: total length + segment lengths ──────────────────────────
function pathSegments(points) {
  const segLens = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLens.push(d);
    total += d;
  }
  return { segLens, total };
}

// Advance along the path by `dist` starting from segIdx/segRemaining.
// Returns { segIdx, segRemaining } or null if past the end.
function advanceAlongPath(segLens, segIdx, segRemaining, dist) {
  let remaining = dist;
  while (remaining > 0 && segIdx < segLens.length) {
    if (remaining <= segRemaining) {
      return { segIdx, segRemaining: segRemaining - remaining };
    }
    remaining -= segRemaining;
    segIdx++;
    if (segIdx < segLens.length) segRemaining = segLens[segIdx];
  }
  return segIdx < segLens.length ? { segIdx, segRemaining } : null;
}

// Get world position + tangent angle at a given distance along the path
function pointAtDistance(points, segLens, segIdx, segRemaining) {
  if (segIdx >= segLens.length) return null;
  const p1 = points[segIdx];
  const p2 = points[Math.min(segIdx + 1, points.length - 1)];
  const t = segLens[segIdx] > 0 ? 1 - segRemaining / segLens[segIdx] : 0;
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
    angle: Math.atan2(p2.y - p1.y, p2.x - p1.x),
  };
}

// ─── CANVAS: draw canal name text along the canal centerline ─────────────
// Bright yellow fill + dark outline, repeats every ~5 acres (1100 ft).
export function drawCanalNameOnCanvas(ctx, points, text, fontSize) {
  if (!points || points.length < 2 || !text) return;
  const { segLens, total } = pathSegments(points);
  if (total < 1) return;

  const charW = fontSize * 0.55;
  const textW = text.length * charW;
  const repeatSpacing = 1100; // ~5 acres of frontage

  ctx.font = `bold ${fontSize}px Rajdhani, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let startDist = 0; startDist + textW < total; startDist += repeatSpacing) {
    let segIdx = 0;
    let segRem = segLens[0];
    const start = advanceAlongPath(segLens, segIdx, segRem, startDist);
    if (!start) break;
    segIdx = start.segIdx;
    segRem = start.segRemaining;

    for (let ci = 0; ci < text.length; ci++) {
      // Advance half a char to center the character
      const half = advanceAlongPath(segLens, segIdx, segRem, charW * 0.5);
      if (!half) break;
      segIdx = half.segIdx;
      segRem = half.segRemaining;

      const pos = pointAtDistance(points, segLens, segIdx, segRem);
      if (!pos) break;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.angle);
      // Dark outline for contrast against blue water
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = Math.max(2, fontSize * 0.18);
      ctx.lineJoin = "round";
      ctx.strokeText(text[ci], 0, 0);
      // Bright yellow fill
      ctx.fillStyle = "#fef08a";
      ctx.fillText(text[ci], 0, 0);
      ctx.restore();

      // Advance second half of character
      const half2 = advanceAlongPath(segLens, segIdx, segRem, charW * 0.5);
      if (!half2) break;
      segIdx = half2.segIdx;
      segRem = half2.segRemaining;
    }
  }
}

// ─── SVG: generate canal name text along the canal centerline ────────────
// Each character is a <text> with a dark stroke (outline) + yellow fill,
// positioned and rotated to follow the path. Repeats every ~5 acres.
export function svgCanalNameOnPath(points, text, fontSize) {
  if (!points || points.length < 2 || !text) return "";
  const { segLens, total } = pathSegments(points);
  if (total < 1) return "";

  const charW = fontSize * 0.55;
  const textW = text.length * charW;
  const repeatSpacing = 1100;
  let svg = "";

  for (let startDist = 0; startDist + textW < total; startDist += repeatSpacing) {
    let segIdx = 0;
    let segRem = segLens[0];
    const start = advanceAlongPath(segLens, segIdx, segRem, startDist);
    if (!start) break;
    segIdx = start.segIdx;
    segRem = start.segRemaining;

    for (let ci = 0; ci < text.length; ci++) {
      const half = advanceAlongPath(segLens, segIdx, segRem, charW * 0.5);
      if (!half) break;
      segIdx = half.segIdx;
      segRem = half.segRemaining;

      const pos = pointAtDistance(points, segLens, segIdx, segRem);
      if (!pos) break;

      const deg = (pos.angle * 180) / Math.PI;
      // paint-order: stroke fill — draws stroke first so fill is on top (outline effect)
      svg += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${fontSize.toFixed(1)}" fill="#fef08a" stroke="rgba(0,0,0,0.85)" stroke-width="${(Math.max(2, fontSize * 0.18)).toFixed(1)}" stroke-linejoin="round" paint-order="stroke" transform="rotate(${deg.toFixed(1)} ${pos.x.toFixed(1)} ${pos.y.toFixed(1)})">${text[ci]}</text>`;

      const half2 = advanceAlongPath(segLens, segIdx, segRem, charW * 0.5);
      if (!half2) break;
      segIdx = half2.segIdx;
      segRem = half2.segRemaining;
    }
  }
  return svg;
}

// ─── SVG: moga number as a fraction (number over line over R/L) ──────────
// Positioned at (x, y). Returns SVG markup.
export function svgMogaFraction(num, side, x, y, fontPx, color) {
  if (!num && !side) return "";
  const numStr = String(num || "");
  const sideStr = String(side || "");
  // Line width scales with the number text width
  const lineW = fontPx * Math.max(numStr.length, 1) * 0.65;
  // Number on top (baseline bottom so it sits above the line)
  const numSvg = numStr
    ? `<text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="middle" dominant-baseline="bottom" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${fontPx.toFixed(1)}" fill="${color}">${numStr}</text>`
    : "";
  // Horizontal line
  const lineSvg = `<line x1="${(x - lineW / 2).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + lineW / 2).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="${Math.max(1.5, fontPx * 0.08).toFixed(1)}"/>`;
  // R/L below the line
  const sideSvg = sideStr
    ? `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" dominant-baseline="top" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${(fontPx * 0.8).toFixed(1)}" fill="${color}">${sideStr}</text>`
    : "";
  return numSvg + lineSvg + sideSvg;
}

// ─── CANVAS: moga number as a fraction (number over line over R/L) ───────
export function drawMogaFractionOnCanvas(ctx, num, side, x, y, fontPx, color) {
  if (!num && !side) return;
  const numStr = String(num || "");
  const sideStr = String(side || "");
  const lineW = fontPx * Math.max(numStr.length, 1) * 0.65;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, fontPx * 0.08);

  // Number on top
  if (numStr) {
    ctx.font = `bold ${fontPx}px Rajdhani, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(numStr, x, y - 2);
  }
  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(x - lineW / 2, y);
  ctx.lineTo(x + lineW / 2, y);
  ctx.stroke();
  // R/L below
  if (sideStr) {
    ctx.font = `bold ${fontPx * 0.8}px Rajdhani, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(sideStr, x, y + 4);
  }
}

// ─── GCA/CCA label position: above the chakbandi (top of bounding box) ───
export function chakbandiLabelPosition(chakbandi) {
  if (!chakbandi.points || chakbandi.points.length === 0) return null;
  let minY = Infinity, cx = 0;
  for (const p of chakbandi.points) {
    if (p.y < minY) minY = p.y;
    cx += p.x;
  }
  cx /= chakbandi.points.length;
  return { x: cx, y: minY };
}