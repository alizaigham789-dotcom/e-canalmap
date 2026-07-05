// ============================================================
// PRINT/EXPORT RENDER HELPERS
// Shared logic for SVG + Canvas rendering of moga fractions
// and canal name text-on-path — used by PrintPreview & ExportDialog
// ============================================================

import { getParallelPolyline, DIMENSIONS } from "@/lib/gisEngine";

// Moga fraction box = 2 acres (440×198), font reduced to fit
const MOGA_BOX_W = DIMENSIONS.ACRE.width * 2;   // 440
const MOGA_BOX_H = DIMENSIONS.ACRE.height;       // 198
const MOGA_BOX_FONT = MOGA_BOX_H / 2.5;           // ~79

// Mustateel label font (for legend font matching in print/export)
const MUSTATEEL_LABEL_FONT = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30; // 132

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

// ─── Default outlet label position (at the arrow tip) ─────────────────────
export function getOutletLabelPos(obj) {
  if (obj.labelPos) return obj.labelPos;
  const size = DIMENSIONS.CANAL_WIDTH * 10;
  const headLen = size * 1.6;
  // Gap based on moga box height (2 acres = 198)
  const gap = headLen + MOGA_BOX_H * 0.8;
  const angle = Math.atan2(obj.end.y - obj.start.y, obj.end.x - obj.start.x);
  return {
    x: obj.end.x + Math.cos(angle) * gap,
    y: obj.end.y + Math.sin(angle) * gap,
  };
}

// ─── Get chakbandi label position (custom or default) ────────────────────
export function getChakbandiLabelPos(obj) {
  if (obj.labelPos) return obj.labelPos;
  return chakbandiLabelPosition(obj);
}

// ─── CANVAS: moga fraction inside a square box ───────────────────────────
// Draws number over line over R/L, all inside a coloured box with border.
// The box prevents the moga label from mixing with mustateel numbers.
export function drawMogaFractionBoxOnCanvas(ctx, num, side, cx, cy, fontPx, boxColor, borderColor) {
  if (!num && !side) return;
  const numStr = String(num || "");
  const sideStr = String(side || "");
  // Fixed box = 2 acres (440×198); font reduced to fit
  const f = MOGA_BOX_FONT;
  const boxW = MOGA_BOX_W;
  const boxH = MOGA_BOX_H;
  const bx = cx - boxW / 2, by = cy - boxH / 2;
  const textW = f * Math.max(numStr.length, sideStr.length, 1) * 0.65;

  // Shadow + light transparent background
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.restore();
  ctx.strokeStyle = borderColor || "#4a6772";
  ctx.lineWidth = Math.max(1.5, f * 0.07);
  ctx.strokeRect(bx, by, boxW, boxH);

  // Fraction inside — vertically centred
  const lineY = cy;
  const numY = cy + f * 0.55;
  const sideY = cy - f * 0.55;
  const inkColor = "#000000";

  ctx.fillStyle = inkColor;
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = Math.max(1.5, f * 0.08);
  ctx.textAlign = "center";

  if (numStr) {
    ctx.font = `bold ${f}px Rajdhani, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(numStr, cx, numY);
  }
  ctx.beginPath();
  ctx.moveTo(cx - textW / 2, lineY);
  ctx.lineTo(cx + textW / 2, lineY);
  ctx.stroke();
  if (sideStr) {
    ctx.font = `bold ${f * 0.8}px Rajdhani, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(sideStr, cx, sideY);
  }
}

