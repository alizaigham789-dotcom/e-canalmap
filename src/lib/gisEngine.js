// ============================================================
// GIS ENGINE v2 — Professional Irrigation & Canal GIS
// Symmetric Bilateral Buffering, Z-Index Stack, Fill Engine,
// Canal Damage Markers, Snap Engine, Command History
// ============================================================

export const DIMENSIONS = {
  ACRE: { width: 220, height: 198 },
  MUSTATEEL: { width: 440, height: 990 },
  MURABA: { width: 1100, height: 990 },
  CANAL_WIDTH: 14,
  KHAL_WIDTH: 8,
  ROAD_WIDTH: 28,
};

export const LOCKED_DIMS = {
  acre: { w: DIMENSIONS.ACRE.width, h: DIMENSIONS.ACRE.height },
  mustateel: { w: DIMENSIONS.MUSTATEEL.width, h: DIMENSIONS.MUSTATEEL.height },
  muraba: { w: DIMENSIONS.MURABA.width, h: DIMENSIONS.MURABA.height },
};

export const BASE_SCALE = 0.12;

// ============================================================
// COORDINATE TRANSFORMS
// ============================================================
export function screenToWorld(sx, sy, panX, panY, zoom) {
  return { x: (sx - panX) / zoom, y: (sy - panY) / zoom };
}

export function worldToScreen(wx, wy, panX, panY, zoom) {
  return { x: wx * zoom + panX, y: wy * zoom + panY };
}

// ============================================================
// SYMMETRIC BILATERAL BUFFERING
// Spine stays anchored; boundaries offset ±W/2 perpendicular
// ============================================================
export function getParallelPolyline(points, offset) {
  if (points.length < 2) return points;
  const result = [];
  for (let i = 0; i < points.length; i++) {
    let nx = 0, ny = 0;
    if (i === 0) {
      const dx = points[1].x - points[0].x, dy = points[1].y - points[0].y;
      const len = Math.hypot(dx, dy);
      if (len > 0) { nx = -dy / len; ny = dx / len; }
    } else if (i === points.length - 1) {
      const dx = points[i].x - points[i-1].x, dy = points[i].y - points[i-1].y;
      const len = Math.hypot(dx, dy);
      if (len > 0) { nx = -dy / len; ny = dx / len; }
    } else {
      const dx1 = points[i].x - points[i-1].x, dy1 = points[i].y - points[i-1].y;
      const dx2 = points[i+1].x - points[i].x, dy2 = points[i+1].y - points[i].y;
      const len1 = Math.hypot(dx1, dy1), len2 = Math.hypot(dx2, dy2);
      if (len1 > 0 && len2 > 0) {
        const n1x = -dy1/len1, n1y = dx1/len1;
        const n2x = -dy2/len2, n2y = dx2/len2;
        nx = (n1x + n2x) / 2; ny = (n1y + n2y) / 2;
        const nLen = Math.hypot(nx, ny);
        if (nLen > 0) { nx /= nLen; ny /= nLen; }
      }
    }
    result.push({ x: points[i].x + nx * offset, y: points[i].y + ny * offset });
  }
  return result;
}

// ============================================================
// DISTANCE UTILITIES
// ============================================================
export function distToLineSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function nearestPointOnPolyline(px, py, points) {
  let minDist = Infinity, nearest = null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i+1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx*dx + dy*dy;
    if (lenSq === 0) continue;
    let t = ((px - a.x)*dx + (py - a.y)*dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nx = a.x + t*dx, ny = a.y + t*dy;
    const dist = Math.hypot(px - nx, py - ny);
    if (dist < minDist) { minDist = dist; nearest = { x: nx, y: ny, dist, segIdx: i, t }; }
  }
  return nearest;
}

