// ============================================================
// GIS RENDERER — Pure canvas drawing functions
// Z-Index Layer Stack (0–5), Anti-aliased zoom scaling,
// Symmetric bilateral buffering, Vector fill patterns
// ============================================================

import { getParallelPolyline, getMustateeelKillaGrid, getMurabaKillaGrid, createFillPattern, DIMENSIONS, drawSmoothPath, CHAKBANDI_SCALE, MUSTATEEL_SCALE } from "@/lib/gisEngine";

// ---- Anti-aliased zoom-clamped font size ----
// For print: use a larger effective min so labels are always readable regardless of zoom
function scaledFont(basePx, zoom, minPx = 11, maxPx = 28) {
  return Math.max(minPx, Math.min(maxPx, basePx / zoom));
}

// Screen-clamped font: keeps a readable on-screen size (minScreen..maxScreen)
// regardless of zoom, while scaling with parcel geometry. Returns world units.
function screenClampedFont(worldSize, zoom, minScreen = 14, maxScreen = 26) {
  const screen = worldSize * zoom;
  return Math.max(minScreen, Math.min(maxScreen, screen)) / zoom;
}

// Print-aware font: ignores zoom clamping — uses a fixed pt size based on cell dimensions
function printFont(cellW, cellH, fraction = 0.22, minPx = 12) {
  return Math.max(minPx, Math.min(cellW, cellH) * fraction);
}

// Draw rectangular (squared-off) end caps for canals/roads/khals
function drawSquaredCap(ctx, side, isStart) {
  if (side.length < 2) return;
  const idx = isStart ? 0 : side.length - 1;
  const p = side[idx];
  // The cap is already a straight edge; we just draw the closing perpendicular line
  // between left[idx] and right[idx] in the caller
}

// ============================================================
// LAYER 0: Grid (editor mode only, stripped in print/export)
// gridFlags: { showMustateel, showMuraba }
// ============================================================
export function drawGrid(ctx, W, H, zoom, pan, gridFlags = {}) {
  const { showMustateel = true, showMuraba = false } = gridFlags;

  const acreW = DIMENSIONS.ACRE.width, acreH = DIMENSIONS.ACRE.height;
  const mustW = DIMENSIONS.MUSTATEEL.width, mustH = DIMENSIONS.MUSTATEEL.height;
  const murbW = DIMENSIONS.MURABA.width, murbH = DIMENSIONS.MURABA.height;
  const startX = Math.floor(-pan.x / zoom / murbW) * murbW - murbW;
  const startY = Math.floor(-pan.y / zoom / murbH) * murbH - murbH;
  const endX = startX + W / zoom + murbW * 2;
  const endY = startY + H / zoom + murbH * 2;

  // Mustateel grid — always visible at any zoom level
  if (showMustateel) {
    // Acre sub-grid — subtle, always shown
    ctx.strokeStyle = "rgba(100,100,100,0.10)";
    ctx.lineWidth = 0.4 / zoom;
    ctx.setLineDash([4/zoom, 4/zoom]);
    ctx.beginPath();
    for (let x = Math.floor(startX / acreW) * acreW; x < endX; x += acreW) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = Math.floor(startY / acreH) * acreH; y < endY; y += acreH) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();
    ctx.setLineDash([]);
    // Mustateel boundary grid — always visible
    ctx.strokeStyle = "rgba(180,60,60,0.20)";
    ctx.lineWidth = 0.8 / zoom;
    ctx.beginPath();
    for (let x = Math.floor(startX / mustW) * mustW; x < endX; x += mustW) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = Math.floor(startY / mustH) * mustH; y < endY; y += mustH) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();
  }

  // Muraba grid (coarser)
  if (showMuraba) {
    ctx.strokeStyle = "rgba(249,115,22,0.22)";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([8/zoom, 4/zoom]);
    ctx.beginPath();
    for (let x = Math.floor(startX / murbW) * murbW; x < endX; x += murbW) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = Math.floor(startY / murbH) * murbH; y < endY; y += murbH) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ============================================================
