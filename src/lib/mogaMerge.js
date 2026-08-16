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
// moga maps. Each moga's internal layout (chakbandi, khal, canal,
// mouza, outlet positions) is preserved EXACTLY; mogas are placed
// side by side so they don't overlap. Every object is tagged with
// `mogaGroup` (= source map id) so the whole moga moves as one unit
// and individual objects can't be moved separately.
// Returns { objects, details, bounds }.
// ============================================================
export function buildMouzaMerge(maps) {
  let cursorX = 0;
  const merged = [];
  const details = [];
  for (const map of maps || []) {
    let objs;
    try { objs = DrawingStateManager.deserialize(map.drawing_data); } catch { continue; }
    if (!objs.length) continue;
    const bounds = computeObjectsBounds(objs);
    if (!bounds) continue;
    const dx = cursorX - bounds.minX;
    const dy = -bounds.minY;
    for (const o of objs) {
      const copy = JSON.parse(JSON.stringify(o));
      copy.id = `${o.type || "obj"}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      copy.mogaGroup = map.id;
      copy.mogaGroupName = map.moga_number || map.title || "";
      if (["acre", "mustateel", "muraba", "damageMarker"].includes(o.type)) {
        copy.x = (copy.x || 0) + dx;
        copy.y = (copy.y || 0) + dy;
      }
      if (copy.points) copy.points = copy.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
      if (copy.start && copy.end) {
        copy.start = { x: copy.start.x + dx, y: copy.start.y + dy };
        copy.end = { x: copy.end.x + dx, y: copy.end.y + dy };
      }
      merged.push(copy);
    }
    details.push({ mapTitle: map.title, mogaNumber: map.moga_number || "", count: objs.length });
    cursorX += (bounds.maxX - bounds.minX) + 2000; // gap between mogas
  }
  const finalBounds = computeObjectsBounds(merged);
  return { objects: merged, details, bounds: finalBounds };
}