// ============================================================
// SNAP ENGINE — toggleable, 8px pixel-proximity threshold
// ============================================================
export function computeSnapPosition(wx, wy, activeTool, objects, snapSettings) {
  const threshold = 8 / (snapSettings.zoom || 1);
  const { gridSnap, spineSnap, mogaSnap } = snapSettings;

  let bestX = wx, bestY = wy, bestDist = Infinity;

  // Grid snap — snap to cadastral grid corners
  if (gridSnap) {
    if (activeTool === "acre") {
      const gx = Math.round(wx / DIMENSIONS.ACRE.width) * DIMENSIONS.ACRE.width;
      const gy = Math.round(wy / DIMENSIONS.ACRE.height) * DIMENSIONS.ACRE.height;
      if (Math.hypot(wx - gx, wy - gy) < threshold * 3) { bestX = gx; bestY = gy; bestDist = 0; }
    } else if (activeTool === "mustateel") {
      const gx = Math.round(wx / DIMENSIONS.MUSTATEEL.width) * DIMENSIONS.MUSTATEEL.width;
      const gy = Math.round(wy / DIMENSIONS.MUSTATEEL.height) * DIMENSIONS.MUSTATEEL.height;
      if (Math.hypot(wx - gx, wy - gy) < threshold * 3) { bestX = gx; bestY = gy; bestDist = 0; }
    } else if (activeTool === "muraba") {
      const gx = Math.round(wx / DIMENSIONS.MURABA.width) * DIMENSIONS.MURABA.width;
      const gy = Math.round(wy / DIMENSIONS.MURABA.height) * DIMENSIONS.MURABA.height;
      if (Math.hypot(wx - gx, wy - gy) < threshold * 3) { bestX = gx; bestY = gy; bestDist = 0; }
    }
  }

  // Moga anchor snap
  if (mogaSnap) {
    for (const o of objects) {
      if (o.type === "outlet") {
        const ds = Math.hypot(wx - o.start.x, wy - o.start.y);
        if (ds < threshold && ds < bestDist) { bestX = o.start.x; bestY = o.start.y; bestDist = ds; }
      }
    }
  }

  // Canal/road spine snap — snap to endpoints first (for seamless connection), then spine
  if (spineSnap) {
    for (const o of objects) {
      if (["canal", "khal", "road"].includes(o.type) && o.points?.length >= 2) {
        // Prefer endpoint snap (start/end of existing canal) for seamless joining
        const endpoints = [o.points[0], o.points[o.points.length - 1]];
        for (const ep of endpoints) {
          const d = Math.hypot(wx - ep.x, wy - ep.y);
          if (d < threshold * 2 && d < bestDist) { bestX = ep.x; bestY = ep.y; bestDist = d; }
        }
        // Also spine snap
        const near = nearestPointOnPolyline(wx, wy, o.points);
        if (near && near.dist < threshold && near.dist < bestDist) {
          bestX = near.x; bestY = near.y; bestDist = near.dist;
        }
      }
    }
  }

  // Parcel boundary snap for chakbandi/mouza
  if (["chakbandi", "mouza"].includes(activeTool)) {
    const snap = snapToParcelBoundaries(wx, wy, objects, threshold * 2);
    return snap;
  }

  return { x: bestX, y: bestY };
}

// ============================================================
// SNAP TO GRID FUNCTIONS
// ============================================================
export function snapToAcreGrid(wx, wy) {
  return { x: Math.round(wx / DIMENSIONS.ACRE.width) * DIMENSIONS.ACRE.width, y: Math.round(wy / DIMENSIONS.ACRE.height) * DIMENSIONS.ACRE.height };
}

export function snapToMustateeelGrid(wx, wy) {
  return { x: Math.round(wx / DIMENSIONS.MUSTATEEL.width) * DIMENSIONS.MUSTATEEL.width, y: Math.round(wy / DIMENSIONS.MUSTATEEL.height) * DIMENSIONS.MUSTATEEL.height };
}

export function snapToMurabaGrid(wx, wy) {
  return { x: Math.round(wx / DIMENSIONS.MURABA.width) * DIMENSIONS.MURABA.width, y: Math.round(wy / DIMENSIONS.MURABA.height) * DIMENSIONS.MURABA.height };
}