// LAYER 1+2: Parcels (fill then boundary)
// ============================================================
export function drawAcre(ctx, obj, isSelected, zoom, C) {
  // Layer 1: Fill
  const fs = obj.fillStyle || "solid";
  if (fs === "solid") {
    ctx.fillStyle = obj.fillColor || C.acreFill || "rgba(234,179,8,0.08)";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  } else {
    ctx.fillStyle = "rgba(234,179,8,0.05)";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    const pat = createFillPattern(ctx, fs, obj.fillColor || "#eab308", obj.fillOpacity || 0.4, obj.fillSpacing || 8);
    if (pat) {
      ctx.save(); ctx.translate(obj.x, obj.y);
      ctx.fillStyle = pat; ctx.fillRect(0, 0, obj.w, obj.h);
      ctx.restore();
    }
  }

  // Layer 2: Boundary
  ctx.strokeStyle = isSelected ? "#60a5fa" : (C.acreStroke || "#eab308");
  ctx.lineWidth = (isSelected ? 2 : 1.5) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Layer 5: Label
  if (obj.label) {
    ctx.fillStyle = C.labelColor || "#000000";
    ctx.font = `bold ${scaledFont(12, zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
  }
}

export function drawMustateel(ctx, obj, isSelected, zoom, C, showKillaNumbers = true, mouzaSplit = null) {
  const ks = obj.killaStyle || {};
  const fs = obj.fillStyle || "solid";

  // Layer 1: Fill
  if (fs === "solid") {
    ctx.fillStyle = obj.fillColor || C.mustateelFill || "rgba(245,158,11,0.10)";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  } else {
    ctx.fillStyle = "rgba(245,158,11,0.05)";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    const pat = createFillPattern(ctx, fs, obj.fillColor || "#ef4444", obj.fillOpacity || 0.35, obj.fillSpacing || 8);
    if (pat) {
      ctx.save(); ctx.translate(obj.x, obj.y);
      ctx.fillStyle = pat; ctx.fillRect(0, 0, obj.w, obj.h);
      ctx.restore();
    }
  }

  // Layer 2: Outer boundary — RED, thick (world-unit thickness, matches print/export)
  ctx.strokeStyle = isSelected ? "#60a5fa" : (C.mustateelStroke || "#ef4444");
  ctx.lineWidth = (MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness) + (isSelected ? 3 : 0)) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Layer 2: Killa grid — always visible, subtle ink
  {
    const alpha = ks.strokeOpacity !== undefined ? ks.strokeOpacity : 0.18;
    const ksColor = ks.strokeColor || "#ef4444";
    ctx.strokeStyle = `rgba(${hexToRgb(ksColor)},${alpha})`;
    ctx.lineWidth = Math.max(0.3, (ks.strokeWidth || 0.8)) / zoom;
    if (ks.strokeStyle === "dashed") ctx.setLineDash([6/zoom, 3/zoom]);
    else if (ks.strokeStyle === "dotted") ctx.setLineDash([2/zoom, 3/zoom]);
    else ctx.setLineDash([4/zoom, 4/zoom]);

    const cellW = obj.w / 2, cellH = obj.h / 5;
    ctx.beginPath();
    ctx.moveTo(obj.x + cellW, obj.y); ctx.lineTo(obj.x + cellW, obj.y + obj.h);
    for (let r = 1; r < 5; r++) {
      ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Layer 5: Killa numbers — screen-clamped (min 14px), toggled by showKillaNumbers
    if (showKillaNumbers) {
      const grid = getMustateeelKillaGrid();
      ctx.save();
      ctx.beginPath(); ctx.rect(obj.x, obj.y, obj.w, obj.h); ctx.clip();
      ctx.fillStyle = ks.labelColor || "rgba(220,38,38,0.9)";
      const killaFontSize = screenClampedFont(Math.min(cellW, cellH) * 0.30, zoom, 14, 24);
      ctx.font = `bold ${killaFontSize}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
          ctx.fillText(String(grid[r][c]), obj.x + c * cellW + cellW/2, obj.y + r * cellH + cellH/2);
        }
      }
      ctx.restore();
    }
  }

  // Layer 5: Center label(s) — fixed world-unit size so ALL mustateels look same regardless of label length
  // If a mouza boundary splits this parcel, draw 2 labels (above/below the mouza line) instead of 1
  if (mouzaSplit) {
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x + 2/zoom, obj.y + 2/zoom, obj.w - 4/zoom, obj.h - 4/zoom); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    const maxFontPx = Math.min(obj.w, obj.h) * 0.26;
    const drawSplitLabel = (text, center) => {
      if (!text) return;
      ctx.font = `900 ${maxFontPx}px Rajdhani, sans-serif`;
      const measured = ctx.measureText(text);
      const fitScale = Math.min(1, (obj.w * 0.75) / (measured.width || 1));
      const finalFont = maxFontPx * fitScale;
      ctx.font = `900 ${finalFont}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, center.x, center.y);
    };
    drawSplitLabel(obj.label || "", mouzaSplit.topCenter);
    drawSplitLabel(obj.label2 || "", mouzaSplit.bottomCenter);
    ctx.restore();
  } else {
    const centerX = obj.x + obj.w / 2, centerY = obj.y + obj.h / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x + 2/zoom, obj.y + 2/zoom, obj.w - 4/zoom, obj.h - 4/zoom); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    // Measure text at a large size, then scale down to fit within boundary
    const maxFontPx = Math.min(obj.w, obj.h) * 0.38; // world units, ~38% of smallest dim
    ctx.font = `900 ${maxFontPx}px Rajdhani, sans-serif`;
    const measured = ctx.measureText(obj.label || "");
    // Scale to fit: ensure text width < 80% of obj.w
    const fitScale = Math.min(1, (obj.w * 0.80) / (measured.width || 1));
    const finalFont = maxFontPx * fitScale;
    ctx.font = `900 ${finalFont}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const labelY = (obj.showOwner && obj.ownerName) ? centerY - finalFont * 0.35 : centerY;
    ctx.fillText(obj.label || "", centerX, labelY);
    if (obj.showOwner && obj.ownerName) {
      ctx.fillStyle = "rgba(100,116,139,0.9)";
      const ownerFont = Math.min(obj.w, obj.h) * 0.10;
      ctx.font = `${ownerFont}px Inter, sans-serif`;
      ctx.fillText(obj.ownerName, centerX, labelY + finalFont * 0.55);
    }
    ctx.restore();
  }
}

