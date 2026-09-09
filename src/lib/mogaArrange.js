// ============================================================
// MOGA AUTO-ARRANGE — combine multiple moga maps into one
// continuous mouza map by matching mustateel (Khasra) numbers.
//
// Strategy:
//  1. The anchor map (already placed on the satellite) provides
//     reference geo positions for each of its mustateels.
//  2. For every other moga map of the same village:
//     a. EXACT match  — a mustateel label that already exists in a
//        placed map → overlap it at the same geo point (merge, no
//        duplicate).
//     b. CONSECUTIVE  — mustateel N in the new map where N-1 (or N+1)
//        is already placed → place it immediately to the right (or
//        left) of the reference, one mustateel-width apart.
//  3. Each newly placed map's mustateels are added to the reference
//     pool so subsequent maps can chain off them.
// ============================================================

import { DrawingStateManager, DIMENSIONS } from "./gisEngine";
import {
  computeOneClickTransform,
  getParcelBoundingBox,
  FT_TO_M,
} from "./geoOverlay";

const M_PER_DEG_LAT = 111320;
const MUST_W_FT = DIMENSIONS.MUSTATEEL.width; // 440 ft — one mustateel width

// Extract mustateels with their Khasra label + canvas corner from a map.
// The mustateel "number" is its label (e.g. "811").
export function getMapMustateels(map) {
  if (!map?.drawing_data) return [];
  let objects;
  try {
    objects = DrawingStateManager.deserialize(map.drawing_data);
  } catch {
    return [];
  }
  return objects
    .filter((o) => o.type === "mustateel" && o.label && String(o.label).trim())
    .map((o) => ({
      label: String(o.label).trim(),
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
    }));
}

// Given map B's objects and a mustateel canvas corner that should land at
// targetGeo, compute the geo placement point for B's overlay (the
// topmost-leftmost mustateel corner anchor used by computeOneClickTransform).
// Compute the geo placement anchor for map B so that `mustCanvas` (a mustateel
// in B's canvas) lands exactly at `targetGeo`, inheriting the reference moga's
// rotation so chained mogas stay aligned to the same grid orientation.
export function computePlacementForMustateel(bObjects, mustCanvas, targetGeo, rotation = 0) {
  const bbox = getParcelBoundingBox(bObjects);
  if (!bbox) return null;
  const { minX, minY } = bbox;
  // offset (feet) from the anchor corner to this mustateel's top-left corner
  const dxFt = mustCanvas.x - minX;
  const dyFt = mustCanvas.y - minY;
  const east0 = dxFt * FT_TO_M;
  const north0 = -dyFt * FT_TO_M;
  const rad = (rotation * Math.PI) / 180;
  const cosR = Math.cos(rad), sinR = Math.sin(rad);
  const east = east0 * cosR - north0 * sinR;
  const north = east0 * sinR + north0 * cosR;
  const cosLat = Math.cos((targetGeo.lat * Math.PI) / 180);
  const mPerDegLng = M_PER_DEG_LAT * cosLat;
  return {
    lat: targetGeo.lat - north / M_PER_DEG_LAT,
    lng: targetGeo.lng - east / mPerDegLng,
  };
}