// ─── SVG: moga fraction inside a square box ──────────────────────────────
export function svgMogaFractionBox(num, side, cx, cy, fontPx, boxColor, borderColor) {
  if (!num && !side) return "";
  const numStr = String(num || "");
  const sideStr = String(side || "");
  // Fixed box = 2 acres (440×198); font reduced to fit
  const f = MOGA_BOX_FONT;
  const boxW = MOGA_BOX_W;
  const boxH = MOGA_BOX_H;
  const bx = cx - boxW / 2, by = cy - boxH / 2;
  const textW = f * Math.max(numStr.length, sideStr.length, 1) * 0.65;
  const lineY = cy;
  const numY = cy + f * 0.55;
  const sideY = cy - f * 0.55;

  // Shadow + light transparent background
  let svg = `<rect x="${(bx+4).toFixed(1)}" y="${(by+4).toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="rgba(0,0,0,0.18)"/>`;
  svg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="rgba(255,255,255,0.55)" stroke="${borderColor || '#4a6772'}" stroke-width="${Math.max(1.5, f * 0.07).toFixed(1)}"/>`;
  if (numStr) {
    svg += `<text x="${cx.toFixed(1)}" y="${numY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${f.toFixed(1)}" fill="#000">${numStr}</text>`;
  }
  svg += `<line x1="${(cx - textW/2).toFixed(1)}" y1="${lineY.toFixed(1)}" x2="${(cx + textW/2).toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="#000" stroke-width="${Math.max(1.5, f * 0.08).toFixed(1)}"/>`;
  if (sideStr) {
    svg += `<text x="${cx.toFixed(1)}" y="${sideY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${(f * 0.8).toFixed(1)}" fill="#000">${sideStr}</text>`;
  }
  return svg;
}

// ─── CANVAS: CCA/GCA fraction inside a box ───────────────────────────────
// Top: CCA value, line, bottom: GCA value — like "345 CCA" over "454 GCA"
export function drawCCAGCAFractionBoxOnCanvas(ctx, ccaText, gcaText, cx, cy, fontPx, boxColor, borderColor) {
  const ccaStr = String(ccaText || "");
  const gcaStr = String(gcaText || "");
  if (!ccaStr && !gcaStr) return;
  const padX = fontPx * 0.4, padY = fontPx * 0.3;
  const textW = fontPx * Math.max(ccaStr.length, gcaStr.length, 1) * 0.58;
  const boxW = textW + padX * 2;
  const boxH = fontPx * 2.0 + padY * 2;
  const bx = cx - boxW / 2, by = cy - boxH / 2;

  // No background — just text and fraction line
  const lineY = cy;
  const ccaY = cy - fontPx * 0.55;
  const gcaY = cy + fontPx * 0.55;
  const ink = "#166534";

  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, fontPx * 0.07);
  ctx.textAlign = "center";

  if (ccaStr) {
    ctx.font = `bold ${fontPx}px Rajdhani, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(ccaStr, cx, ccaY);
  }
  ctx.beginPath();
  ctx.moveTo(cx - textW / 2, lineY);
  ctx.lineTo(cx + textW / 2, lineY);
  ctx.stroke();
  if (gcaStr) {
    ctx.font = `bold ${fontPx * 0.85}px Rajdhani, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(gcaStr, cx, gcaY);
  }
}

// ─── SVG: CCA/GCA fraction inside a box ──────────────────────────────────
export function svgCCAGCAFractionBox(ccaText, gcaText, cx, cy, fontPx, boxColor, borderColor) {
  const ccaStr = String(ccaText || "");
  const gcaStr = String(gcaText || "");
  if (!ccaStr && !gcaStr) return "";
  const padX = fontPx * 0.4, padY = fontPx * 0.3;
  const textW = fontPx * Math.max(ccaStr.length, gcaStr.length, 1) * 0.58;
  const boxW = textW + padX * 2;
  const boxH = fontPx * 2.0 + padY * 2;
  const bx = cx - boxW / 2, by = cy - boxH / 2;
  const lineY = cy;
  const ccaY = cy - fontPx * 0.55;
  const gcaY = cy + fontPx * 0.55;
  const ink = "#166534";
  const sw = Math.max(1.5, fontPx * 0.06).toFixed(1);

  // No background — just text and fraction line
  let svg = "";
  if (ccaStr) {
    svg += `<text x="${cx.toFixed(1)}" y="${ccaY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${fontPx.toFixed(1)}" fill="${ink}">${ccaStr}</text>`;
  }
  svg += `<line x1="${(cx - textW/2).toFixed(1)}" y1="${lineY.toFixed(1)}" x2="${(cx + textW/2).toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="${ink}" stroke-width="${Math.max(1.5, fontPx * 0.07).toFixed(1)}"/>`;
  if (gcaStr) {
    svg += `<text x="${cx.toFixed(1)}" y="${gcaY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${(fontPx * 0.85).toFixed(1)}" fill="${ink}">${gcaStr}</text>`;
  }
  return svg;
}