export function drawMuraba(ctx, obj, isSelected, zoom, C, showKillaNumbers = true) {
  const ks = obj.killaStyle || {};
  const fs = obj.fillStyle || "solid";

  // Layer 1: Fill
  if (fs === "solid") {
    ctx.fillStyle = obj.fillColor || C.murabaFill || "rgba(249,115,22,0.08)";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  } else {
    ctx.fillStyle = "rgba(249,115,22,0.05)";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    const pat = createFillPattern(ctx, fs, obj.fillColor || "#ef4444", obj.fillOpacity || 0.35, obj.fillSpacing || 8);
    if (pat) {
      ctx.save(); ctx.translate(obj.x, obj.y);
      ctx.fillStyle = pat; ctx.fillRect(0, 0, obj.w, obj.h);
      ctx.restore();
    }
  }

  // Layer 2: Outer boundary — RED, thicker
  ctx.strokeStyle = isSelected ? "#60a5fa" : (C.murabaStroke || "#ef4444");
  ctx.lineWidth = (isSelected ? 4 : 3) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Layer 2: Killa grid — always visible, subtle ink
  {
    const alpha = ks.strokeOpacity !== undefined ? ks.strokeOpacity : 0.14;
    const ksColor = ks.strokeColor || "#ef4444";
    ctx.strokeStyle = `rgba(${hexToRgb(ksColor)},${alpha})`;
    ctx.lineWidth = Math.max(0.3, (ks.strokeWidth || 0.8)) / zoom;
    if (ks.strokeStyle === "dashed") ctx.setLineDash([6/zoom, 3/zoom]);
    else if (ks.strokeStyle === "dotted") ctx.setLineDash([2/zoom, 3/zoom]);
    else ctx.setLineDash([4/zoom, 4/zoom]);

    const cellW = obj.w / 5, cellH = obj.h / 5;
    ctx.beginPath();
    for (let c = 1; c < 5; c++) { ctx.moveTo(obj.x + c * cellW, obj.y); ctx.lineTo(obj.x + c * cellW, obj.y + obj.h); }
    for (let r = 1; r < 5; r++) { ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH); }
    ctx.stroke();
    ctx.setLineDash([]);

    // Killa numbers — toggled by showKillaNumbers
    if (showKillaNumbers) {
      const grid = getMurabaKillaGrid();
      ctx.save();
      ctx.beginPath(); ctx.rect(obj.x, obj.y, obj.w, obj.h); ctx.clip();
      ctx.fillStyle = ks.labelColor || "rgba(220,38,38,0.85)";
      const killaFontSize = screenClampedFont(Math.min(cellW, cellH) * 0.26, zoom, 14, 20);
      ctx.font = `bold ${killaFontSize}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.fillText(String(grid[r][c]), obj.x + c * cellW + cellW/2, obj.y + r * cellH + cellH/2);
        }
      }
      ctx.restore();
    }
  }

  // Layer 5: Center label — uniform world-unit size, boundary-clipped
  {
    const centerX = obj.x + obj.w / 2, centerY = obj.y + obj.h / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x + 2/zoom, obj.y + 2/zoom, obj.w - 4/zoom, obj.h - 4/zoom); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    const maxFontPx = Math.min(obj.w, obj.h) * 0.30;
    ctx.font = `900 ${maxFontPx}px Rajdhani, sans-serif`;
    const measured = ctx.measureText(obj.label || "");
    const fitScale = Math.min(1, (obj.w * 0.75) / (measured.width || 1));
    const finalFont = maxFontPx * fitScale;
    ctx.font = `900 ${finalFont}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const labelY = (obj.showOwner && obj.ownerName) ? centerY - finalFont * 0.35 : centerY;
    ctx.fillText(obj.label || "", centerX, labelY);
    if (obj.showOwner && obj.ownerName) {
      ctx.fillStyle = "rgba(100,116,139,0.9)";
      const ownerFont = Math.min(obj.w, obj.h) * 0.07;
      ctx.font = `${ownerFont}px Inter, sans-serif`;
      ctx.fillText(obj.ownerName, centerX, labelY + finalFont * 0.55);
    }
    ctx.restore();
  }
}

