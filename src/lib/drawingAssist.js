// ============================================================
// DRAWING ASSIST — Ortho constraint, angle display, endpoint snap
// Used by Canal, Road, Khal, Mouza, Chakbandi tools for CAD-style
// straight-line assistance and seamless continuous drawing.
// ============================================================

const LINE_TOOLS = ["canal", "khal", "road", "mouza", "chakbandi"];
export function isLineTool(tool) { return LINE_TOOLS.includes(tool); }

// Constrain a candidate point to the nearest allowed angle relative to an anchor.
// angleStep in degrees (90 = pure ortho H/V, 45 = 8-way). Returns the constrained point.
export function applyOrthoConstraint(anchor, candidate, angleStep = 90) {
  if (!anchor) return candidate;
  const dx = candidate.x - anchor.x;
  const dy = candidate.y - anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return candidate;
  const stepRad = (angleStep * Math.PI) / 180;
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / stepRad) * stepRad;
  return { x: anchor.x + dist * Math.cos(snappedAngle), y: anchor.y + dist * Math.sin(snappedAngle) };
}

// Angle in degrees between two points, 0–360.
export function segmentAngleDeg(from, to) {
  if (!from || !to) return 0;
  let deg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

// Find the nearest endpoint (start/finish) of any line object within a pixel threshold.
// Returns { point, objectId } or null. Used to highlight snap targets for continuous drawing.
export function findNearbyEndpoint(wx, wy, objects, pixelThreshold = 10, zoom = 1) {
  const worldThresh = pixelThreshold / (zoom || 1);
  let best = null, bestDist = worldThresh;
  for (const o of objects) {
    if (!LINE_TOOLS.includes(o.type)) continue;
    if (!o.points || o.points.length < 2) continue;
    for (const idx of [0, o.points.length - 1]) {
      const p = o.points[idx];
      const d = Math.hypot(wx - p.x, wy - p.y);
      if (d < bestDist) { best = { point: { x: p.x, y: p.y }, objectId: o.id }; bestDist = d; }
    }
  }
  return best;
}