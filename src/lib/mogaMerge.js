// ============================================================
// MOGA MERGE (CANVAS SPACE) — combine multiple moga maps into
// one continuous mouza map in the Editor by matching mustateel
// (Khasra) numbers. Works in canvas/world coordinates (no geo).
//
// Strategy:
//  1. The current editor objects are the anchor.
//  2. For every other moga map of the same village:
//     a. EXACT match  — a mustateel label that already exists in
//        the anchor → overlap it (merge, skip duplicates).
//     b. CONSECUTIVE  — mustateel N where N-1 (or N+1) is already
//        placed → place immediately right (or left), one
//        mustateel-width apart.
//  3. Each newly merged map's mustateels are added to the pool so
//     subsequent maps can chain off them.
// ============================================================

import { DrawingStateManager, DIMENSIONS } from "./gisEngine";

const MUST_W = DIMENSIONS.MUSTATEEL.width;
const MUST_H = DIMENSIONS.MUSTATEEL.height;

function getMustateels(objects) {
  return objects
    .filter((o) => o.type === "mustateel" && o.label && String(o.label).trim())
    .map((o) => ({ label: String(o.label).trim(), x: o.x, y: o.y, w: o.w, h: o.h }));
}

// Offset all objects by (dx, dy) in canvas coordinates, giving each a new id
function offsetObjects(objects, dx, dy) {
  return objects.map((o) => {
    const copy = JSON.parse(JSON.stringify(o));
    copy.id = `${o.type || "obj"}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (["acre", "mustateel", "muraba", "damageMarker"].includes(o.type)) {
      copy.x = (copy.x || 0) + dx;
      copy.y = (copy.y || 0) + dy;
    }
    if (copy.points) {
      copy.points = copy.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
    if (copy.start && copy.end) {
      copy.start = { x: copy.start.x + dx, y: copy.start.y + dy };
      copy.end = { x: copy.end.x + dx, y: copy.end.y + dy };
    }
    return copy;
  });
}

// Merge multiple moga maps into one set of canvas objects.
// anchorObjects = current editor objects; maps = all LandMaps of the same village.
// Returns { objects: mergedObjects, details: [{mapTitle, mogaNumber, method, matchedLabel}] }
export function mergeMogasInCanvas(anchorObjects, maps, anchorMapId) {
  const placedMust = new Map(); // label → {x, y}
  const anchorMusts = getMustateels(anchorObjects);
  for (const m of anchorMusts) {
    placedMust.set(m.label, { x: m.x, y: m.y });
  }

  const candidates = (maps || []).filter((m) => m && m.id !== anchorMapId && m.drawing_data);
  candidates.sort((a, b) => (parseInt(a.moga_number) || 0) - (parseInt(b.moga_number) || 0));

  let merged = [...anchorObjects];
  const details = [];

  for (const mapB of candidates) {
    let bObjects;
    try {
      bObjects = DrawingStateManager.deserialize(mapB.drawing_data);
    } catch {
      continue;
    }
    const bMusts = getMustateels(bObjects);
    if (!bMusts.length) continue;

    let best = null;

    // Strategy 1: exact label match → overlap
    for (const bm of bMusts) {
      if (placedMust.has(bm.label)) {
        const ref = placedMust.get(bm.label);
        best = { bMust: bm, targetX: ref.x, targetY: ref.y, method: "overlap" };
        break;
      }
    }

    // Strategy 2: consecutive numbers → adjacent right/left
    if (!best) {
      for (const bm of bMusts) {
        const n = parseInt(bm.label);
        if (isNaN(n)) continue;
        if (placedMust.has(String(n - 1))) {
          const ref = placedMust.get(String(n - 1));
          best = { bMust: bm, targetX: ref.x + MUST_W, targetY: ref.y, method: "adjacent-right" };
          break;
        }
        if (placedMust.has(String(n + 1))) {
          const ref = placedMust.get(String(n + 1));
          best = { bMust: bm, targetX: ref.x - MUST_W, targetY: ref.y, method: "adjacent-left" };
          break;
        }
      }
    }

    if (!best) continue;

    const dx = best.targetX - best.bMust.x;
    const dy = best.targetY - best.bMust.y;
    const offsetObjs = offsetObjects(bObjects, dx, dy);

    if (best.method === "overlap") {
      // Skip mustateels that would duplicate an existing label
      for (const o of offsetObjs) {
        if (o.type === "mustateel" && o.label && placedMust.has(String(o.label).trim())) continue;
        merged.push(o);
      }
    } else {
      merged.push(...offsetObjs);
    }

    // Add B's mustateels to the pool for chaining
    for (const bm of bMusts) {
      if (!placedMust.has(bm.label)) {
        placedMust.set(bm.label, { x: bm.x + dx, y: bm.y + dy });
      }
    }

    details.push({
      mapTitle: mapB.title,
      mogaNumber: mapB.moga_number || "",
      method: best.method,
      matchedLabel: best.bMust.label,
    });
  }

  return { objects: merged, details };
}

// Compute the bounding box of a set of canvas objects (world coordinates)
export function computeObjectsBounds(objects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + (o.w || 0)); maxY = Math.max(maxY, o.y + (o.h || 0));
    } else if (o.points && o.points.length) {
      for (const p of o.points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    } else if (o.start && o.end) {
      minX = Math.min(minX, o.start.x, o.end.x); minY = Math.min(minY, o.start.y, o.end.y);
      maxX = Math.max(maxX, o.start.x, o.end.x); maxY = Math.max(maxY, o.start.y, o.end.y);
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// ============================================================
// MOUA MERGE (GROUPED) — build a fresh mouza map from selected
// moga maps using a GLOBAL MUSTATEEL-NUMBER GRID.
//
// Each mustateel's label-1 number (label2 ignored) maps to a fixed
// grid cell (columns per row auto-detected, supporting series up to
// 10000). Missing numbers are left as empty cells (gaps preserved).
// Each moga is moved as a rigid group: the reference mustateel that
// best aligns ALL its mustateels to their global cells is chosen
// (verifies every line, not just one) — so a mustateel that belongs
// in an upper row is placed there automatically.
// Every object is tagged with `mogaGroup` (= source map id) so the
// whole moga moves as one unit and individual objects can't be moved
// separately. Returns { objects, details, bounds }.
// ============================================================

// Parse the leading integer out of mustateel label-1 (e.g. "811" → 811).
function parseMustNumber(label) {
  const m = String(label ?? "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : NaN;
}

// Move an object's geometry by (dx, dy) in place.
function applyOffsetInPlace(o, dx, dy) {
  if (["acre", "mustateel", "muraba", "damageMarker"].includes(o.type)) {
    o.x = (o.x || 0) + dx; o.y = (o.y || 0) + dy;
  }
  if (o.points) o.points = o.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  if (o.start && o.end) {
    o.start = { x: o.start.x + dx, y: o.start.y + dy };
    o.end = { x: o.end.x + dx, y: o.end.y + dy };
  }
}

// Detect columns-per-row from the physical layout: the fullest row
// (most mustateels sharing the same y-row) across all mogas.
function detectColumns(parsed) {
  let best = 0;
  for (const { musts } of parsed) {
    if (musts.length < 2) continue;
    const byN = [...musts].sort((a, b) => a.n - b.n);
    let run = 1, rowMax = 1, prevRow = Math.round(byN[0].y / MUST_H);
    for (let i = 1; i < byN.length; i++) {
      const r = Math.round(byN[i].y / MUST_H);
      if (r === prevRow) run++; else { run = 1; prevRow = r; }
      rowMax = Math.max(rowMax, run);
    }
    best = Math.max(best, rowMax);
  }
  return best;
}

export function buildMouzaMerge(maps) {
  const sorted = [...(maps || [])]
    .filter((m) => m && m.drawing_data)
    .sort((a, b) => (parseInt(a.moga_number) || 0) - (parseInt(b.moga_number) || 0));

  // Parse mustateels per map — label-1 number only, label2 ignored.
  const parsed = [];
  for (const map of sorted) {
    let objs;
    try { objs = DrawingStateManager.deserialize(map.drawing_data); } catch { continue; }
    if (!objs.length) continue;
    const musts = [];
    for (const o of objs) {
      if (o.type !== "mustateel") continue;
      const n = parseMustNumber(o.label);
      if (isNaN(n)) continue;
      musts.push({ n, x: o.x, y: o.y, w: o.w, h: o.h });
    }
    parsed.push({ map, objs, musts, bounds: computeObjectsBounds(objs) });
  }

  if (!parsed.length) return { objects: [], details: [], bounds: null };

  // Columns per row — auto-detected from layout, fallback 10.
  const C = detectColumns(parsed) || 10;

  // Global grid cell for mustateel number n (1-based, wraps every C).
  const cellOf = (n) => {
    const idx = n - 1;
    const col = ((idx % C) + C) % C;
    const row = Math.floor(idx / C);
    return { col, row, x: col * MUST_W, y: row * MUST_H };
  };

  const merged = [];
  const details = [];
  let cursorX = 0; // for mogas with no numbered mustateels (manual placement)

  for (const { map, objs, musts, bounds } of parsed) {
    let dx, dy, method, refLabel = null, verify = null;

    if (musts.length) {
      // Pick the reference mustateel that best aligns ALL mustateels of
      // this moga to their global grid cells (verifies every line).
      let best = null;
      for (const r of musts) {
        const cell = cellOf(r.n);
        const ddx = cell.x - r.x, ddy = cell.y - r.y;
        let err = 0;
        for (const m of musts) {
          const c = cellOf(m.n);
          err += Math.hypot((m.x + ddx) - c.x, (m.y + ddy) - c.y);
        }
        if (!best || err < best.err) best = { ddx, ddy, err, ref: r };
      }
      dx = best.ddx; dy = best.ddy; method = "grid"; refLabel = best.ref.n;

      // Verify 2–3 mustateels (first lines) landed in their expected rows.
      const byN = [...musts].sort((a, b) => a.n - b.n);
      const sample = byN.slice(0, Math.min(3, byN.length));
      verify = sample.map((m) => {
        const c = cellOf(m.n);
        const placedRow = Math.round((m.y + dy) / MUST_H);
        return { n: m.n, expectedRow: c.row, placedRow, ok: placedRow === c.row };
      });
    } else if (bounds) {
      // No numbered mustateels — keep separate, side by side for manual drag.
      dx = cursorX - bounds.minX;
      dy = -bounds.minY;
      method = "separate";
    } else {
      continue;
    }

    for (const o of objs) {
      const copy = JSON.parse(JSON.stringify(o));
      copy.id = `${o.type || "obj"}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      copy.mogaGroup = map.id;
      copy.mogaGroupName = map.moga_number || map.title || "";
      applyOffsetInPlace(copy, dx, dy);
      merged.push(copy);
    }

    if (bounds) cursorX = Math.max(cursorX, bounds.maxX + dx + 2000);

    details.push({
      mapTitle: map.title,
      mogaNumber: map.moga_number || "",
      method,
      refLabel,
      columns: C,
      verify,
      count: objs.length,
    });
  }

  // Normalise origin so the merged map starts near (0,0) — gaps are
  // preserved (missing numbers remain as empty cells between objects).
  const bounds = computeObjectsBounds(merged);
  if (bounds) {
    const shiftX = -bounds.minX, shiftY = -bounds.minY;
    for (const o of merged) applyOffsetInPlace(o, shiftX, shiftY);
  }

  return { objects: merged, details, bounds: computeObjectsBounds(merged) };
}