// ============================================================
// LAYER 3: Canal — symmetric bilateral buffering, squared ends
// ============================================================
export function drawCanal(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const halfW = obj.width / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);

  // Water fill — smooth closed polygon
  ctx.fillStyle = C.canalFill || "rgba(30,144,255,0.25)";
  ctx.beginPath();
  drawSmoothPath(ctx, left);
  ctx.lineTo(right[right.length - 1].x, right[right.length - 1].y);
  const rightRev = [...right].reverse();
  drawSmoothPath(ctx, rightRev);
  ctx.closePath();
  ctx.fill();

  // Bank lines — smooth curves
  const bankColor = isSelected ? "#93c5fd" : (C.canalStroke || "#0284c7");
  ctx.strokeStyle = bankColor;
  ctx.lineWidth = (isSelected ? 3 : 2.5) / zoom;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const side of [left, right]) {
    ctx.beginPath();
    drawSmoothPath(ctx, side);
    ctx.stroke();
  }
  // End caps
  ctx.lineWidth = (isSelected ? 2.5 : 2) / zoom;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y); ctx.lineTo(right[0].x, right[0].y);
  ctx.moveTo(left[left.length-1].x, left[left.length-1].y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  ctx.stroke();

  // Layer 5: Canal name — RED, center-aligned, rotated along segment angle
  if (obj.name) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = "#dc2626";
    ctx.font = `bold ${scaledFont(14, zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.name, 0, 0);
    ctx.restore();
  }
}

// ============================================================
// LAYER 3: Khal — bilateral buffer, squared ends, uniform width
// ============================================================
export function drawKhal(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const halfW = (obj.width || DIMENSIONS.KHAL_WIDTH) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);

  // Water fill — smooth
  const khalColor = isSelected ? "#93c5fd" : (C.khalStroke || "#2563eb");
  ctx.fillStyle = `${khalColor}33`;
  ctx.beginPath();
  drawSmoothPath(ctx, left);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  drawSmoothPath(ctx, [...right].reverse());
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = khalColor;
  ctx.lineWidth = (isSelected ? 2.5 : 2) / zoom;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const side of [left, right]) {
    ctx.beginPath();
    drawSmoothPath(ctx, side);
    ctx.stroke();
  }

  // Squared rectangular end caps
  ctx.lineWidth = (isSelected ? 2 : 1.5) / zoom;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y); ctx.lineTo(right[0].x, right[0].y);
  ctx.moveTo(left[left.length-1].x, left[left.length-1].y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  ctx.stroke();

  // Flow-direction arrowhead at the khal's ending point
  // Head (tip) at end point, tail behind toward start, tail width = khal width
  const last = obj.points[obj.points.length - 1];
  const prev = obj.points[obj.points.length - 2];
  const fAng = Math.atan2(last.y - prev.y, last.x - prev.x);
  const arrowLen = Math.max(halfW * 2.5, 12 / zoom);
  ctx.save();
  ctx.translate(last.x, last.y); ctx.rotate(fAng);
  ctx.fillStyle = khalColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-arrowLen, -halfW);
  ctx.lineTo(-arrowLen, halfW);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  if (obj.name && zoom > 0.3) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = khalColor;
    ctx.font = `bold ${scaledFont(11, zoom, 9)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.name, 0, -halfW - 3/zoom);
    ctx.restore();
  }
}

