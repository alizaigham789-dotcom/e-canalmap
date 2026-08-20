// ============================================================
// GIS RENDERER — Pure canvas drawing functions
// Z-Index Layer Stack (0–5), Anti-aliased zoom scaling,
// Symmetric bilateral buffering, Vector fill patterns
// ============================================================

import { getParallelPolyline, getMustateeelKillaGrid, getMustateelKillaCells, getMurabaKillaGrid, getMurabaKillaCells, createFillPattern, DIMENSIONS, drawSmoothPath, CHAKBANDI_SCALE, MUSTATEEL_SCALE, canalNameFont, getOutletDimensions, effectiveKillaVisible } from "@/lib/gisEngine";
import { drawMogaFractionBoxOnCanvas, getOutletLabelPos, isUrduText } from "@/lib/printRenderHelpers";

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
  // Exclusion hatch — drawn first, above fill, below boundary
  if (obj.excluded) drawExclusionHatchOnCanvas(ctx, obj, zoom);
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
  ctx.lineWidth = ((isSelected ? 2 : 1.5) * 0.2 + (isSelected ? 1.5 : 0)) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Layer 5: Label
  if (obj.label) {
    ctx.fillStyle = C.labelColor || "#000000";
    ctx.font = `bold ${scaledFont(12, zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
  }
}

export function drawMustateel(ctx, obj, isSelected, zoom, C, showKillaNumbers = true, mouzaSplit = null, showAcreUseLabels = true) {
  // Exclusion hatch — drawn first, above fill, below boundary
  if (obj.excluded) drawExclusionHatchOnCanvas(ctx, obj, zoom);
  const ks = obj.killaStyle || {};
  const fs = obj.fillStyle || "solid";

  // Layer 1: Fill
  if (fs === "solid") {
    ctx.save();
    if (obj.fillColor && obj.fillColor.startsWith("#")) {
      ctx.globalAlpha = obj.fillOpacity ?? 1;
    }
    ctx.fillStyle = obj.fillColor || C.mustateelFill || "rgba(245,158,11,0.10)";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.restore();
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
  ctx.lineWidth = (MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness) * 0.2 + (isSelected ? 2 : 0)) / zoom;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Filled mustateel (explicit solid colour or acre-use/ikhraj fill) hides acre
  // numbers by default; user can opt in per-parcel via the "Show Acre Numbers" toggle.
  // The default translucent rgba fill does NOT count as "filled" — so default
  // mustateels show killa numbers whenever the eye toggle is on.
  const effectiveShowKilla = effectiveKillaVisible(obj, showKillaNumbers);

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

    // Layer 2b: Acre (killa) land-use fills — coloured per-acre cells (آبادی/قبرستان/فیکٹری/...)
    const acreUses = obj.acreUses ? obj.acreUses : [];
    const gridUses = getMustateeelKillaGrid();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 2; c++) {
        const use = acreUses[gridUses[r][c] - 1];
        if (!use || !use.color) continue;
        const cx = obj.x + c * cellW, cy = obj.y + r * cellH;
        ctx.save();
        ctx.globalAlpha = 0.80;
        ctx.fillStyle = use.color;
        ctx.fillRect(cx, cy, cellW, cellH);
        ctx.restore();
        ctx.strokeStyle = use.color;
        ctx.lineWidth = 1.5 / zoom;
        ctx.strokeRect(cx, cy, cellW, cellH);
      }
    }

    // Layer 5: Killa numbers + land-use labels
    if (effectiveShowKilla || (showAcreUseLabels && acreUses.some(u => u && u.label))) {
      ctx.save();
      ctx.beginPath(); ctx.rect(obj.x, obj.y, obj.w, obj.h); ctx.clip();
      const killaFontSize = screenClampedFont(Math.min(cellW, cellH) * 0.30, zoom, 14, 24);
      const labelFont = screenClampedFont(Math.min(cellW, cellH) * 0.26, zoom, 10, 18);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
          const kn = gridUses[r][c];
          const use = acreUses[kn - 1];
          const cx = obj.x + c * cellW, cy = obj.y + r * cellH;
          if (use && use.label && showAcreUseLabels) {
            try { ctx.direction = "rtl"; } catch {}
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = `bold ${labelFont}px 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif`;
            ctx.fillStyle = "#0f172a";
            ctx.fillText(use.label, cx + cellW / 2, cy + cellH / 2);
            if (effectiveShowKilla) {
              try { ctx.direction = "ltr"; } catch {}
              ctx.textAlign = "left"; ctx.textBaseline = "top";
              ctx.font = `bold ${Math.max(9, killaFontSize * 0.7)}px Rajdhani, sans-serif`;
              ctx.fillStyle = ks.labelColor || "rgba(220,38,38,0.9)";
              ctx.fillText(String(kn), cx + 3 / zoom, cy + 2 / zoom);
            }
            } else if (effectiveShowKilla) {
            try { ctx.direction = "ltr"; } catch {}
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = `bold ${killaFontSize}px Rajdhani, sans-serif`;
            ctx.fillStyle = ks.labelColor || "rgba(220,38,38,0.9)";
            ctx.fillText(String(kn), cx + cellW / 2, cy + cellH / 2);
          }
        }
      }
      ctx.restore();
    }
  }

  // Layer 5: Center label(s) — fixed world-unit size so ALL mustateels look same regardless of label length
  // If a mouza boundary splits this parcel AND user entered label2, draw 2 labels (one on each side)
  // If no label2, draw only ONE centered label (treat as normal mustateel)
  if (mouzaSplit && obj.label2) {
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x + 2/zoom, obj.y + 2/zoom, obj.w - 4/zoom, obj.h - 4/zoom); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    // Compute proper polygon centroids for each half — placed clearly above/below (or left/right) of the mouza line
    const drawSplitLabel = (text, center, halfW) => {
      if (!text) return;
      let maxFontPx = Math.min(obj.w, obj.h) * 0.26;
      ctx.font = `900 ${maxFontPx}px Rajdhani, sans-serif`;
      const measured = ctx.measureText(text);
      const maxW = (halfW || obj.w * 0.5) * 0.80;
      if (measured.width > maxW) {
        maxFontPx = Math.max(8, maxFontPx * (maxW / measured.width));
        ctx.font = `900 ${maxFontPx}px Rajdhani, sans-serif`;
      }
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, center.x, center.y);
    };
    drawSplitLabel(obj.label || "", mouzaSplit.centerA, mouzaSplit.widthA);
    drawSplitLabel(obj.label2, mouzaSplit.centerB, mouzaSplit.widthB);
    ctx.restore();
  } else {
    // No mouza line crossing — show only label1 (single label centered)
    const centerX = obj.x + obj.w / 2, centerY = obj.y + obj.h / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x + 2/zoom, obj.y + 2/zoom, obj.w - 4/zoom, obj.h - 4/zoom); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    const maxFontPx = Math.min(obj.w, obj.h) * 0.38;
    ctx.font = `900 ${maxFontPx}px Rajdhani, sans-serif`;
    const measured = ctx.measureText(obj.label || "");
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

export function drawMuraba(ctx, obj, isSelected, zoom, C, showKillaNumbers = true, mouzaSplit = null) {
  // Exclusion hatch — drawn first, above fill, below boundary
  if (obj.excluded) drawExclusionHatchOnCanvas(ctx, obj, zoom);
  const ks = obj.killaStyle || {};
  const fs = obj.fillStyle || "solid";

  // Layer 1: Fill
  if (fs === "solid") {
    ctx.save();
    if (obj.fillColor && obj.fillColor.startsWith("#")) {
      ctx.globalAlpha = obj.fillOpacity ?? 1;
    }
    ctx.fillStyle = obj.fillColor || C.murabaFill || "rgba(249,115,22,0.08)";
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    ctx.restore();
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

  // Layer 2: Outer boundary — RED, thick (world-unit thickness, matches print/export)
  ctx.strokeStyle = isSelected ? "#60a5fa" : (C.murabaStroke || "#ef4444");
  ctx.lineWidth = (MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness) * 0.2 + (isSelected ? 2 : 0)) / zoom;
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

  // Layer 5: Center label(s) — if mouza split + label2, draw two labels (one per side)
  if (mouzaSplit && obj.label2) {
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x + 2/zoom, obj.y + 2/zoom, obj.w - 4/zoom, obj.h - 4/zoom); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    const drawSplitLabel = (text, center, halfW) => {
      if (!text) return;
      let maxFontPx = Math.min(obj.w, obj.h) * 0.26;
      ctx.font = `900 ${maxFontPx}px Rajdhani, sans-serif`;
      const measured = ctx.measureText(text);
      const maxW = (halfW || obj.w * 0.5) * 0.80;
      if (measured.width > maxW) {
        maxFontPx = Math.max(8, maxFontPx * (maxW / measured.width));
        ctx.font = `900 ${maxFontPx}px Rajdhani, sans-serif`;
      }
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, center.x, center.y);
    };
    drawSplitLabel(obj.label || "", mouzaSplit.centerA, mouzaSplit.widthA);
    drawSplitLabel(obj.label2, mouzaSplit.centerB, mouzaSplit.widthB);
    ctx.restore();
  } else {
    // No mouza line crossing — show only label1 (single label centered)
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
  const w = Math.max(2, obj.width);
  const fillC = C.canalFill || "rgba(163,218,244,0.70)";
  const strokeC = isSelected ? "#60a5fa" : (C.canalStroke || "#2B7AB8");

  if (obj.canalStyle === "flat") {
    // Flat style — squared ends, two parallel blue boundary lines, blue water center
    const halfW = w / 2;
    const left = getParallelPolyline(obj.points, -halfW);
    const right = getParallelPolyline(obj.points, halfW);
    ctx.fillStyle = fillC;
    ctx.beginPath();
    drawSmoothPath(ctx, left);
    ctx.lineTo(right[right.length - 1].x, right[right.length - 1].y);
    drawSmoothPath(ctx, [...right].reverse());
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = strokeC;
    ctx.lineWidth = Math.max(2, 3 / zoom);
    ctx.lineCap = "butt"; ctx.lineJoin = "round";
    for (const side of [left, right]) {
      ctx.beginPath();
      drawSmoothPath(ctx, side);
      ctx.stroke();
    }
  } else {
    // 3D ribbon — soft glow halo + darker outline + body + inner highlight
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = strokeC;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = w + 8;
    ctx.beginPath(); drawSmoothPath(ctx, obj.points); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = strokeC;
    ctx.lineWidth = w + 3;
    ctx.beginPath(); drawSmoothPath(ctx, obj.points); ctx.stroke();
    ctx.strokeStyle = fillC;
    ctx.lineWidth = w;
    ctx.beginPath(); drawSmoothPath(ctx, obj.points); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = Math.max(1, w * 0.12);
    ctx.beginPath(); drawSmoothPath(ctx, obj.points); ctx.stroke();
  }

  // Layer 5: Canal name INSIDE the blue canal — repeats every ~5 acres along the path,
  // follows canal geometry (straight or curved), highly visible colour, 5× font size.
  // English: char-by-char on path. Urdu: whole connected labels at the same intervals.
  if (obj.name) {
    drawTextOnCanalPath(ctx, obj.points, obj.name, zoom);
  }
}

// ─── Urdu canal name — repeating connected labels in Jameel Noori Nastaleeq ─
// Urdu is a connected RTL script: char-by-char on-path rendering breaks the
// joins. So the Urdu name is drawn as whole rotated strings placed along the
// canal centerline at regular intervals (every ~5 acres), kept upright, in
// Jameel Noori Nastaleeq — repeating the same way the English name does.
function drawCanalNameUrduEditor(ctx, points, text, zoom) {
  const cfWorld = canalNameFont();
  const cf = screenClampedFont(cfWorld, zoom, 12, 64);
  const segLens = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLens.push(d); totalLen += d;
  }
  if (totalLen < 1) return;
  ctx.font = `bold ${cf}px 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelW = ctx.measureText(text).width || (text.length * cf * 0.5);
  const repeatSpacing = 1100; // ~5 acres of frontage — matches English repeating
  for (let dist = labelW / 2; dist + labelW / 2 < totalLen; dist += repeatSpacing) {
    let acc = 0, px = 0, py = 0, ang = 0, placed = false;
    for (let i = 0; i < segLens.length; i++) {
      if (acc + segLens[i] >= dist) {
        const t = segLens[i] > 0 ? (dist - acc) / segLens[i] : 0;
        const a = points[i], b = points[i + 1];
        px = a.x + (b.x - a.x) * t;
        py = a.y + (b.y - a.y) * t;
        ang = Math.atan2(b.y - a.y, b.x - a.x);
        placed = true; break;
      }
      acc += segLens[i];
    }
    if (!placed) break;
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI; // keep upright
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    try { ctx.direction = "rtl"; } catch {}
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = Math.max(2, cf * 0.18);
    ctx.lineJoin = "round";
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = "#FFD700";
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

// ─── Text-on-canal-path ──────────────────────────────────────────────────────
// Draws text characters along the canal centerline so the label follows the
// canal geometry (straight or curved). Repeats every `repeatSpacing` feet.
// 5 acres ≈ 1100 ft of canal frontage (1 acre = 220 ft frontage).
function drawTextOnCanalPath(ctx, points, text, zoom) {
  if (!points || points.length < 2 || !text) return;
  if (isUrduText(text)) { drawCanalNameUrduEditor(ctx, points, text, zoom); return; }
  const cfWorld = canalNameFont();
  const cf = screenClampedFont(cfWorld, zoom, 12, 64);
  ctx.font = `bold ${cf}px Rajdhani, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Total canal length and segment lengths
  const segLens = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
    segLens.push(d);
    totalLen += d;
  }
  if (totalLen < 1) return;

  // Character width estimate (monospace-ish for Rajdhani bold)
  const charW = cf * 0.55;
  const textW = text.length * charW;
  const repeatSpacing = 1100; // ~5 acres of frontage

  // Walk along the path, placing text instances at regular intervals
  for (let startDist = 0; startDist + textW < totalLen; startDist += repeatSpacing) {
    drawTextAlongPath(ctx, points, segLens, text, startDist, cf, charW, zoom);
  }
}

// Draws a single text string starting at `startDist` along the polyline,
// character by character, each rotated to match the local tangent.
function drawTextAlongPath(ctx, points, segLens, text, startDist, fontSize, charW, zoom) {
  let remaining = startDist;
  let segIdx = 0;
  let segRemaining = segLens[0];

  // Advance to the starting position on the path
  while (segIdx < segLens.length && remaining > segRemaining) {
    remaining -= segRemaining;
    segIdx++;
    if (segIdx < segLens.length) segRemaining = segLens[segIdx];
  }
  if (segIdx >= segLens.length) return;

  // Draw each character along the path
  for (let ci = 0; ci < text.length; ci++) {
    const ch = text[ci];
    // Advance by half a character width to center the character on its position
    let advance = charW * 0.5;
    while (advance > 0 && segIdx < segLens.length) {
      if (advance <= segRemaining) {
        segRemaining -= advance;
        advance = 0;
      } else {
        advance -= segRemaining;
        segIdx++;
        if (segIdx < segLens.length) segRemaining = segLens[segIdx];
      }
    }
    if (segIdx >= segLens.length) return;

    // Calculate position and angle at the current point on the path
    const p1 = points[segIdx];
    const p2 = points[Math.min(segIdx + 1, points.length - 1)];
    const t = segLens[segIdx] > 0 ? 1 - segRemaining / segLens[segIdx] : 0;
    const px = p1.x + (p2.x - p1.x) * t;
    const py = p1.y + (p2.y - p1.y) * t;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    // Draw the character with a dark outline for visibility on blue water
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    // Outline (dark) for contrast against blue canal fill
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = Math.max(2, fontSize * 0.18);
    ctx.lineJoin = "round";
    ctx.strokeText(ch, 0, 0);
    // Fill — bright white/yellow for high visibility
    ctx.fillStyle = "#FFD700";
    ctx.fillText(ch, 0, 0);
    ctx.restore();

    // Advance past the second half of this character for the next one
    let advance2 = charW * 0.5;
    while (advance2 > 0 && segIdx < segLens.length) {
      if (advance2 <= segRemaining) {
        segRemaining -= advance2;
        advance2 = 0;
      } else {
        advance2 -= segRemaining;
        segIdx++;
        if (segIdx < segLens.length) segRemaining = segLens[segIdx];
      }
    }
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

  // Water fill — straight segments (matches print/export exactly, no curve overshoot)
  // Default: black border, solid blue inside fill
  const khalColor = isSelected ? "#6b7280" : (C.khalStroke || "#000000");
  ctx.fillStyle = obj.fillColor || "rgba(59,130,246,0.80)";
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = khalColor;
  ctx.lineWidth = (isSelected ? 2.5 : 2) / zoom;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const side of [left, right]) {
    ctx.beginPath();
    ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // Squared rectangular end caps
  ctx.lineWidth = (isSelected ? 2 : 1.5) / zoom;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y); ctx.lineTo(right[0].x, right[0].y);
  ctx.moveTo(left[left.length-1].x, left[left.length-1].y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  ctx.stroke();

  // Flow-direction arrowhead at the khal's ending point — 5× size
  // Head (tip) at end point, tail behind toward start, tail width = 5× khal width
  // Use the last segment with meaningful length to avoid double-click noise (two near-identical points)
  const last = obj.points[obj.points.length - 1];
  let prev = obj.points[0]; // fallback: overall direction
  for (let i = obj.points.length - 2; i >= 0; i--) {
    const p = obj.points[i];
    if (Math.hypot(last.x - p.x, last.y - p.y) > halfW * 2) { prev = p; break; }
  }
  const fAng = Math.atan2(last.y - prev.y, last.x - prev.x);
  const arrowLen = halfW * 6.25;   // 2.5× original — halved from 5×
  const arrowWidth = halfW * 2.5;  // 2.5× tail width — halved from 5×
  ctx.save();
  ctx.translate(last.x, last.y); ctx.rotate(fAng);
  ctx.fillStyle = khalColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-arrowLen, -arrowWidth);
  ctx.lineTo(-arrowLen, arrowWidth);
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

  // Asphalt fill — black by default, customizable via fillColor
  ctx.fillStyle = obj.fillColor || "#1a1a1a";
  ctx.beginPath();
  drawSmoothPath(ctx, left);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  drawSmoothPath(ctx, [...right].reverse());
  ctx.closePath(); ctx.fill();

  // Side lines (casing edges) — yellow by default, customizable via edgeColor
  // Width in feet (world units) — customizable via edgeWidth
  const edgeColor = isSelected ? "#fcd34d" : (obj.edgeColor || "#fbbf24");
  const edgeW = (obj.edgeWidth || 2) / zoom;
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = (isSelected ? edgeW + 1/zoom : edgeW);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const side of [left, right]) {
    ctx.beginPath();
    drawSmoothPath(ctx, side);
    ctx.stroke();
  }
  // Rectangular end caps
  ctx.lineWidth = edgeW * 0.8;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y); ctx.lineTo(right[0].x, right[0].y);
  ctx.moveTo(left[left.length-1].x, left[left.length-1].y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  ctx.stroke();

  // White dashed center divider — smooth
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3 / zoom;
  ctx.lineCap = "round";
  ctx.setLineDash([14/zoom, 8/zoom]);
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
    ctx.font = `bold ${scaledFont(42, zoom, 11, 84)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.name, 0, 0);
    ctx.restore();
  }
}

// ============================================================
// LAYER 3b: Bridge (پل) — red dotted ladder lines
// Two parallel red dotted rails with red dotted rungs between them
// ============================================================
export function drawBridge(ctx, obj, isSelected, zoom, C) {
  if (!obj.points || obj.points.length < 2) return;
  const halfW = (obj.width || 28) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const color = isSelected ? "#f87171" : "#dc2626";
  const lw = (isSelected ? 3 : 2.5) / zoom;
  const dash = [4/zoom, 3/zoom];

  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.setLineDash(dash);

  // Left rail
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Right rail
  ctx.beginPath();
  ctx.moveTo(right[0].x, right[0].y);
  for (const p of right) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Rungs (ladder cross bars) — perpendicular lines between rails at regular intervals
  const rungSpacing = (obj.rungSpacing || 20);
  for (let i = 0; i < obj.points.length - 1; i++) {
    const a = obj.points[i], b = obj.points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.floor(segLen / rungSpacing));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = a.x + (b.x - a.x) * t;
      const cy = a.y + (b.y - a.y) * t;
      const li = left[i] ? left[i] : left[left.length - 1];
      const ri = right[i] ? right[i] : right[right.length - 1];
      // Interpolate left/right at same t
      const lIdx = Math.min(i, left.length - 1);
      const lNext = Math.min(i + 1, left.length - 1);
      const rIdx = Math.min(i, right.length - 1);
      const rNext = Math.min(i + 1, right.length - 1);
      const lx = left[lIdx].x + (left[lNext].x - left[lIdx].x) * t;
      const ly = left[lIdx].y + (left[lNext].y - left[lIdx].y) * t;
      const rx = right[rIdx].x + (right[rNext].x - right[rIdx].x) * t;
      const ry = right[rIdx].y + (right[rNext].y - right[rIdx].y) * t;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  if (obj.name && zoom > 0.3) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid];
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `bold ${scaledFont(11, zoom)}px Rajdhani, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(obj.name, p.x, p.y - halfW - 3/zoom);
    ctx.restore();
  }
}

export function drawBridgeDraft(ctx, bridgeDraft, snapPos, zoom, C) {
  if (!bridgeDraft || bridgeDraft.length === 0) return;
  const draftPts = [...bridgeDraft];
  if (snapPos) draftPts.push(snapPos);
  const halfW = 14;
  const left = getParallelPolyline(draftPts, -halfW);
  const right = getParallelPolyline(draftPts, halfW);
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([4/zoom, 3/zoom]);
  for (const side of [left, right]) {
    ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const pt of bridgeDraft) {
    ctx.fillStyle = "#dc2626";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4/zoom, 0, Math.PI*2); ctx.fill();
  }
}

// ============================================================
// LAYER 4: Outlet / Moga
// ============================================================
export function drawOutlet(ctx, obj, isSelected, zoom, C) {
  // Shared dimensions — identical to print preview & export (getOutletDimensions)
  const { size, shaftWidth, headLen, headW, radius } = getOutletDimensions(obj);
  const { x: sx, y: sy } = obj.start;
  const { x: ex, y: ey } = obj.end;
  const angle = Math.atan2(ey - sy, ex - sx);
  const color = isSelected ? "#67e8f9" : (obj.outletColor || C.outletStroke || "#06b6d4");
  const half = size / 2;

  // Block at start — rounded square (matches print exactly)
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(sx - half, sy - half, size, size, radius); }
  else { ctx.rect(sx - half, sy - half, size, size); }
  ctx.fill();
  ctx.strokeStyle = "#0e7490"; ctx.lineWidth = 2 / zoom;
  ctx.stroke();

  // Shaft — from start to end (world-unit width, scales with zoom like print)
  ctx.strokeStyle = color;
  ctx.lineWidth = shaftWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Arrowhead — triangle at end (matches print exactly)
  const h1x = ex - headLen * Math.cos(angle) - headW * Math.sin(angle);
  const h1y = ey - headLen * Math.sin(angle) + headW * Math.cos(angle);
  const h2x = ex - headLen * Math.cos(angle) + headW * Math.sin(angle);
  const h2y = ey - headLen * Math.sin(angle) - headW * Math.cos(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(h1x, h1y);
  ctx.lineTo(h2x, h2y);
  ctx.closePath();
  ctx.fill();

  // Moga number — fraction inside a rounded box at labelPos (draggable)
  const moghaNum = obj.mogha_number || "";
  const moghaSide = obj.mogha_side || "";
  if (moghaNum || moghaSide) {
    const lp = getOutletLabelPos(obj);
    drawMogaFractionBoxOnCanvas(ctx, moghaNum, moghaSide, lp.x, lp.y, 0, "rgba(120,225,245,0.92)", "#0891b2", 0.5);
  }
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
  const lineW = CHAKBANDI_SCALE.lineWidth(obj.lineThickness) * 0.2;
  const crossSize = CHAKBANDI_SCALE.crossSize(obj.crossSize) * 0.2 / zoom;
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

  // CCA/GCA fraction labels are drawn in GISCanvas render pass (above all objects)
}

// ============================================================
// LAYER 2: Mouza boundary — custom width, dotted/dashed/solid, 2 labels
// ============================================================
export function drawMouza(ctx, obj, isSelected, zoom, C) {
  if (obj.points.length < 2) return;
  const color = (!C.mouzaStroke || C.mouzaStroke === "#000000") ? "#dc2626" : C.mouzaStroke;
  const lw = obj.lineWidth || 3;
  ctx.strokeStyle = isSelected ? "#6366f1" : color;
  ctx.lineWidth = (isSelected ? lw + 1 : lw) / zoom;
  // Line style: dashed (default), dotted, or solid
  if (obj.lineStyle === "solid") ctx.setLineDash([]);
  else if (obj.lineStyle === "dotted") ctx.setLineDash([2/zoom, 5/zoom]);
  else ctx.setLineDash([6/zoom, 5/zoom]); // dashed
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke(); ctx.setLineDash([]);

  // Labels — label1 above the line, label2 below the line (mouza names on each side)
  if (zoom > 0.15) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid], p2 = obj.points[Math.min(mid + 1, obj.points.length - 1)];
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);
    const labelFont = Math.max(14, Math.min(40, lw * 4)) * 5 / zoom;
    const offset = (lw / 2 + labelFont * 0.6) * 2 / zoom;
    // label1 — above the line (one side)
    const text1 = obj.label1 || obj.name || "";
    if (text1) {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.font = `bold ${labelFont}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(text1, 0, -offset);
      ctx.restore();
    }
    // label2 — below the line (other side)
    if (obj.label2) {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.font = `bold ${labelFont}px Rajdhani, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(obj.label2, 0, offset);
      ctx.restore();
    }
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
  // Live ghost preview — semi-transparent (35%) fill showing the exact final canal shape.
  // Same flat-style rendering: squared caps, water fill centered between boundaries.
  if (draftPts.length >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = C.canalFill || "rgba(163,218,244,0.70)";
    ctx.beginPath();
    drawSmoothPath(ctx, left);
    ctx.lineTo(right[right.length - 1].x, right[right.length - 1].y);
    drawSmoothPath(ctx, [...right].reverse());
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = C.canalStroke || "#0284c7";
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([6/zoom, 4/zoom]);
  for (const side of [left, right]) {
    ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Point markers — square anchor at start & end (matching shape), circles between.
  // Draw-only handles; never rendered in print/preview.
  for (let i = 0; i < canalDraft.length; i++) {
    const pt = canalDraft[i];
    ctx.fillStyle = C.canalStroke || "#3b82f6";
    if (i === 0 || i === canalDraft.length - 1) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 / zoom;
      const s = 10 / zoom;
      ctx.beginPath(); ctx.rect(pt.x - s / 2, pt.y - s / 2, s, s); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4 / zoom, 0, Math.PI * 2); ctx.fill();
    }
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
  const lineW = CHAKBANDI_SCALE.lineWidth() * 0.2;
  const crossSize = CHAKBANDI_SCALE.crossSize() * 0.2 / zoom, spacing = CHAKBANDI_SCALE.crossSpacing() / zoom;

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

// ---- Diagonal exclusion hatch — for parcels marked "excluded" from chakbandi ----
// Draws uniform 45° diagonal lines inside the parcel rectangle, clipped to its bounds.
// Used in editor canvas, print preview (canvas), and exports.
export function drawExclusionHatchOnCanvas(ctx, obj, zoom) {
  const spacing = obj.exclusionSpacing || 60; // default maximum, user can decrease
  const color = obj.exclusionColor || "#000000"; // default black
  const lineWidth = 1 / zoom; // matches acre/killa grid line width

  // Determine which rectangles to hatch — per-acre for mustateels, whole parcel otherwise
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
  if (rects.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "butt";
  for (const rect of rects) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.beginPath();
    for (let d = -rect.h; d < rect.w; d += spacing) {
      ctx.moveTo(rect.x + d, rect.y);
      ctx.lineTo(rect.x + d + rect.h, rect.y + rect.h);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}