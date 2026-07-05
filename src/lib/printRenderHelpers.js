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

// ─── Default outlet label position (at the arrow tip) ─────────────────────
export function getOutletLabelPos(obj) {
  if (obj.labelPos) return obj.labelPos;
  const size = DIMENSIONS.CANAL_WIDTH * 10;
  const headLen = size * 1.6;
  // Use a reasonable default font — callers can override
  const numFont = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.38 * 2;
  const gap = headLen + numFont * 0.8;
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
  const padX = fontPx * 0.45, padY = fontPx * 0.35;
  const textW = fontPx * Math.max(numStr.length, sideStr.length, 1) * 0.65;
  const boxW = textW + padX * 2;
  const boxH = fontPx * 2.0 + padY * 2;
  const bx = cx - boxW / 2, by = cy - boxH / 2;

  // Box background
  ctx.fillStyle = boxColor || "rgba(120,225,245,0.92)";
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = borderColor || "#4a6772";
  ctx.lineWidth = Math.max(1.5, fontPx * 0.07);
  ctx.strokeRect(bx, by, boxW, boxH);

  // Fraction inside — vertically centred
  const lineY = cy;
  const numY = cy - fontPx * 0.55;
  const sideY = cy + fontPx * 0.55;
  const inkColor = "#000000";

  ctx.fillStyle = inkColor;
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = Math.max(1.5, fontPx * 0.08);
  ctx.textAlign = "center";

  if (numStr) {
    ctx.font = `bold ${fontPx}px Rajdhani, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(numStr, cx, numY);
  }
  ctx.beginPath();
  ctx.moveTo(cx - textW / 2, lineY);
  ctx.lineTo(cx + textW / 2, lineY);
  ctx.stroke();
  if (sideStr) {
    ctx.font = `bold ${fontPx * 0.8}px Rajdhani, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(sideStr, cx, sideY);
  }
}