export function snapToParcelBoundaries(wx, wy, objects, threshold = 15) {
  let bestX = wx, bestY = wy, bestXDelta = threshold, bestYDelta = threshold;
  let cornerSnap = null;

  for (const o of objects) {
    if (!["acre", "mustateel", "muraba"].includes(o.type)) continue;
    for (const ex of [o.x, o.x + o.w]) {
      const d = Math.abs(wx - ex);
      if (d < bestXDelta) { bestX = ex; bestXDelta = d; }
    }
    for (const ey of [o.y, o.y + o.h]) {
      const d = Math.abs(wy - ey);
      if (d < bestYDelta) { bestY = ey; bestYDelta = d; }
    }
    const killaCols = o.type === "muraba" ? 5 : 2;
    const killaRows = 5;
    const cellW = o.w / killaCols, cellH = o.h / killaRows;
    for (let c = 0; c <= killaCols; c++) {
      const ex = o.x + c * cellW;
      if (Math.abs(wx - ex) < bestXDelta) { bestX = ex; bestXDelta = Math.abs(wx - ex); }
    }
    for (let r = 0; r <= killaRows; r++) {
      const ey = o.y + r * cellH;
      if (Math.abs(wy - ey) < bestYDelta) { bestY = ey; bestYDelta = Math.abs(wy - ey); }
    }
    const corners = [{ x: o.x, y: o.y }, { x: o.x+o.w, y: o.y }, { x: o.x, y: o.y+o.h }, { x: o.x+o.w, y: o.y+o.h }];
    for (const cn of corners) {
      if (Math.hypot(wx - cn.x, wy - cn.y) < threshold) cornerSnap = cn;
    }
  }
  if (cornerSnap) return { x: cornerSnap.x, y: cornerSnap.y };
  return { x: bestX, y: bestY };
}

// ============================================================
// MOVE SNAP ENGINE
// ============================================================
export function snapMovePosition(obj, allObjects) {
  const lock = LOCKED_DIMS[obj.type];
  if (!lock) return { x: obj.x, y: obj.y };
  let snappedX = Math.round(obj.x / lock.w) * lock.w;
  let snappedY = Math.round(obj.y / lock.h) * lock.h;
  const threshold = Math.min(lock.w, lock.h) * 0.12;
  const others = allObjects.filter(o => o.id !== obj.id && ["mustateel", "muraba", "acre"].includes(o.type));
  let bestX = snappedX, bestXDelta = threshold, bestY = snappedY, bestYDelta = threshold;
  for (const other of others) {
    const tests = [
      { x: other.x + other.w, delta: Math.abs(snappedX - (other.x + other.w)) },
      { x: other.x - lock.w, delta: Math.abs((snappedX + lock.w) - other.x) },
      { x: other.x, delta: Math.abs(snappedX - other.x) },
      { x: other.x + other.w - lock.w, delta: Math.abs((snappedX + lock.w) - (other.x + other.w)) },
    ];
    for (const t of tests) { if (t.delta < bestXDelta) { bestX = t.x; bestXDelta = t.delta; } }
    const testsY = [
      { y: other.y + other.h, delta: Math.abs(snappedY - (other.y + other.h)) },
      { y: other.y - lock.h, delta: Math.abs((snappedY + lock.h) - other.y) },
      { y: other.y, delta: Math.abs(snappedY - other.y) },
      { y: other.y + other.h - lock.h, delta: Math.abs((snappedY + lock.h) - (other.y + other.h)) },
    ];
    for (const t of testsY) { if (t.delta < bestYDelta) { bestY = t.y; bestYDelta = t.delta; } }
  }
  return { x: bestX, y: bestY };
}

// ============================================================
// KILLA GRID NUMBERING
// ============================================================
export function getMustateeelKillaGrid() {
  return [[1, 10], [2, 9], [3, 8], [4, 7], [5, 6]];
}

export function getMurabaKillaGrid() {
  return [
    [1, 2, 3, 4, 5],
    [10, 9, 8, 7, 6],
    [11, 12, 13, 14, 15],
    [20, 19, 18, 17, 16],
    [21, 22, 23, 24, 25],
  ];
}