// Main entry. `maps` = all LandMaps; `anchorMap` = the already-placed map.
// `opts.force` = re-arrange even maps that already have a saved placement.
// Returns { results: [{mapId, placement, matchedLabel, method, mogaNumber}], error? }
export function arrangeMogas(maps, anchorMap, opts = {}) {
  const { force = false } = opts;

  if (!anchorMap) return { error: "Select an anchor map first." };
  if (anchorMap.geo_placement_lat == null || anchorMap.geo_placement_lng == null) {
    return { error: "Place the first moga on the map first, then auto-arrange the rest." };
  }

  let anchorObjects;
  try {
    anchorObjects = DrawingStateManager.deserialize(anchorMap.drawing_data);
  } catch {
    return { error: "Anchor map drawing data is corrupt." };
  }
  const anchorMustateels = getMapMustateels(anchorMap);
  if (!anchorMustateels.length) {
    return { error: "Anchor map has no numbered mustateels to match against." };
  }

  const anchorTransform = computeOneClickTransform(
    { lat: anchorMap.geo_placement_lat, lng: anchorMap.geo_placement_lng },
    anchorObjects,
    anchorMap.geo_rotation || 0
  );
  if (!anchorTransform) return { error: "Could not compute anchor overlay transform." };

  // Reference pool: label → { geo, transform, rotation, must }
  const anchorRot = anchorMap.geo_rotation || 0;
  const placedMust = new Map();
  for (const m of anchorMustateels) {
    placedMust.set(m.label, { geo: anchorTransform.transform(m.x, m.y), transform: anchorTransform, rotation: anchorRot, must: m });
  }

  // Candidate maps: same village as anchor, not the anchor itself.
  // Skip maps that already have a placement unless force=true.
  const village = anchorMap.village;
  const candidates = (maps || []).filter((m) => {
    if (!m || m.id === anchorMap.id) return false;
    if (village && m.village && m.village !== village) return false;
    if (!force && m.geo_placement_lat != null) return false;
    return true;
  });

  // Process in moga-number order so chaining is deterministic.
  candidates.sort((a, b) => {
    const na = parseInt(a.moga_number) || 0;
    const nb = parseInt(b.moga_number) || 0;
    return na - nb;
  });

  const results = [];

  for (const mapB of candidates) {
    const bMusts = getMapMustateels(mapB);
    if (!bMusts.length) continue;

    let best = null; // { bMust, targetGeo, rotation, method }

    // Strategy 1: exact label match → overlap (merge, no duplicate)
    for (const bm of bMusts) {
      if (placedMust.has(bm.label)) {
        const ref = placedMust.get(bm.label);
        best = { bMust: bm, targetGeo: ref.geo, rotation: ref.rotation, method: "overlap" };
        break;
      }
    }

    // Strategy 2: consecutive numbers → place adjacent (right / left)
    if (!best) {
      for (const bm of bMusts) {
        const n = parseInt(bm.label);
        if (isNaN(n)) continue;
        if (placedMust.has(String(n - 1))) {
          const ref = placedMust.get(String(n - 1));
          best = { bMust: bm, targetGeo: ref.transform.transform(ref.must.x + MUST_W_FT, ref.must.y), rotation: ref.rotation, method: "adjacent-right" };
          break;
        }
        if (placedMust.has(String(n + 1))) {
          const ref = placedMust.get(String(n + 1));
          best = { bMust: bm, targetGeo: ref.transform.transform(ref.must.x - MUST_W_FT, ref.must.y), rotation: ref.rotation, method: "adjacent-left" };
          break;
        }
      }
    }

    if (!best) continue;

    let bObjects;
    try {
      bObjects = DrawingStateManager.deserialize(mapB.drawing_data);
    } catch {
      continue;
    }
    const placement = computePlacementForMustateel(bObjects, best.bMust, best.targetGeo, best.rotation);
    if (!placement) continue;

    results.push({
      mapId: mapB.id,
      mapTitle: mapB.title,
      mogaNumber: mapB.moga_number || "",
      placement,
      rotation: best.rotation,
      matchedLabel: best.bMust.label,
      method: best.method,
    });

    // Add B's mustateels to the reference pool so later maps can chain.
    const bTransform = computeOneClickTransform(placement, bObjects, best.rotation);
    if (bTransform) {
      for (const bm of bMusts) {
        if (!placedMust.has(bm.label)) {
          placedMust.set(bm.label, { geo: bTransform.transform(bm.x, bm.y), transform: bTransform, rotation: best.rotation, must: bm });
        }
      }
    }
  }

  if (!results.length) {
    return { error: "No matching mustateel numbers found between the anchor and other moga maps. Make sure mustateels have Khasra labels (numbers) that continue across mogas." };
  }
  return { results };
}