// ─── SVG: moga fraction inside a square box ──────────────────────────────
export function svgMogaFractionBox(num, side, cx, cy, fontPx, boxColor, borderColor) {
  if (!num && !side) return "";
  const numStr = String(num || "");
  const sideStr = String(side || "");
  const padX = fontPx * 0.45, padY = fontPx * 0.35;
  const textW = fontPx * Math.max(numStr.length, sideStr.length, 1) * 0.65;
  const boxW = textW + padX * 2;
  const boxH = fontPx * 2.0 + padY * 2;
  const bx = cx - boxW / 2, by = cy - boxH / 2;
  const lineY = cy;
  const numY = cy - fontPx * 0.55;
  const sideY = cy + fontPx * 0.55;

  let svg = `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="${boxColor || 'rgba(120,225,245,0.92)'}" stroke="${borderColor || '#4a6772'}" stroke-width="${Math.max(1.5, fontPx * 0.07).toFixed(1)}"/>`;
  if (numStr) {
    svg += `<text x="${cx.toFixed(1)}" y="${numY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${fontPx.toFixed(1)}" fill="#000">${numStr}</text>`;
  }
  svg += `<line x1="${(cx - textW/2).toFixed(1)}" y1="${lineY.toFixed(1)}" x2="${(cx + textW/2).toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="#000" stroke-width="${Math.max(1.5, fontPx * 0.08).toFixed(1)}"/>`;
  if (sideStr) {
    svg += `<text x="${cx.toFixed(1)}" y="${sideY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${(fontPx * 0.8).toFixed(1)}" fill="#000">${sideStr}</text>`;
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

  ctx.fillStyle = boxColor || "rgba(255,255,255,0.94)";
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = borderColor || "#166534";
  ctx.lineWidth = Math.max(1.5, fontPx * 0.06);
  ctx.strokeRect(bx, by, boxW, boxH);

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

  let svg = `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" fill="${boxColor || 'rgba(255,255,255,0.94)'}" stroke="${borderColor || '#166534'}" stroke-width="${sw}"/>`;
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

// ─── Legend SVG: symbol + label for each map element type ────────────────
// Placed in the top-right corner of the viewBox.
export function buildLegendSVG(viewX, viewY, viewW, viewH, C) {
  const items = [
    { label: "Mustateel (مستتصل)", color: C.mustateelStroke || "#ef4444", type: "rect" },
    { label: "Canal (راجباہ)", color: C.canalStroke || "#0284c7", type: "line" },
    { label: "Khal (خال)", color: C.khalStroke || "#2563eb", type: "line_thin" },
    { label: "Road (راستہ)", color: C.roadStroke || "#b45309", type: "line_thick" },
    { label: "Chakbandi (چکبندی)", color: C.chakbandiStroke || "#22c55e", type: "cross" },
    { label: "Moga / Outlet (موگہ)", color: C.outletStroke || "#06b6d4", type: "arrow" },
    { label: "Mouza (موضع)", color: C.mouzaStroke || "#000000", type: "dashed" },
  ];

  const legendW = 200, rowH = 22, headerH = 24;
  const legendH = items.length * rowH + headerH + 10;
  const lx = viewX + viewW - legendW - 10;
  const ly = viewY + 10;

  let svg = `<rect x="${lx}" y="${ly}" width="${legendW}" height="${legendH}" fill="rgba(255,255,255,0.96)" stroke="#333" stroke-width="1.5" rx="4"/>`;
  svg += `<text x="${lx + legendW/2}" y="${ly + 16}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="13" fill="#333">LEGEND / رہنمائی</text>`;
  svg += `<line x1="${lx+8}" y1="${ly+20}" x2="${lx+legendW-8}" y2="${ly+20}" stroke="#ccc" stroke-width="1"/>`;

  items.forEach((item, i) => {
    const iy = ly + headerH + 10 + i * rowH + rowH/2;
    const symX = lx + 14;
    const symW = 22;
    if (item.type === "rect") {
      svg += `<rect x="${symX}" y="${iy-7}" width="${symW}" height="14" fill="none" stroke="${item.color}" stroke-width="2"/>`;
      svg += `<line x1="${symX+symW/2}" y1="${iy-7}" x2="${symX+symW/2}" y2="${iy+7}" stroke="${item.color}" stroke-width="1" stroke-opacity="0.5"/>`;
    } else if (item.type === "line") {
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="4" stroke-linecap="round"/>`;
    } else if (item.type === "line_thin") {
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="2.5" stroke-linecap="round"/>`;
    } else if (item.type === "line_thick") {
      svg += `<rect x="${symX}" y="${iy-4}" width="${symW}" height="8" fill="#3a3a3a"/>`;
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="#fbbf24" stroke-width="1" stroke-dasharray="4,3"/>`;
    } else if (item.type === "cross") {
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="2"/>`;
      svg += `<line x1="${symX+6}" y1="${iy-5}" x2="${symX+12}" y2="${iy+5}" stroke="${item.color}" stroke-width="1.5"/>`;
      svg += `<line x1="${symX+12}" y1="${iy-5}" x2="${symX+6}" y2="${iy+5}" stroke="${item.color}" stroke-width="1.5"/>`;
    } else if (item.type === "arrow") {
      svg += `<rect x="${symX}" y="${iy-5}" width="8" height="10" fill="${item.color}"/>`;
      svg += `<line x1="${symX+8}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="2"/>`;
      svg += `<polygon points="${symX+symW},${iy} ${symX+symW-5},${iy-3} ${symX+symW-5},${iy+3}" fill="${item.color}"/>`;
    } else if (item.type === "dashed") {
      svg += `<line x1="${symX}" y1="${iy}" x2="${symX+symW}" y2="${iy}" stroke="${item.color}" stroke-width="1.5" stroke-dasharray="4,3"/>`;
    }
    svg += `<text x="${symX + symW + 10}" y="${iy}" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-size="11" fill="#333">${item.label}</text>`;
  });

  return svg;
}

// ─── Moga details SVG: list of all outlets with their numbers ────────────
// Placed in the bottom-left corner of the viewBox.
export function buildMogaDetailsSVG(viewX, viewY, viewW, viewH, objects, mapData) {
  const outlets = objects.filter(o => o.type === "outlet" && (o.mogha_number || o.mogha_side || o.mogha_name));
  if (outlets.length === 0) return "";

  const detailW = 220, rowH = 18, headerH = 24;
  const detailH = outlets.length * rowH + headerH + 10;
  const dx = viewX + 10;
  const dy = viewY + viewH - detailH - 10;

  let svg = `<rect x="${dx}" y="${dy}" width="${detailW}" height="${detailH}" fill="rgba(255,255,255,0.96)" stroke="#333" stroke-width="1.5" rx="4"/>`;
  svg += `<text x="${dx + detailW/2}" y="${dy + 16}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="13" fill="#333">MOGA DETAILS / موگہ تفصیل</text>`;
  svg += `<line x1="${dx+8}" y1="${dy+20}" x2="${dx+detailW-8}" y2="${dy+20}" stroke="#ccc" stroke-width="1"/>`;

  outlets.forEach((o, i) => {
    const iy = dy + headerH + 10 + i * rowH + rowH/2;
    const num = o.mogha_number || "-";
    const side = o.mogha_side || "-";
    const name = o.mogha_name || "";
    svg += `<text x="${dx + 10}" y="${iy}" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-size="10" fill="#333">Moga ${num}/${side}${name ? ' — ' + name : ''}</text>`;
  });

  return svg;
}

// ─── CANVAS: draw legend in screen space (top-right corner) ──────────────
export function drawLegendOnCanvas(ctx, canvasW, canvasH, C) {
  const items = [
    { label: "Mustateel", color: C.mustateelStroke || "#ef4444", type: "rect" },
    { label: "Canal", color: C.canalStroke || "#0284c7", type: "line" },
    { label: "Khal", color: C.khalStroke || "#2563eb", type: "line_thin" },
    { label: "Road", color: C.roadStroke || "#b45309", type: "line_thick" },
    { label: "Chakbandi", color: C.chakbandiStroke || "#22c55e", type: "cross" },
    { label: "Moga / Outlet", color: C.outletStroke || "#06b6d4", type: "arrow" },
    { label: "Mouza", color: C.mouzaStroke || "#000", type: "dashed" },
  ];
  const legendW = 170, rowH = 20, headerH = 24;
  const legendH = items.length * rowH + headerH + 10;
  const lx = canvasW - legendW - 10;
  const ly = 10;

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillRect(lx, ly, legendW, legendH);
  ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
  ctx.strokeRect(lx, ly, legendW, legendH);

  ctx.fillStyle = "#333";
  ctx.font = "bold 12px Rajdhani, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("LEGEND", lx + legendW / 2, ly + 14);
  ctx.strokeStyle = "#ccc"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(lx + 8, ly + 20); ctx.lineTo(lx + legendW - 8, ly + 20); ctx.stroke();

  items.forEach((item, i) => {
    const iy = ly + headerH + 10 + i * rowH + rowH / 2;
    const symX = lx + 14, symW = 22;
    ctx.strokeStyle = item.color; ctx.fillStyle = item.color; ctx.lineWidth = 2;
    if (item.type === "rect") {
      ctx.strokeRect(symX, iy - 7, symW, 14);
    } else if (item.type === "line") {
      ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
    } else if (item.type === "line_thin") {
      ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
    } else if (item.type === "line_thick") {
      ctx.fillStyle = "#3a3a3a"; ctx.fillRect(symX, iy - 4, symW, 8);
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
      ctx.setLineDash([]);
    } else if (item.type === "cross") {
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(symX + 6, iy - 5); ctx.lineTo(symX + 12, iy + 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(symX + 12, iy - 5); ctx.lineTo(symX + 6, iy + 5); ctx.stroke();
    } else if (item.type === "arrow") {
      ctx.fillRect(symX, iy - 5, 8, 10);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(symX + 8, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(symX + symW, iy); ctx.lineTo(symX + symW - 5, iy - 3); ctx.lineTo(symX + symW - 5, iy + 3); ctx.closePath(); ctx.fill();
    } else if (item.type === "dashed") {
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(symX, iy); ctx.lineTo(symX + symW, iy); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "#333"; ctx.font = "11px Rajdhani, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(item.label, symX + symW + 8, iy);
  });
}

// ─── CANVAS: draw moga details in screen space (bottom-left corner) ──────
export function drawMogaDetailsOnCanvas(ctx, canvasW, canvasH, objects) {
  const outlets = objects.filter(o => o.type === "outlet" && (o.mogha_number || o.mogha_side || o.mogha_name));
  if (outlets.length === 0) return;
  const detailW = 200, rowH = 16, headerH = 24;
  const detailH = outlets.length * rowH + headerH + 10;
  const dx = 10;
  const dy = canvasH - detailH - 10;

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillRect(dx, dy, detailW, detailH);
  ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
  ctx.strokeRect(dx, dy, detailW, detailH);

  ctx.fillStyle = "#333"; ctx.font = "bold 12px Rajdhani, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("MOGA DETAILS", dx + detailW / 2, dy + 14);
  ctx.strokeStyle = "#ccc"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(dx + 8, dy + 20); ctx.lineTo(dx + detailW - 8, dy + 20); ctx.stroke();

  outlets.forEach((o, i) => {
    const iy = dy + headerH + 10 + i * rowH + rowH / 2;
    const text = `Moga ${o.mogha_number || "-"}/${o.mogha_side || "-"}${o.mogha_name ? " — " + o.mogha_name : ""}`;
    ctx.fillStyle = "#333"; ctx.font = "10px Rajdhani, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(text, dx + 10, iy);
  });
}