// ============================================================
// VECTOR PATCH FILL ENGINE
// Supports: solid, diagonal, crosshatch, dots, horizontal, vertical
// ============================================================
export function createFillPattern(ctx, fillStyle, color, opacity = 1, spacing = 8) {
  if (fillStyle === "solid") return null; // handled by fillStyle directly

  const offscreen = document.createElement("canvas");
  offscreen.width = spacing * 2;
  offscreen.height = spacing * 2;
  const oc = offscreen.getContext("2d");
  oc.strokeStyle = color;
  oc.lineWidth = 1;
  oc.globalAlpha = opacity;

  if (fillStyle === "diagonal") {
    oc.beginPath();
    oc.moveTo(0, offscreen.height);
    oc.lineTo(offscreen.width, 0);
    oc.moveTo(-offscreen.width/2, offscreen.height/2);
    oc.lineTo(offscreen.width/2, -offscreen.height/2);
    oc.moveTo(offscreen.width/2, offscreen.height*1.5);
    oc.lineTo(offscreen.width*1.5, offscreen.height/2);
    oc.stroke();
  } else if (fillStyle === "crosshatch") {
    oc.beginPath();
    oc.moveTo(0, offscreen.height);
    oc.lineTo(offscreen.width, 0);
    oc.moveTo(0, 0);
    oc.lineTo(offscreen.width, offscreen.height);
    oc.stroke();
  } else if (fillStyle === "dots") {
    oc.fillStyle = color;
    oc.globalAlpha = opacity;
    oc.beginPath();
    oc.arc(spacing/2, spacing/2, 1.5, 0, Math.PI * 2);
    oc.fill();
  } else if (fillStyle === "horizontal") {
    oc.beginPath();
    oc.moveTo(0, spacing/2);
    oc.lineTo(offscreen.width, spacing/2);
    oc.stroke();
  } else if (fillStyle === "vertical") {
    oc.beginPath();
    oc.moveTo(spacing/2, 0);
    oc.lineTo(spacing/2, offscreen.height);
    oc.stroke();
  }

  return ctx.createPattern(offscreen, "repeat");
}

// ============================================================
// GEOMETRY LOCK ENGINE
// ============================================================
export function enforceGeometryLock(obj) {
  const lock = LOCKED_DIMS[obj.type];
  if (lock) { obj.w = lock.w; obj.h = lock.h; }
  return obj;
}

export function isGeometryLocked(type) { return type in LOCKED_DIMS; }

// ============================================================
// AUTO-LABEL ENGINE
// ============================================================
export function autoAssignLabel(type, existingObjects) {
  if (!["mustateel", "muraba"].includes(type)) return "";
  const numbers = existingObjects
    .filter(o => o.type === type && o.label)
    .map(o => { const m = o.label.match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; });
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return String(nextNum);
}

// ============================================================
// OBJECT FACTORIES
// ============================================================
export function createAcre(wx, wy) {
  return {
    id: `acre_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "acre", x: wx, y: wy,
    w: DIMENSIONS.ACRE.width, h: DIMENSIONS.ACRE.height,
    label: "", locked: true,
    fillStyle: "solid", fillColor: "rgba(234,179,8,0.08)", fillOpacity: 0.08, fillSpacing: 8,
    killaStyle: { strokeColor: "#eab308", strokeWidth: 1, strokeOpacity: 0.15, strokeStyle: "solid", labelColor: "#b45309" },
  };
}

export function createMustateel(wx, wy, ownerName = "") {
  return {
    id: `must_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "mustateel", x: wx, y: wy,
    w: DIMENSIONS.MUSTATEEL.width, h: DIMENSIONS.MUSTATEEL.height,
    ownerName, showOwner: true, label: "", locked: true,
    fillStyle: "solid", fillColor: "rgba(245,158,11,0.10)", fillOpacity: 0.10, fillSpacing: 8,
    killaStyle: { strokeColor: "#ef4444", strokeWidth: 1, strokeOpacity: 0.15, strokeStyle: "solid", labelColor: "rgba(220,38,38,0.9)" },
    lockSizeShape: true,
  };
}