// ============================================================
// AUTO-ATTACH ONE MAP — when a new moga's map is selected in
// GeoMap Overlay mode and it has no saved placement, snap it
// beside the already-placed mogas of the same mouza:
//   • exact Khasra match  → merge at the same geo point
//   • consecutive number  → one mustateel-width right/left,
//     same row (never above/below), zero gap in between.
// Returns { placement, matchedLabel, method } or null when no
// placed map shares/continues a mustateel number with it.
// ============================================================
export function autoAttachPlacement(maps, newMap) {
  if (!newMap || !newMap.drawing_data) return null;
  const bMusts = getMapMustateels(newMap);
  if (!bMusts.length) return null;

  // Reference pool: mustateel label → { geo, transform, rotation, must },
  // from every placed map of the same village (excluding the new map itself).
  // Storing the transform + rotation lets chained mogas inherit the first
  // moga's rotation so the whole mouza stays on one aligned grid.
  const placedMust = new Map();
  const village = newMap.village;
  for (const m of maps || []) {
    if (!m || m.id === newMap.id) continue;
    if (m.geo_placement_lat == null || m.geo_placement_lng == null) continue;
    if (village && m.village && m.village !== village) continue;
    if (!m.drawing_data) continue;
    let objs;
    try {
      objs = DrawingStateManager.deserialize(m.drawing_data);
    } catch {
      continue;
    }
    const rot = m.geo_rotation || 0;
    const t = computeOneClickTransform(
      { lat: m.geo_placement_lat, lng: m.geo_placement_lng },
      objs,
      rot
    );
    if (!t) continue;
    for (const must of getMapMustateels(m)) {
      if (!placedMust.has(must.label)) placedMust.set(must.label, { geo: t.transform(must.x, must.y), transform: t, rotation: rot, must });
    }
  }
  if (!placedMust.size) return null;

  let bObjects;
  try {
    bObjects = DrawingStateManager.deserialize(newMap.drawing_data);
  } catch {
    return null;
  }

  // Same matching strategies as arrangeMogas: exact merge, then adjacent right/left.
  // Adjacent offsets are computed through the reference transform so rotation
  // is inherited — the dummy lands one mustateel-width away along the rotated grid.
  let best = null;
  for (const bm of bMusts) {
    if (placedMust.has(bm.label)) {
      const ref = placedMust.get(bm.label);
      best = { bMust: bm, targetGeo: ref.geo, rotation: ref.rotation, method: "overlap" };
      break;
    }
  }
  if (!best) {
    for (const bm of bMusts) {
      const n = parseInt(bm.label);
      if (isNaN(n)) continue;
      if (placedMust.has(String(n - 1))) {
        const ref = placedMust.get(String(n - 1));
        best = { bMust: bm, targetGeo: ref.transform.transform(ref.must.x + MUST_W_FT, ref.must.y), rotation: ref.rotation, method: "adjacent-right" };
        break;
      }
      if (placedMust.has(String(n + 1))) {
        const ref = placedMust.get(String(n + 1));
        best = { bMust: bm, targetGeo: ref.transform.transform(ref.must.x - MUST_W_FT, ref.must.y), rotation: ref.rotation, method: "adjacent-left" };
        break;
      }
    }
  }
  if (!best) return null;

  const placement = computePlacementForMustateel(bObjects, best.bMust, best.targetGeo, best.rotation);
  if (!placement) return null;
  return { placement, matchedLabel: best.bMust.label, method: best.method, rotation: best.rotation };
}

// ============================================================
// SUGGEST NEXT MOGAS — given the currently-placed mogas of a
// village, return the unplaced moga maps that can chain off them
// (exact Khasra match → merge, or consecutive number → adjacent
// with zero gap). Each suggestion includes the computed placement
// so the user can place it in one click.
// Returns [{ mapId, mogaNumber, village, matchedLabel, method, placement }]
// ============================================================
export function suggestNextMogas(maps, village) {
  const placedMust = new Map();
  const placedIds = new Set();
  for (const m of maps || []) {
    if (!m || m.geo_placement_lat == null || m.geo_placement_lng == null) continue;
    if (village && m.village && m.village !== village) continue;
    if (!m.drawing_data) continue;
    placedIds.add(m.id);
    let objs;
    try { objs = DrawingStateManager.deserialize(m.drawing_data); } catch { continue; }
    const rot = m.geo_rotation || 0;
    const t = computeOneClickTransform({ lat: m.geo_placement_lat, lng: m.geo_placement_lng }, objs, rot);
    if (!t) continue;
    for (const must of getMapMustateels(m)) {
      if (!placedMust.has(must.label)) placedMust.set(must.label, { geo: t.transform(must.x, must.y), transform: t, rotation: rot, must });
    }
  }
  if (!placedMust.size) return [];

  const suggestions = [];
  for (const m of maps || []) {
    if (!m || placedIds.has(m.id) || m.geo_placement_lat != null) continue;
    if (village && m.village && m.village !== village) continue;
    if (!m.drawing_data) continue;
    const bMusts = getMapMustateels(m);
    if (!bMusts.length) continue;
    let best = null;
    for (const bm of bMusts) {
      if (placedMust.has(bm.label)) {
        const ref = placedMust.get(bm.label);
        best = { bMust: bm, targetGeo: ref.geo, rotation: ref.rotation, method: "overlap" };
        break;
      }
    }
    if (!best) {
      for (const bm of bMusts) {
        const n = parseInt(bm.label);
        if (isNaN(n)) continue;
        if (placedMust.has(String(n - 1))) {
          const ref = placedMust.get(String(n - 1));
          best = { bMust: bm, targetGeo: ref.transform.transform(ref.must.x + MUST_W_FT, ref.must.y), rotation: ref.rotation, method: "adjacent-right" };
          break;
        }
        if (placedMust.has(String(n + 1))) {
          const ref = placedMust.get(String(n + 1));
          best = { bMust: bm, targetGeo: ref.transform.transform(ref.must.x - MUST_W_FT, ref.must.y), rotation: ref.rotation, method: "adjacent-left" };
          break;
        }
      }
    }
    if (!best) continue;
    let bObjects;
    try { bObjects = DrawingStateManager.deserialize(m.drawing_data); } catch { continue; }
    const placement = computePlacementForMustateel(bObjects, best.bMust, best.targetGeo, best.rotation);
    if (!placement) continue;
    suggestions.push({ mapId: m.id, mogaNumber: m.moga_number || "", village: m.village || "", matchedLabel: best.bMust.label, method: best.method, placement, rotation: best.rotation });
  }
  suggestions.sort((a, b) => parseInt(a.mogaNumber) - parseInt(b.mogaNumber));
  return suggestions;
}