// ─── Build CCA/GCA text from chakbandi ───────────────────────────────────
// If user entered centerLabel, use it (split by "/" for fraction).
// Otherwise auto-calculate from GCA.
export function getCCAGCAText(chakbandi, gcaValue) {
  if (chakbandi.centerLabel) {
    const parts = chakbandi.centerLabel.split("/");
    if (parts.length >= 2) {
      return { cca: parts[0].trim(), gca: parts[1].trim() };
    }
    return { cca: chakbandi.centerLabel, gca: "" };
  }
  const gca = gcaValue || 0;
  return { cca: `${gca} CCA`, gca: `${gca} GCA` };
}

// ─── Legend SVG: 2-column table (sign | name), 3× bigger ────────────────
export function buildLegendSVG(viewX, viewY, viewW, viewH, C) {
  const items = [
    { label: "راجباہ", color: C.canalStroke || "#0284c7", type: "line" },
    { label: "کھال", color: C.khalStroke || "#2563eb", type: "line_thin" },
    { label: "راستہ", color: C.roadStroke || "#b45309", type: "line_thick" },
    { label: "چکبندی", color: C.chakbandiStroke || "#22c55e", type: "cross" },
    { label: "موگہ", color: C.outletStroke || "#06b6d4", type: "arrow" },
    { label: "موضع", color: C.mouzaStroke || "#000000", type: "dashed" },
  ];

  // 3× bigger; table style with black header
  const S = 7.5;
  const lf = MUSTATEEL_LABEL_FONT;
  const colSignW = 34 * S, colNameW = 42 * S, pad = 6 * S;
  const legendW = colSignW + colNameW + pad * 3;
  const headerH = lf * 1.3, colHdrH = lf * 1.1, rowH = lf * 1.4;
  const legendH = headerH + colHdrH + items.length * rowH + pad;
  const lx = viewX + 8 * S;
  const ly = viewY + viewH - legendH - 8 * S;
  const nameColX = lx + pad;
  const signColX = lx + pad * 2 + colNameW;
  const midX = nameColX + colNameW + pad / 2;

  // Outer border (black)
  let svg = `<rect x="${lx}" y="${ly}" width="${legendW}" height="${legendH}" fill="white" stroke="#000" stroke-width="${(1.5*S).toFixed(1)}"/>`;
  // Black header bar with white "علامات"
  svg += `<rect x="${lx}" y="${ly}" width="${legendW}" height="${headerH}" fill="#000"/>`;
  svg += `<text x="${lx + legendW/2}" y="${ly + headerH*0.65}" text-anchor="middle" font-family="'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu',Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${lf.toFixed(1)}" fill="white">علامات</text>`;
  // Sub-header: right="نام علامت", left="علامت"
  const colHdrY = ly + headerH + colHdrH * 0.55;
  svg += `<text x="${nameColX + colNameW/2}" y="${colHdrY}" text-anchor="middle" dominant-baseline="middle" font-family="'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu',Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${(lf*0.75).toFixed(1)}" fill="#000">نام علامت</text>`;
  svg += `<text x="${signColX + colSignW/2}" y="${colHdrY}" text-anchor="middle" dominant-baseline="middle" font-family="'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu',Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${(lf*0.75).toFixed(1)}" fill="#000">علامت</text>`;
  // Horizontal line under sub-header
  svg += `<line x1="${lx}" y1="${ly+headerH+colHdrH}" x2="${lx+legendW}" y2="${ly+headerH+colHdrH}" stroke="#000" stroke-width="${S}"/>`;
  // Vertical divider down the middle
  svg += `<line x1="${midX}" y1="${ly+headerH}" x2="${midX}" y2="${ly+legendH}" stroke="#000" stroke-width="${S}"/>`;
  // Horizontal lines between data rows
  for (let i = 1; i < items.length; i++) {
    const y = ly + headerH + colHdrH + i * rowH;
    svg += `<line x1="${lx}" y1="${y}" x2="${lx+legendW}" y2="${y}" stroke="#000" stroke-width="${(S*0.5).toFixed(1)}"/>`;
  }

  items.forEach((item, i) => {
    const iy = ly + headerH + colHdrH + i * rowH + rowH/2;
    const symX = signColX + (colSignW - 20*S) / 2;
    const symW = 20 * S;
    if (item.type === "line") {
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="${3*S}" stroke-linecap="round"/>`;
    } else if (item.type === "line_thin") {
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="${2*S}" stroke-linecap="round"/>`;
    } else if (item.type === "line_thick") {
      svg += `<rect x="${symX}" y="${iy-3*S}" width="${symW}" height="${6*S}" fill="#3a3a3a"/>`;
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="#fbbf24" stroke-width="${S}" stroke-dasharray="${3*S},${2*S}"/>`;
    } else if (item.type === "cross") {
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="${1.5*S}"/>`;
      svg += `<line x1="${symX+5*S}" y1="${iy-4*S}" x2="${symX+10*S}" y2="${iy+4*S}" stroke="${item.color}" stroke-width="${S}"/>`;
      svg += `<line x1="${symX+10*S}" y1="${iy-4*S}" x2="${symX+5*S}" y2="${iy+4*S}" stroke="${item.color}" stroke-width="${S}"/>`;
    } else if (item.type === "arrow") {
      svg += `<rect x="${symX}" y="${iy-4*S}" width="${6*S}" height="${8*S}" fill="${item.color}"/>`;
      svg += `<line x1="${symX+6*S}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="${1.5*S}"/>`;
      svg += `<polygon points="${symX+symW},${iy} ${symX+symW-4*S},${iy-2.5*S} ${symX+symW-4*S},${iy+2.5*S}" fill="${item.color}"/>`;
    } else if (item.type === "dashed") {
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="${S}" stroke-dasharray="${3*S},${2*S}"/>`;
    }
    svg += `<text x="${nameColX + colNameW/2}" y="${iy}" text-anchor="middle" dominant-baseline="middle" font-family="'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu',Rajdhani,Arial,sans-serif" font-size="${lf.toFixed(1)}" fill="#000">${item.label}</text>`;
  });

  return svg;
}

// ─── Moga details SVG: list of all outlets with their numbers ────────────
// Placed in the bottom-left corner of the viewBox.
export function buildMogaDetailsSVG(viewX, viewY, viewW, viewH, objects, mapData) {
  const outlets = objects.filter(o => o.type === "outlet" && (o.mogha_number || o.mogha_side || o.mogha_name));
  if (outlets.length === 0) return "";

  // 5× bigger; positioned top-right (legend is now bottom-left)
  const S = 5;
  const detailW = 220 * S, rowH = 18 * S, headerH = 24 * S;
  const detailH = outlets.length * rowH + headerH + 10 * S;
  const dx = viewX + viewW - detailW - 10 * S;
  const dy = viewY + 10 * S;
  const fontHdr = 13 * S, fontRow = 10 * S;

  let svg = `<rect x="${dx}" y="${dy}" width="${detailW}" height="${detailH}" fill="rgba(255,255,255,0.96)" stroke="#333" stroke-width="${1.5*S}" rx="${4*S}"/>`;
  svg += `<text x="${dx + detailW/2}" y="${dy + headerH*0.6}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${fontHdr}" fill="#333">MOGA DETAILS / موگہ تفصیل</text>`;
  svg += `<line x1="${dx+8*S}" y1="${dy+headerH}" x2="${dx+detailW-8*S}" y2="${dy+headerH}" stroke="#ccc" stroke-width="${S}"/>`;

  outlets.forEach((o, i) => {
    const iy = dy + headerH + 10*S + i * rowH + rowH/2;
    const num = o.mogha_number || "-";
    const side = o.mogha_side || "-";
    const name = o.mogha_name || "";
    svg += `<text x="${dx + 10*S}" y="${iy}" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-size="${fontRow}" fill="#333">Moga ${num}/${side}${name ? ' — ' + name : ''}</text>`;
  });

  return svg;
}

// ─── CANVAS: draw legend — 2-column table (sign | name), 3× bigger ───────
export function drawLegendOnCanvas(ctx, canvasW, canvasH, C, scale = 1) {
  const items = [
    { label: "راجباہ", color: C.canalStroke || "#0284c7", type: "line" },
    { label: "کھال", color: C.khalStroke || "#2563eb", type: "line_thin" },
    { label: "راستہ", color: C.roadStroke || "#b45309", type: "line_thick" },
    { label: "چکبندی", color: C.chakbandiStroke || "#22c55e", type: "cross" },
    { label: "موگہ", color: C.outletStroke || "#06b6d4", type: "arrow" },
    { label: "موضع", color: C.mouzaStroke || "#000", type: "dashed" },
  ];
  // 3× bigger; table style with black header
  const S = 7.5;
  const lf = MUSTATEEL_LABEL_FONT * scale;
  const colSignW = 34 * S * scale, colNameW = 42 * S * scale, pad = 6 * S * scale;
  const legendW = colSignW + colNameW + pad * 3;
  const headerH = lf * 1.3, colHdrH = lf * 1.1, rowH = lf * 1.4;
  const legendH = headerH + colHdrH + items.length * rowH + pad;
  const lx = 8 * S * scale;
  const ly = canvasH - legendH - 8 * S * scale;
  const nameColX = lx + pad;
  const signColX = lx + pad * 2 + colNameW;
  const midX = nameColX + colNameW + pad / 2;

  // White background + black border
  ctx.fillStyle = "white";
  ctx.fillRect(lx, ly, legendW, legendH);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5 * S * scale;
  ctx.strokeRect(lx, ly, legendW, legendH);

  // Black header bar with white "علامات"
  ctx.fillStyle = "#000";
  ctx.fillRect(lx, ly, legendW, headerH);
  ctx.fillStyle = "white";
  ctx.font = `bold ${lf}px 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Rajdhani, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("علامات", lx + legendW / 2, ly + headerH * 0.5);

  // Sub-header: right="نام علامت", left="علامت"
  const colHdrY = ly + headerH + colHdrH * 0.55;
  ctx.fillStyle = "#000";
  ctx.font = `bold ${lf * 0.75}px 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Rajdhani, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("نام علامت", nameColX + colNameW / 2, colHdrY);
  ctx.fillText("علامت", signColX + colSignW / 2, colHdrY);

  // Horizontal line under sub-header
  ctx.strokeStyle = "#000"; ctx.lineWidth = S * scale;
  ctx.beginPath(); ctx.moveTo(lx, ly + headerH + colHdrH); ctx.lineTo(lx + legendW, ly + headerH + colHdrH); ctx.stroke();
  // Vertical divider down the middle
  ctx.beginPath(); ctx.moveTo(midX, ly + headerH); ctx.lineTo(midX, ly + legendH); ctx.stroke();
  // Horizontal lines between data rows
  ctx.lineWidth = S * 0.5 * scale;
  for (let i = 1; i < items.length; i++) {
    const y = ly + headerH + colHdrH + i * rowH;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + legendW, y); ctx.stroke();
  }

  items.forEach((item, i) => {
    const iy = ly + headerH + colHdrH + i * rowH + rowH / 2;
    const symX = signColX + (colSignW - 20*S*scale) / 2;
    const symW = 20 * S * scale;
    ctx.strokeStyle = item.color; ctx.fillStyle = item.color; ctx.lineWidth = 1.5 * S * scale;
    if (item.type === "line") {
      ctx.lineWidth = 3*S*scale; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
    } else if (item.type === "line_thin") {
      ctx.lineWidth = 2*S*scale; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
    } else if (item.type === "line_thick") {
      ctx.fillStyle = "#3a3a3a"; ctx.fillRect(symX, iy - 3*S*scale, symW, 6*S*scale);
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = S*scale; ctx.setLineDash([3*S*scale, 2*S*scale]);
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
      ctx.setLineDash([]);
    } else if (item.type === "cross") {
      ctx.lineWidth = 1.5*S*scale;
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
      ctx.lineWidth = S*scale;
      ctx.beginPath(); ctx.moveTo(symX + 5*S*scale, iy - 4*S*scale); ctx.lineTo(symX + 10*S*scale, iy + 4*S*scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(symX + 10*S*scale, iy - 4*S*scale); ctx.lineTo(symX + 5*S*scale, iy + 4*S*scale); ctx.stroke();
    } else if (item.type === "arrow") {
      ctx.fillRect(symX, iy - 4*S*scale, 6*S*scale, 8*S*scale);
      ctx.lineWidth = 1.5*S*scale;
      ctx.beginPath(); ctx.moveTo(symX + 6*S*scale, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(symX + symW, iy); ctx.lineTo(symX + symW - 4*S*scale, iy - 2.5*S*scale); ctx.lineTo(symX + symW - 4*S*scale, iy + 2.5*S*scale); ctx.closePath(); ctx.fill();
    } else if (item.type === "dashed") {
      ctx.lineWidth = S*scale; ctx.setLineDash([3*S*scale, 2*S*scale]);
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "#000"; ctx.font = `${lf}px 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(item.label, nameColX + colNameW / 2, iy);
  });
}

// ─── CANVAS: draw moga details in screen space (bottom-left corner) ──────
export function drawMogaDetailsOnCanvas(ctx, canvasW, canvasH, objects) {
  const outlets = objects.filter(o => o.type === "outlet" && (o.mogha_number || o.mogha_side || o.mogha_name));
  if (outlets.length === 0) return;
  // 5× bigger; positioned top-right (legend is now bottom-left)
  const S = 5;
  const detailW = 200 * S, rowH = 16 * S, headerH = 24 * S;
  const detailH = outlets.length * rowH + headerH + 10 * S;
  const dx = canvasW - detailW - 10 * S;
  const dy = 10 * S;
  const fontHdr = 12 * S, fontRow = 10 * S;

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillRect(dx, dy, detailW, detailH);
  ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5 * S;
  ctx.strokeRect(dx, dy, detailW, detailH);

  ctx.fillStyle = "#333"; ctx.font = `bold ${fontHdr}px Rajdhani, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("MOGA DETAILS", dx + detailW / 2, dy + headerH * 0.6);
  ctx.strokeStyle = "#ccc"; ctx.lineWidth = S;
  ctx.beginPath(); ctx.moveTo(dx + 8*S, dy + headerH); ctx.lineTo(dx + detailW - 8*S, dy + headerH); ctx.stroke();

  outlets.forEach((o, i) => {
    const iy = dy + headerH + 10*S + i * rowH + rowH / 2;
    const text = `Moga ${o.mogha_number || "-"}/${o.mogha_side || "-"}${o.mogha_name ? " — " + o.mogha_name : ""}`;
    ctx.fillStyle = "#333"; ctx.font = `${fontRow}px Rajdhani, sans-serif`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(text, dx + 10*S, iy);
  });
}