export function createMuraba(wx, wy, ownerName = "") {
  return {
    id: `murb_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "muraba", x: wx, y: wy,
    w: DIMENSIONS.MURABA.width, h: DIMENSIONS.MURABA.height,
    ownerName, showOwner: true, label: "", locked: true,
    fillStyle: "solid", fillColor: "rgba(249,115,22,0.08)", fillOpacity: 0.08, fillSpacing: 8,
    killaStyle: { strokeColor: "#ef4444", strokeWidth: 1, strokeOpacity: 0.10, strokeStyle: "solid", labelColor: "rgba(220,38,38,0.85)" },
    lockSizeShape: true,
  };
}

export function createCanal(points, name = "") {
  return {
    id: `canal_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "canal", points: points.map(p => ({ ...p })), name,
    width: DIMENSIONS.CANAL_WIDTH,
  };
}

export function createKhal(points, name = "") {
  return {
    id: `khal_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "khal", points: points.map(p => ({ ...p })), name,
    width: DIMENSIONS.KHAL_WIDTH,
  };
}

export function createRoad(points, name = "") {
  return {
    id: `road_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "road", points: points.map(p => ({ ...p })), name,
    width: DIMENSIONS.ROAD_WIDTH,
  };
}

export function createOutlet(canalId, startPt, endPt, label = "") {
  return {
    id: `outlet_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "outlet", canalId,
    start: { ...startPt }, end: { ...endPt },
    label, mogha_name: "", mogha_number: "", mogha_side: "",
    arrowScale: 1, blockSize: 20,
  };
}

export function createChakbandi(points, name = "") {
  return {
    id: `chakbandi_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "chakbandi", points: points.map(p => ({ ...p })), name,
    width: DIMENSIONS.CANAL_WIDTH, crossPattern: true, crossSize: 8, crossSpacing: 40,
  };
}

export function createMouza(points, name = "") {
  return {
    id: `mouza_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "mouza", points: points.map(p => ({ ...p })), name,
  };
}

// Simple line-based damage mark (no metadata form required)
export function createDamageMarker(x, y) {
  return {
    id: `dmg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "damageMarker",
    points: [{ x, y }], // start point; end point added on second click
    x, y, // kept for legacy hit-test compatibility
  };
}

