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
export function computePlacementForMustateel(bObjects, mustCanvas, targetGeo) {
  const bbox = getParcelBoundingBox(bObjects);
  if (!bbox) return null;
  const { minX, minY } = bbox;
  // offset (feet) from the anchor corner to this mustateel's top-left corner
  const dxFt = mustCanvas.x - minX;
  const dyFt = mustCanvas.y - minY;
  // At rotation 0°: east = dxFt * FT_TO_M, north = -dyFt * FT_TO_M
  const eastM = dxFt * FT_TO_M;
  const northM = -dyFt * FT_TO_M;
  const cosLat = Math.cos((targetGeo.lat * Math.PI) / 180);
  const mPerDegLng = M_PER_DEG_LAT * cosLat;
  return {
    lat: targetGeo.lat - northM / M_PER_DEG_LAT,
    lng: targetGeo.lng - eastM / mPerDegLng,
  };
}

// Offset a geo point east by a given number of feet (at rotation 0°).
function offsetGeoEast(geo, feet) {
  const cosLat = Math.cos((geo.lat * Math.PI) / 180);
  const mPerDegLng = M_PER_DEG_LAT * cosLat;
  const eastM = feet * FT_TO_M;
  return { lat: geo.lat, lng: geo.lng + eastM / mPerDegLng };
}

// Offset a geo point south by a given number of feet (for row wrapping).
function offsetGeoSouth(geo, feet) {
  const northM = -feet * FT_TO_M; // south = negative north
  return { lat: geo.lat + northM / M_PER_DEG_LAT, lng: geo.lng };
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

  // Reference pool: label → geo position (top-left corner of the mustateel)
  const placedMust = new Map();
  for (const m of anchorMustateels) {
    placedMust.set(m.label, anchorTransform.transform(m.x, m.y));
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

    let best = null; // { bMust, targetGeo, method }

    // Strategy 1: exact label match → overlap (merge, no duplicate)
    for (const bm of bMusts) {
      if (placedMust.has(bm.label)) {
        best = { bMust: bm, targetGeo: placedMust.get(bm.label), method: "overlap" };
        break;
      }
    }

    // Strategy 2: consecutive numbers → place adjacent (right / left / below)
    if (!best) {
      for (const bm of bMusts) {
        const n = parseInt(bm.label);
        if (isNaN(n)) continue;
        if (placedMust.has(String(n - 1))) {
          best = { bMust: bm, targetGeo: offsetGeoEast(placedMust.get(String(n - 1)), MUST_W_FT), method: "adjacent-right" };
          break;
        }
        if (placedMust.has(String(n + 1))) {
          best = { bMust: bm, targetGeo: offsetGeoEast(placedMust.get(String(n + 1)), -MUST_W_FT), method: "adjacent-left" };
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
    const placement = computePlacementForMustateel(bObjects, best.bMust, best.targetGeo);
    if (!placement) continue;

    results.push({
      mapId: mapB.id,
      mapTitle: mapB.title,
      mogaNumber: mapB.moga_number || "",
      placement,
      matchedLabel: best.bMust.label,
      method: best.method,
    });

    // Add B's mustateels to the reference pool so later maps can chain.
    const bTransform = computeOneClickTransform(placement, bObjects, 0);
    if (bTransform) {
      for (const bm of bMusts) {
        if (!placedMust.has(bm.label)) {
          placedMust.set(bm.label, bTransform.transform(bm.x, bm.y));
        }
      }
    }
  }

  if (!results.length) {
    return { error: "No matching mustateel numbers found between the anchor and other moga maps. Make sure mustateels have Khasra labels (numbers) that continue across mogas." };
  }
  return { results };
}