// ============================================================
// SNAP PLACEMENT TO GRID — when a moga is dragged with the
// move tool, snap its placement so its mustateel grid aligns
// exactly with the nearest placed moga's grid (same village).
// This prevents one mustateel's boundary cutting through the
// center of another — mustateels either merge (same number) or
// sit side-by-side with zero gap, never half-overlapping.
// Returns the snapped { lat, lng } placement, or the raw dragged
// geo when no reference moga is available.
// ============================================================
export function snapPlacementToGrid(movedMap, draggedGeo, maps, village) {
  if (!movedMap?.drawing_data) return draggedGeo;
  let movedObjs;
  try { movedObjs = DrawingStateManager.deserialize(movedMap.drawing_data); } catch { return draggedGeo; }
  const movedMusts = getMapMustateels(movedMap);
  if (!movedMusts.length) return draggedGeo;
  const movedFirst = movedMusts.reduce((a, b) => (b.y < a.y || (b.y === a.y && b.x < a.x)) ? b : a);

  const refs = (maps || []).filter(
    (m) => m && m.id !== movedMap.id && m.geo_placement_lat != null && m.geo_placement_lng != null &&
      (!village || !m.village || m.village === village) && m.drawing_data
  );
  if (!refs.length) return draggedGeo;

  let bestRef = null, bestDist = Infinity;
  for (const r of refs) {
    const d = Math.hypot(r.geo_placement_lat - draggedGeo.lat, r.geo_placement_lng - draggedGeo.lng);
    if (d < bestDist) { bestDist = d; bestRef = r; }
  }
  if (!bestRef) return draggedGeo;

  let refObjs;
  try { refObjs = DrawingStateManager.deserialize(bestRef.drawing_data); } catch { return draggedGeo; }
  const refTransform = computeOneClickTransform(
    { lat: bestRef.geo_placement_lat, lng: bestRef.geo_placement_lng }, refObjs, bestRef.geo_rotation || 0
  );
  if (!refTransform) return draggedGeo;
  const refMusts = getMapMustateels(bestRef);
  if (!refMusts.length) return draggedGeo;
  const refFirst = refMusts.reduce((a, b) => (b.y < a.y || (b.y === a.y && b.x < a.x)) ? b : a);
  const refGridOrigin = refTransform.transform(refFirst.x, refFirst.y);

  const movedTransform = computeOneClickTransform(draggedGeo, movedObjs, 0);
  if (!movedTransform) return draggedGeo;
  const movedFirstGeo = movedTransform.transform(movedFirst.x, movedFirst.y);

  const cosLat = Math.cos((refGridOrigin.lat * Math.PI) / 180);
  const mPerDegLng = M_PER_DEG_LAT * cosLat;
  const dEastFt = ((movedFirstGeo.lng - refGridOrigin.lng) * mPerDegLng) / FT_TO_M;
  const dNorthFt = ((movedFirstGeo.lat - refGridOrigin.lat) * M_PER_DEG_LAT) / FT_TO_M;

  const MUST_W = DIMENSIONS.MUSTATEEL.width;  // 440 ft
  const MUST_H = DIMENSIONS.MUSTATEEL.height; // 990 ft
  const snapEast = Math.round(dEastFt / MUST_W) * MUST_W;
  const snapNorth = Math.round(dNorthFt / MUST_H) * MUST_H;

  const snappedGridOrigin = {
    lat: refGridOrigin.lat + (snapNorth * FT_TO_M) / M_PER_DEG_LAT,
    lng: refGridOrigin.lng + (snapEast * FT_TO_M) / mPerDegLng,
  };

  // Inherit the reference moga's rotation so the dragged moga stays on the
  // same rotated grid — boundaries align exactly, no gap or angle mismatch.
  const refRot = bestRef.geo_rotation || 0;
  const placement = computePlacementForMustateel(movedObjs, movedFirst, snappedGridOrigin, refRot);
  if (!placement) return { ...draggedGeo, rotation: refRot };
  return { ...placement, rotation: refRot };
}