export function createDamageMarkerLine(startPt, endPt) {
  return {
    id: `dmg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "damageMarker",
    points: [{ ...startPt }, { ...endPt }],
    x: startPt.x, y: startPt.y,
  };
}

// ============================================================
// COLLISION & PLACEMENT
// ============================================================
export function rectsOverlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

// Snap new parcel to existing boundary edges — no gaps, no overlaps, exact edge matching
// The parcel is placed at the grid cell the user clicked, then snapped to adjacent parcel edges
// if any are very close (within half a cell width). This ensures the parcel lands where clicked
// and only sticks to neighbors if it's genuinely near them.
export function snapToNearestBoundary(newObj, existingObjects) {
  const sameParcels = existingObjects.filter(o => o.type === newObj.type);
  const allParcels = existingObjects.filter(o => ["mustateel", "muraba", "acre"].includes(o.type));

  // Always snap to grid first — this is the primary placement
  const gw = newObj.w, gh = newObj.h;
  const snappedX = Math.round(newObj.x / gw) * gw;
  const snappedY = Math.round(newObj.y / gh) * gh;

  if (sameParcels.length === 0) return { x: snappedX, y: snappedY };

  // Magnetic snap threshold: within half a cell in each axis
  const magX = gw * 0.5;
  const magY = gh * 0.5;

  let bestX = snappedX, bestY = snappedY;
  let bestXDelta = magX, bestYDelta = magY; // only snap if CLOSER than threshold

  for (const p of sameParcels) {
    // X-axis candidates: right edge of p, left edge of p (minus width), same column as p
    const candidates = [
      { x: p.x + p.w, d: Math.abs(snappedX - (p.x + p.w)) },
      { x: p.x - gw,  d: Math.abs(snappedX - (p.x - gw)) },
      { x: p.x,       d: Math.abs(snappedX - p.x) },
    ];
    for (const c of candidates) {
      if (c.d < bestXDelta) { bestX = c.x; bestXDelta = c.d; }
    }
    // Y-axis candidates: below p, above p, same row as p
    const candidatesY = [
      { y: p.y + p.h, d: Math.abs(snappedY - (p.y + p.h)) },
      { y: p.y - gh,  d: Math.abs(snappedY - (p.y - gh)) },
      { y: p.y,       d: Math.abs(snappedY - p.y) },
    ];
    for (const c of candidatesY) {
      if (c.d < bestYDelta) { bestY = c.y; bestYDelta = c.d; }
    }
  }

  const candidate = { x: bestX, y: bestY, w: newObj.w, h: newObj.h };
  // If overlapping after snap, place at pure grid position (not next to anything)
  if (allParcels.some(p => rectsOverlap(candidate, p))) {
    // Try pure grid position first
    const gridCandidate = { x: snappedX, y: snappedY, w: gw, h: gh };
    if (!allParcels.some(p => rectsOverlap(gridCandidate, p))) {
      return { x: snappedX, y: snappedY };
    }
    return findNonOverlappingPosition(candidate, existingObjects);
  }
  return { x: bestX, y: bestY };
}

export function findNonOverlappingPosition(newObj, existingObjects) {
  const existingParcels = existingObjects.filter(o => ["mustateel", "muraba", "acre"].includes(o.type));
  if (existingParcels.length === 0) return { x: newObj.x, y: newObj.y };
  if (!existingParcels.some(p => rectsOverlap(newObj, p))) return { x: newObj.x, y: newObj.y };

  // Search in expanding spiral: right, down, left, up, then diagonals
  const directions = [
    { dx: newObj.w, dy: 0 }, { dx: 0, dy: newObj.h },
    { dx: -newObj.w, dy: 0 }, { dx: 0, dy: -newObj.h },
    { dx: newObj.w, dy: newObj.h }, { dx: -newObj.w, dy: newObj.h },
    { dx: newObj.w, dy: -newObj.h }, { dx: -newObj.w, dy: -newObj.h },
  ];
  for (let r = 1; r <= 10; r++) {
    for (const dir of directions) {
      const candidate = { x: newObj.x + dir.dx * r, y: newObj.y + dir.dy * r, w: newObj.w, h: newObj.h };
      if (!existingParcels.some(p => rectsOverlap(candidate, p))) return { x: candidate.x, y: candidate.y };
    }
  }
  return { x: newObj.x, y: newObj.y };
}

// ============================================================
// IMMUTABLE COMMAND PATTERN HISTORY — infinite undo/redo
// ============================================================
export class DrawingStateManager {
  constructor(initialObjects = []) {
    this.objects = [...initialObjects];
    this.history = [JSON.stringify(initialObjects)];
    this.historyIdx = 0;
  }

  _clampHistory() {
    if (this.history.length > 200) {
      this.history = this.history.slice(this.history.length - 200);
      this.historyIdx = Math.min(this.historyIdx, this.history.length - 1);
    }
  }

  snapshot() {
    this.history = this.history.slice(0, this.historyIdx + 1);
    this.history.push(JSON.stringify(this.objects));
    this.historyIdx++;
    this._clampHistory();
  }

  undo() {
    if (this.historyIdx > 0) {
      this.historyIdx--;
      this.objects = JSON.parse(this.history[this.historyIdx]);
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIdx < this.history.length - 1) {
      this.historyIdx++;
      this.objects = JSON.parse(this.history[this.historyIdx]);
      return true;
    }
    return false;
  }

  add(obj) {
    this.objects = [...this.objects, enforceGeometryLock(obj)];
    this.snapshot();
  }

  remove(id) {
    this.objects = this.objects.filter(o => o.id !== id);
    this.snapshot();
  }

  update(id, changes) {
    this.objects = this.objects.map(o => {
      if (o.id !== id) return o;
      const merged = { ...o, ...changes };
      if (o.locked || isGeometryLocked(o.type)) {
        const lock = LOCKED_DIMS[o.type];
        if (lock) { merged.w = lock.w; merged.h = lock.h; }
      }
      return merged;
    });
    this.snapshot();
  }

  getByType(type) { return this.objects.filter(o => o.type === type); }

  serialize() { return JSON.stringify(this.objects); }

  static deserialize(json) {
    try { return JSON.parse(json) || []; } catch { return []; }
  }
}

// ============================================================
// FRUSTUM CULLING — skip objects outside viewport
// ============================================================
export function isInViewport(obj, pan, zoom, canvasW, canvasH, margin = 100) {
  const vx0 = -pan.x / zoom - margin;
  const vy0 = -pan.y / zoom - margin;
  const vx1 = vx0 + canvasW / zoom + margin * 2;
  const vy1 = vy0 + canvasH / zoom + margin * 2;

  if (obj.type === "damageMarker") {
    return obj.x >= vx0 && obj.x <= vx1 && obj.y >= vy0 && obj.y <= vy1;
  }
  if (["acre", "mustateel", "muraba"].includes(obj.type)) {
    return !(obj.x + obj.w < vx0 || obj.x > vx1 || obj.y + obj.h < vy0 || obj.y > vy1);
  }
  if (obj.points) {
    return obj.points.some(p => p.x >= vx0 && p.x <= vx1 && p.y >= vy0 && p.y <= vy1);
  }
  if (obj.start) {
    return obj.start.x >= vx0 && obj.start.x <= vx1 && obj.start.y >= vy0 && obj.start.y <= vy1;
  }
  return true;
}

// ============================================================
// HIT TEST — for eraser: boundary-based (click edge or interior)
// ============================================================
export function hitTest(wx, wy, objects, eraser = false) {
  const BORDER_THRESH = eraser ? 20 : 0; // eraser hits on boundary edge click
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      if (eraser) {
        // Hit if click is on boundary (within BORDER_THRESH) OR inside
        const onBoundary =
          (wx >= o.x - BORDER_THRESH && wx <= o.x + o.w + BORDER_THRESH &&
           wy >= o.y - BORDER_THRESH && wy <= o.y + o.h + BORDER_THRESH) &&
          (wx <= o.x + BORDER_THRESH || wx >= o.x + o.w - BORDER_THRESH ||
           wy <= o.y + BORDER_THRESH || wy >= o.y + o.h - BORDER_THRESH ||
           (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h));
        if (onBoundary) return o;
      } else {
        if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return o;
      }
    } else if (o.type === "damageMarker") {
      if (Math.hypot(wx - o.x, wy - o.y) < 12) return o;
      if (o.points?.length >= 2) {
        for (let j = 0; j < o.points.length - 1; j++) {
          if (distToLineSegment(wx, wy, o.points[j].x, o.points[j].y, o.points[j+1].x, o.points[j+1].y) < 12) return o;
        }
      }
    } else if (["canal", "chakbandi", "khal", "road"].includes(o.type)) {
      const thresh = eraser ? 25 : 15;
      for (let j = 0; j < o.points.length - 1; j++) {
        if (distToLineSegment(wx, wy, o.points[j].x, o.points[j].y, o.points[j+1].x, o.points[j+1].y) < thresh) return o;
      }
    } else if (o.type === "outlet") {
      if (distToLineSegment(wx, wy, o.start.x, o.start.y, o.end.x, o.end.y) < 15) return o;
    } else if (o.type === "mouza") {
      for (let j = 0; j < o.points.length - 1; j++) {
        if (distToLineSegment(wx, wy, o.points[j].x, o.points[j].y, o.points[j+1].x, o.points[j+1].y) < 12) return o;
      }
    }
  }
  return null;
}