// ============================================================
// LAYER 3: Road — bilateral buffer, squared ends, uniform width
// ============================================================
export function drawRoad(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const halfW = (obj.width || DIMENSIONS.ROAD_WIDTH) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);

  // Asphalt fill — smooth
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath();
  drawSmoothPath(ctx, left);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  drawSmoothPath(ctx, [...right].reverse());
  ctx.closePath(); ctx.fill();

  // Casing edges — smooth
  const edgeColor = isSelected ? "#fcd34d" : (C.roadStroke || "#b45309");
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = (isSelected ? 3 : 2.5) / zoom;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const side of [left, right]) {
    ctx.beginPath();
    drawSmoothPath(ctx, side);
    ctx.stroke();
  }
  // Rectangular end caps
  ctx.lineWidth = (isSelected ? 2.5 : 2) / zoom;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y); ctx.lineTo(right[0].x, right[0].y);
  ctx.moveTo(left[left.length-1].x, left[left.length-1].y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  ctx.stroke();

  // Dashed center divider — smooth
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 1.5 / zoom;
  ctx.lineCap = "round";
  ctx.setLineDash([10/zoom, 6/zoom]);
  ctx.beginPath();
  drawSmoothPath(ctx, obj.points);
  ctx.stroke();
  ctx.setLineDash([]);

  if (obj.name) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    const p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `bold ${scaledFont(14, zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.name, 0, 0);
    ctx.restore();
  }
}

// ============================================================
// LAYER 4: Outlet / Moga
// ============================================================
export function drawOutlet(ctx, obj, isSelected, zoom, C) {
  const scale = obj.arrowScale || 1;
  const blockSize = obj.blockSize || 20;
  const { x: sx, y: sy } = obj.start;
  const { x: ex, y: ey } = obj.end;
  const angle = Math.atan2(ey - sy, ex - sx);
  const len = Math.hypot(ex - sx, ey - sy);
  const color = isSelected ? "#67e8f9" : (C.outletStroke || "#06b6d4");
  const half = blockSize / 2;

  ctx.fillStyle = color;
  ctx.fillRect(sx - half, sy - half, blockSize, blockSize);
  ctx.strokeStyle = "#0e7490"; ctx.lineWidth = 2/zoom;
  ctx.strokeRect(sx - half, sy - half, blockSize, blockSize);

  ctx.save(); ctx.translate(sx, sy); ctx.rotate(angle);
  ctx.strokeStyle = color; ctx.lineWidth = (3 * scale) / zoom;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(len - (22*scale)/zoom, -(14*scale)/zoom);
  ctx.lineTo(len - (22*scale)/zoom, (14*scale)/zoom);
  ctx.closePath(); ctx.fill();

  if (obj.mogha_name) {
    ctx.save(); ctx.translate(sx, sy);
    ctx.fillStyle = "#0e7490";
    ctx.font = `bold ${scaledFont(14, zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.mogha_name, 0, -blockSize/2 - 4/zoom);
    ctx.restore();
  }
  const moghaNum = [obj.mogha_number, obj.mogha_side].filter(Boolean).join("/");
  const labelToUse = moghaNum || obj.label || "";
  if (labelToUse) {
    ctx.fillStyle = "#0e7490";
    ctx.font = `bold ${scaledFont(12, zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(labelToUse, len/2, -(14*scale)/zoom);
  }
  ctx.restore();
}

// ============================================================
// LAYER 4: Canal Damage Mark — simple red line on the canal
// ============================================================
export function drawDamageMarker(ctx, obj, isSelected, zoom) {
  if (!obj.points || obj.points.length < 2) {
    // Legacy point-type marker: draw a simple X cross
    const r = 8 / zoom;
    const x = obj.x, y = obj.y;
    ctx.strokeStyle = isSelected ? "#60a5fa" : "#ef4444";
    ctx.lineWidth = (isSelected ? 3 : 2.5) / zoom;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
    ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
    ctx.stroke();
    return;
  }
  // New line-type damage mark
  ctx.strokeStyle = isSelected ? "#60a5fa" : "#ef4444";
  ctx.lineWidth = (isSelected ? 5 : 4) / zoom;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Draw tick marks across the line to make it visually distinct
  ctx.strokeStyle = isSelected ? "#93c5fd" : "#dc2626";
  ctx.lineWidth = 2 / zoom;
  for (let i = 0; i < obj.points.length - 1; i++) {
    const a = obj.points[i], b = obj.points[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const nx = -dy / len, ny = dx / len;
    const tickSize = 6 / zoom;
    const steps = Math.max(1, Math.floor(len / (20 / zoom)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = a.x + dx * t, cy = a.y + dy * t;
      ctx.beginPath();
      ctx.moveTo(cx - nx * tickSize, cy - ny * tickSize);
      ctx.lineTo(cx + nx * tickSize, cy + ny * tickSize);
      ctx.stroke();
    }
  }
}

// ============================================================
// LAYER 2: Chakbandi
// ============================================================
export function drawChakbandi(ctx, obj, isSelected, zoom, C, forceCross = false) {
  if (obj.points.length < 2) return;
  const color = C.chakbandiStroke || "#22c55e";
  const lineW = CHAKBANDI_SCALE.lineWidth(obj.lineThickness);
  const crossSize = CHAKBANDI_SCALE.crossSize(obj.crossSize) / zoom;
  const spacing = CHAKBANDI_SCALE.crossSpacing(obj.crossSpacing) / zoom;

  // Always draw straight segments (no curves) — chakbandi is a hard boundary
  // World-unit thickness, matches print/export exactly
  ctx.strokeStyle = isSelected ? "#86efac" : color;
  ctx.lineWidth = (lineW + (isSelected ? 3 : 0)) / zoom;
  ctx.lineCap = "round";
  ctx.lineJoin = "miter";
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Always draw X crosses along each segment (rotated with segment direction)
  ctx.strokeStyle = isSelected ? "#86efac" : color;
  ctx.lineWidth = (lineW * 0.6 + (isSelected ? 2 : 0)) / zoom;
  ctx.lineCap = "round";
  for (let i = 0; i < obj.points.length - 1; i++) {
    const a = obj.points[i], b = obj.points[i+1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const steps = Math.max(1, Math.floor(segLen / spacing));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t;
      // X rotated along segment direction
      ctx.beginPath();
      ctx.moveTo(cx + (-crossSize*cos - -crossSize*sin), cy + (-crossSize*sin + -crossSize*cos));
      ctx.lineTo(cx + ( crossSize*cos -  crossSize*sin), cy + ( crossSize*sin +  crossSize*cos));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + ( crossSize*cos - -crossSize*sin), cy + ( crossSize*sin + -crossSize*cos));
      ctx.lineTo(cx + (-crossSize*cos -  crossSize*sin), cy + (-crossSize*sin +  crossSize*cos));
      ctx.stroke();
    }
  }
  if (obj.name && zoom > 0.3) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid], p2 = obj.points[Math.min(mid+1, obj.points.length-1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.font = `bold ${scaledFont(11, zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.name, 0, -6/zoom);
    ctx.restore();
  }
}

// ============================================================
// LAYER 2: Mouza boundary
// ============================================================
export function drawMouza(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const color = C.mouzaStroke || "#000000";
  ctx.strokeStyle = isSelected ? "#6366f1" : color;
  ctx.lineWidth = (isSelected ? 2 : 1.2) / zoom;
  ctx.setLineDash([3/zoom, 4/zoom]); ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke(); ctx.setLineDash([]);

  if (obj.name && zoom > 0.2) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid], p2 = obj.points[Math.min(mid+1, obj.points.length-1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.font = `bold ${scaledFont(10, zoom, 9)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.name, 0, -6/zoom);
    ctx.restore();
  }
}

// ============================================================
// DRAW DRAFT PREVIEWS
// ============================================================
export function drawCanalDraft(ctx, canalDraft, snapPos, zoom, C) {
  if (!canalDraft || canalDraft.length === 0) return;
  const draftPts = [...canalDraft];
  if (snapPos) draftPts.push(snapPos);
  const halfW = DIMENSIONS.CANAL_WIDTH / 2;
  const left = getParallelPolyline(draftPts, -halfW);
  const right = getParallelPolyline(draftPts, halfW);
  ctx.strokeStyle = C.canalStroke || "#0284c7";
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([6/zoom, 4/zoom]);
  for (const side of [left, right]) {
    ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const pt of canalDraft) {
    ctx.fillStyle = C.canalStroke || "#3b82f6";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4/zoom, 0, Math.PI*2); ctx.fill();
  }
}

export function drawKhalDraft(ctx, khalDraft, snapPos, zoom, C) {
  if (!khalDraft || khalDraft.length === 0) return;
  const draftPts = [...khalDraft];
  if (snapPos) draftPts.push(snapPos);
  const halfW = DIMENSIONS.KHAL_WIDTH / 2;
  const left = getParallelPolyline(draftPts, -halfW);
  const right = getParallelPolyline(draftPts, halfW);
  ctx.strokeStyle = C.khalStroke || "#2563eb";
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([6/zoom, 4/zoom]);
  for (const side of [left, right]) {
    ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const pt of khalDraft) {
    ctx.fillStyle = C.khalStroke || "#2563eb";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4/zoom, 0, Math.PI*2); ctx.fill();
  }
}

export function drawRoadDraft(ctx, roadDraft, snapPos, zoom, C) {
  if (!roadDraft || roadDraft.length === 0) return;
  const draftPts = [...roadDraft];
  if (snapPos) draftPts.push(snapPos);
  const halfW = DIMENSIONS.ROAD_WIDTH / 2;
  const left = getParallelPolyline(draftPts, -halfW);
  const right = getParallelPolyline(draftPts, halfW);
  ctx.strokeStyle = C.roadStroke || "#d97706";
  ctx.lineWidth = 2.5 / zoom;
  ctx.setLineDash([8/zoom, 5/zoom]);
  for (const side of [left, right]) {
    ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const pt of roadDraft) {
    ctx.fillStyle = C.roadStroke || "#d97706";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4/zoom, 0, Math.PI*2); ctx.fill();
  }
}

export function drawChakbandiDraft(ctx, chakbandiDraft, snapPos, zoom, C) {
  if (!chakbandiDraft || chakbandiDraft.length === 0) return;
  const color = C.chakbandiStroke || "#22c55e";
  const draftPts = [...chakbandiDraft];
  if (snapPos) draftPts.push(snapPos);
  const lineW = CHAKBANDI_SCALE.lineWidth();
  const crossSize = CHAKBANDI_SCALE.crossSize()/zoom, spacing = CHAKBANDI_SCALE.crossSpacing()/zoom;

  // Straight line (no curves)
  ctx.strokeStyle = color; ctx.lineWidth = lineW/zoom; ctx.lineCap = "round"; ctx.lineJoin = "miter";
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(draftPts[0].x, draftPts[0].y);
  for (const p of draftPts) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Rotated X crosses
  ctx.strokeStyle = color; ctx.lineWidth = (lineW*0.6)/zoom; ctx.lineCap = "round";
  for (let i = 0; i < draftPts.length - 1; i++) {
    const a = draftPts[i], b = draftPts[i+1];
    const segLen = Math.hypot(b.x-a.x, b.y-a.y);
    const angle = Math.atan2(b.y-a.y, b.x-a.x);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const steps = Math.max(1, Math.floor(segLen/spacing));
    for (let s = 0; s <= steps; s++) {
      const t = s/steps;
      const cx = a.x + (b.x-a.x)*t, cy = a.y + (b.y-a.y)*t;
      ctx.beginPath();
      ctx.moveTo(cx+(-crossSize*cos- -crossSize*sin), cy+(-crossSize*sin+ -crossSize*cos));
      ctx.lineTo(cx+( crossSize*cos-  crossSize*sin), cy+( crossSize*sin+  crossSize*cos));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx+( crossSize*cos- -crossSize*sin), cy+( crossSize*sin+ -crossSize*cos));
      ctx.lineTo(cx+(-crossSize*cos-  crossSize*sin), cy+(-crossSize*sin+  crossSize*cos));
      ctx.stroke();
    }
  }
}

export function drawMouzaDraft(ctx, mouzaDraft, snapPos, zoom, C) {
  if (!mouzaDraft || mouzaDraft.length === 0) return;
  ctx.strokeStyle = C.mouzaStroke || "#000000";
  ctx.lineWidth = 1.5/zoom; ctx.setLineDash([3/zoom, 4/zoom]);
  ctx.beginPath(); ctx.moveTo(mouzaDraft[0].x, mouzaDraft[0].y);
  for (let i = 1; i < mouzaDraft.length; i++) ctx.lineTo(mouzaDraft[i].x, mouzaDraft[i].y);
  if (snapPos) ctx.lineTo(snapPos.x, snapPos.y);
  ctx.stroke(); ctx.setLineDash([]);
  for (const pt of mouzaDraft) {
    ctx.fillStyle = C.mouzaStroke || "#000000";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 3/zoom, 0, Math.PI*2); ctx.fill();
  }
}

export function drawOutletDraft(ctx, outletDraft, snapPos, zoom) {
  if (!outletDraft) return;
  ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 2/zoom;
  ctx.setLineDash([4/zoom, 3/zoom]);
  ctx.beginPath(); ctx.moveTo(outletDraft.x, outletDraft.y);
  if (snapPos) ctx.lineTo(snapPos.x, snapPos.y);
  ctx.stroke(); ctx.setLineDash([]);
}

// ---- Hex color to RGB string ----
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}` : "239,68,68";
}