// ============================================================
// EDGE DUMMY MUSTATEELS — for the selected moga's mustateel set,
// compute "dummy" rectangle positions on the OUTSIDE of every
// boundary mustateel (left / right / top / bottom). Each dummy is
// one mustateel-size cell sitting adjacent to an edge mustateel,
// ready for the user to click and attach a new moga there.
// Returns [{ x, y, w, h, side }]
// ============================================================
export function getEdgeDummyMustateels(objects, mogaFilter) {
  const musts = objects.filter(
    (o) => o.type === "mustateel" && o.label &&
      (!mogaFilter || !o.mogaNumber || String(o.mogaNumber) === String(mogaFilter))
  );
  if (!musts.length) return [];
  const dummies = [];
  const seen = new Set();
  const TOL = 3; // canvas-unit tolerance for "adjacent"
  const add = (x, y, w, h, side, srcLabel) => {
    const key = `${Math.round(x)},${Math.round(y)}`;
    if (seen.has(key)) return;
    // Skip if a real mustateel already occupies this position
    const occupied = musts.some(m => Math.abs(m.x - x) < TOL && Math.abs(m.y - y) < TOL);
    if (occupied) return;
    seen.add(key);
    dummies.push({ x, y, w, h, side, srcLabel: srcLabel || "" });
  };
  for (const m of musts) {
    // Left side open? (no mustateel ending at this one's left edge, same row)
    const hasLeft = musts.some(o => Math.abs((o.x + o.w) - m.x) < TOL && Math.abs(o.y - m.y) < TOL && Math.abs(o.h - m.h) < TOL);
    if (!hasLeft) add(m.x - m.w, m.y, m.w, m.h, "left", m.label);
    // Right side open?
    const hasRight = musts.some(o => Math.abs(o.x - (m.x + m.w)) < TOL && Math.abs(o.y - m.y) < TOL && Math.abs(o.h - m.h) < TOL);
    if (!hasRight) add(m.x + m.w, m.y, m.w, m.h, "right", m.label);
    // Top side open?
    const hasTop = musts.some(o => Math.abs((o.y + o.h) - m.y) < TOL && Math.abs(o.x - m.x) < TOL && Math.abs(o.w - m.w) < TOL);
    if (!hasTop) add(m.x, m.y - m.h, m.w, m.h, "top", m.label);
    // Bottom side open?
    const hasBottom = musts.some(o => Math.abs(o.y - (m.y + m.h)) < TOL && Math.abs(o.x - m.x) < TOL && Math.abs(o.w - m.w) < TOL);
    if (!hasBottom) add(m.x, m.y + m.h, m.w, m.h, "bottom", m.label);
  }
  return dummies;
}

// Find unplaced maps of the same village that contain a mustateel with the
// given Khasra label. Excludes already-placed maps and the given exclude ids.
// Returns [{ map, must }] — must is the matching mustateel canvas rect.
export function findUnplacedMogasByLabel(maps, village, label, excludeIds = [], opts = {}) {
  const lbl = String(label).trim();
  if (!lbl) return [];
  const ex = new Set(excludeIds);
  const out = [];
  for (const m of maps || []) {
    if (!m || ex.has(m.id)) continue;
    // In canvas merge mode, "placed" means already attached to the merge map —
    // not geo placement. Skip the geo check when skipGeoCheck is set.
    if (!opts.skipGeoCheck && m.geo_placement_lat != null) continue;
    if (village && m.village && m.village !== village) continue;
    if (!m.drawing_data) continue;
    const musts = getMapMustateels(m);
    const match = musts.find((mu) => mu.label === lbl);
    if (match) out.push({ map: m, must: match });
  }
  return out;
}