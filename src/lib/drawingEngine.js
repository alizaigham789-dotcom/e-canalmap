// ============================================================
// CHAKBANDI GIS DRAWING ENGINE
// Survey-grade cadastral mapping logic
// Geometry Lock Engine — dimensions preserved across all operations
// ============================================================

// Real-world survey measurements (in feet — used directly as canvas world-units at zoom=1)
export const DIMENSIONS = {
  ACRE: { width: 220, height: 198 },
  MUSTATEEL: { width: 440, height: 990 },
  MURABA: { width: 1100, height: 990 },
  CANAL_WIDTH: 14,
  KHAL_WIDTH: 8,
  ROAD_WIDTH: 28,
};

// Default label spacing for two-line features (gap between the two parallel lines)
export const DEFAULT_LINE_SPACING = {
  canal: 14,
  khal: 8,
  road: 28,
};

// Locked property keys — these CANNOT be modified by any operation except explicit user edit
export const LOCKED_DIMS = {
  acre: { w: DIMENSIONS.ACRE.width, h: DIMENSIONS.ACRE.height },
  mustateel: { w: DIMENSIONS.MUSTATEEL.width, h: DIMENSIONS.MUSTATEEL.height },
  muraba: { w: DIMENSIONS.MURABA.width, h: DIMENSIONS.MURABA.height },
};

// Pixels per foot at scale 1
export const BASE_SCALE = 0.12; // 1 ft = 0.12px at zoom=1

// Convert feet to canvas pixels
export function ftToPx(ft, zoom = 1) {
  return ft * BASE_SCALE * zoom;
}

// Convert canvas pixels to feet
export function pxToFt(px, zoom = 1) {
  return px / (BASE_SCALE * zoom);
}

// Acre grid dimensions in pixels at given zoom
export function acrePixels(zoom) {
  return {
    w: ftToPx(DIMENSIONS.ACRE.width, zoom),
    h: ftToPx(DIMENSIONS.ACRE.height, zoom),
  };
}

export function mustateeelPixels(zoom) {
  return {
    w: ftToPx(DIMENSIONS.MUSTATEEL.width, zoom),
    h: ftToPx(DIMENSIONS.MUSTATEEL.height, zoom),
  };
}

export function murabaPixels(zoom) {
  return {
    w: ftToPx(DIMENSIONS.MURABA.width, zoom),
    h: ftToPx(DIMENSIONS.MURABA.height, zoom),
  };
}

// Snap a world point to nearest acre grid corner.
// Uses raw DIMENSIONS (feet = canvas world-units at zoom=1) so grid snapping
// perfectly aligns with how objects are drawn (obj.w/obj.h used directly in fillRect).
export function snapToAcreGrid(wx, wy) {
  const w = DIMENSIONS.ACRE.width;
  const h = DIMENSIONS.ACRE.height;
  return { x: Math.round(wx / w) * w, y: Math.round(wy / h) * h };
}

export function snapToMustateeelGrid(wx, wy) {
  const w = DIMENSIONS.MUSTATEEL.width;
  const h = DIMENSIONS.MUSTATEEL.height;
  return { x: Math.round(wx / w) * w, y: Math.round(wy / h) * h };
}

export function snapToMurabaGrid(wx, wy) {
  const w = DIMENSIONS.MURABA.width;
  const h = DIMENSIONS.MURABA.height;
  return { x: Math.round(wx / w) * w, y: Math.round(wy / h) * h };
}

// ============================================================
// MOVE-SNAP ENGINE
// Snaps a moved parcel to its own grid AND to adjacent plot edges,
// guaranteeing zero gaps / overlaps between neighbouring parcels.
// ============================================================
export function snapMovePosition(obj, allObjects) {
  const lock = LOCKED_DIMS[obj.type];
  if (!lock) return { x: obj.x, y: obj.y };

  // Step 1 — snap to own grid (multiples of w/h)
  let snappedX = Math.round(obj.x / lock.w) * lock.w;
  let snappedY = Math.round(obj.y / lock.h) * lock.h;

  // Step 2 — snap to adjacent plot edges (higher priority)
  // Threshold: 12 % of the smaller dimension
  const threshold = Math.min(lock.w, lock.h) * 0.12;
  const others = allObjects.filter(
    o => o.id !== obj.id && ["mustateel", "muraba", "acre"].includes(o.type)
  );

  let bestX = snappedX;
  let bestXDelta = threshold;
  let bestY = snappedY;
  let bestYDelta = threshold;

  for (const other of others) {
    // Left edge of obj ↔ right edge of other
    const dLeftRight = Math.abs(snappedX - (other.x + other.w));
    if (dLeftRight < bestXDelta) { bestX = other.x + other.w; bestXDelta = dLeftRight; }
    // Right edge of obj ↔ left edge of other
    const dRightLeft = Math.abs((snappedX + lock.w) - other.x);
    if (dRightLeft < bestXDelta) { bestX = other.x - lock.w; bestXDelta = dRightLeft; }
    // Left edge of obj ↔ left edge of other (vertical alignment)
    const dLeftLeft = Math.abs(snappedX - other.x);
    if (dLeftLeft < bestXDelta) { bestX = other.x; bestXDelta = dLeftLeft; }
    // Right edge of obj ↔ right edge of other
    const dRightRight = Math.abs((snappedX + lock.w) - (other.x + other.w));
    if (dRightRight < bestXDelta) { bestX = other.x + other.w - lock.w; bestXDelta = dRightRight; }

    // Top edge of obj ↔ bottom edge of other
    const dTopBottom = Math.abs(snappedY - (other.y + other.h));
    if (dTopBottom < bestYDelta) { bestY = other.y + other.h; bestYDelta = dTopBottom; }
    // Bottom edge of obj ↔ top edge of other
    const dBottomTop = Math.abs((snappedY + lock.h) - other.y);
    if (dBottomTop < bestYDelta) { bestY = other.y - lock.h; bestYDelta = dBottomTop; }
    // Top edge of obj ↔ top edge of other (horizontal alignment)
    const dTopTop = Math.abs(snappedY - other.y);
    if (dTopTop < bestYDelta) { bestY = other.y; bestYDelta = dTopTop; }
    // Bottom edge of obj ↔ bottom edge of other
    const dBottomBottom = Math.abs((snappedY + lock.h) - (other.y + other.h));
    if (dBottomBottom < bestYDelta) { bestY = other.y + other.h - lock.h; bestYDelta = dBottomBottom; }
  }

  return { x: bestX, y: bestY };
}

// ============================================================
// AUTO-LABEL ENGINE
// Auto-assigns M-1, M-2 … for Mustateel and MR-1, MR-2 … for Muraba
// ============================================================
export function autoAssignLabel(type, existingObjects) {
  const prefix = type === "mustateel" ? "M" : type === "muraba" ? "MR" : "";
  if (!prefix) return "";
  const numbers = existingObjects
    .filter(o => o.type === type && o.label)
    .map(o => {
      const m = o.label.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${nextNum}`;
}

// Convert screen to world coordinates
export function screenToWorld(screenX, screenY, panX, panY, zoom) {
  return {
    x: (screenX - panX) / zoom,
    y: (screenY - panY) / zoom,
  };
}

// Convert world to screen coordinates
export function worldToScreen(worldX, worldY, panX, panY, zoom) {
  return {
    x: worldX * zoom + panX,
    y: worldY * zoom + panY,
  };
}

// ============================================================
// GEOMETRY LOCK ENGINE
// Ensures dimensions never change during move, save, export, print
// ============================================================

export function enforceGeometryLock(obj) {
  const lock = LOCKED_DIMS[obj.type];
  if (lock) {
    obj.w = lock.w;
    obj.h = lock.h;
  }
  return obj;
}

export function isGeometryLocked(type) {
  return type in LOCKED_DIMS;
}

// ============================================================
// KILLA NUMBER GRIDS
// ============================================================

export function getMustateeelKillaGrid() {
  return [
    [1, 10],
    [2, 9],
    [3, 8],
    [4, 7],
    [5, 6],
  ];
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
// GEOMETRY HELPERS
// ============================================================

export function rectContainsPoint(rect, px, py, zoom) {
  const sx = rect.x * zoom;
  const sy = rect.y * zoom;
  const sw = rect.w * zoom;
  const sh = rect.h * zoom;
  return px >= sx && px <= sx + sw && py >= sy && py <= sy + sh;
}

export function distToLineSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function nearestPointOnPolyline(px, py, points) {
  let minDist = Infinity;
  let nearest = null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nx = a.x + t * dx, ny = a.y + t * dy;
    const dist = Math.hypot(px - nx, py - ny);
    if (dist < minDist) {
      minDist = dist;
      nearest = { x: nx, y: ny, dist, segIdx: i, t };
    }
  }
  return nearest;
}

export function getParallelPolyline(points, offset) {
  if (points.length < 2) return points;
  const result = [];
  for (let i = 0; i < points.length; i++) {
    let nx = 0, ny = 0;
    if (i === 0) {
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      const len = Math.hypot(dx, dy);
      if (len > 0) { nx = -dy / len; ny = dx / len; }
    } else if (i === points.length - 1) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const len = Math.hypot(dx, dy);
      if (len > 0) { nx = -dy / len; ny = dx / len; }
    } else {
      const dx1 = points[i].x - points[i - 1].x;
      const dy1 = points[i].y - points[i - 1].y;
      const len1 = Math.hypot(dx1, dy1);
      const dx2 = points[i + 1].x - points[i].x;
      const dy2 = points[i + 1].y - points[i].y;
      const len2 = Math.hypot(dx2, dy2);
      if (len1 > 0 && len2 > 0) {
        const n1x = -dy1 / len1, n1y = dx1 / len1;
        const n2x = -dy2 / len2, n2y = dx2 / len2;
        nx = (n1x + n2x) / 2;
        ny = (n1y + n2y) / 2;
        const nLen = Math.hypot(nx, ny);
        if (nLen > 0) { nx /= nLen; ny /= nLen; }
      }
    }
    result.push({ x: points[i].x + nx * offset, y: points[i].y + ny * offset });
  }
  return result;
}

// ============================================================
// OBJECT FACTORIES (all dimensions locked to DIMENSIONS)
// ============================================================

export function createAcre(worldX, worldY) {
  const { width, height } = DIMENSIONS.ACRE;
  return {
    id: `acre_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "acre",
    x: worldX,
    y: worldY,
    w: width,
    h: height,
    label: "",
    locked: true,
  };
}

export function createMustateel(worldX, worldY, ownerName = "") {
  const { width, height } = DIMENSIONS.MUSTATEEL;
  return {
    id: `must_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "mustateel",
    x: worldX,
    y: worldY,
    w: width,
    h: height,
    ownerName,
    showOwner: true,
    label: "",
    locked: true,
  };
}

export function createMuraba(worldX, worldY, ownerName = "") {
  const { width, height } = DIMENSIONS.MURABA;
  return {
    id: `murb_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "muraba",
    x: worldX,
    y: worldY,
    w: width,
    h: height,
    ownerName,
    showOwner: true,
    label: "",
    locked: true,
  };
}

export function createCanal(points, name = "") {
  return {
    id: `canal_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "canal",
    points: points.map(p => ({ ...p })),
    name,
    width: DIMENSIONS.CANAL_WIDTH,
  };
}

export function createKhal(points, name = "") {
  return {
    id: `khal_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "khal",
    points: points.map(p => ({ ...p })),
    name,
    width: DIMENSIONS.KHAL_WIDTH,
  };
}

export function createRoad(points, name = "") {
  return {
    id: `road_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "road",
    points: points.map(p => ({ ...p })),
    name,
    width: DIMENSIONS.ROAD_WIDTH,
  };
}

export function createOutlet(canalId, startPt, endPt, label = "") {
  return {
    id: `outlet_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "outlet",
    canalId,
    start: { ...startPt },
    end: { ...endPt },
    label,
    arrowScale: 1,
    blockSize: 20,
  };
}

export function createChakbandi(points, name = "") {
  return {
    id: `chakbandi_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "chakbandi",
    points: points.map(p => ({ ...p })),
    name,
    width: DIMENSIONS.CANAL_WIDTH,
    crossPattern: false,
    crossSize: 8,
    crossSpacing: 40,
  };
}

// ============================================================
// COLLISION DETECTION
// ============================================================

export function rectsOverlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function findNonOverlappingPosition(newObj, existingObjects) {
  const parcelTypes = ["mustateel", "muraba"];
  const existingParcels = existingObjects.filter(o => parcelTypes.includes(o.type));
  
  if (existingParcels.length === 0) return { x: newObj.x, y: newObj.y };
  
  if (!existingParcels.some(p => rectsOverlap(newObj, p))) {
    return { x: newObj.x, y: newObj.y };
  }
  
  const directions = [
    { dx: newObj.w, dy: 0 },
    { dx: -newObj.w, dy: 0 },
    { dx: 0, dy: newObj.h },
    { dx: 0, dy: -newObj.h },
    { dx: newObj.w, dy: newObj.h },
    { dx: -newObj.w, dy: newObj.h },
    { dx: newObj.w, dy: -newObj.h },
    { dx: -newObj.w, dy: -newObj.h },
  ];
  
  for (const dir of directions) {
    const candidate = { x: newObj.x + dir.dx, y: newObj.y + dir.dy, w: newObj.w, h: newObj.h };
    if (!existingParcels.some(p => rectsOverlap(candidate, p))) {
      return { x: candidate.x, y: candidate.y };
    }
  }
  
  for (const dir of directions) {
    const candidate = { x: newObj.x + dir.dx * 2, y: newObj.y + dir.dy * 2, w: newObj.w, h: newObj.h };
    if (!existingParcels.some(p => rectsOverlap(candidate, p))) {
      return { x: candidate.x, y: candidate.y };
    }
  }
  
  return { x: newObj.x, y: newObj.y };
}

// ============================================================
// DRAWING STATE MANAGER
// ============================================================
export class DrawingStateManager {
  constructor(initialObjects = []) {
    this.objects = [...initialObjects];
    this.history = [JSON.stringify(initialObjects)];
    this.historyIdx = 0;
  }

  snapshot() {
    const state = JSON.stringify(this.objects);
    this.history = this.history.slice(0, this.historyIdx + 1);
    this.history.push(state);
    if (this.history.length > 50) this.history.shift();
    else this.historyIdx++;
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
      // Geometry lock: enforce fixed dimensions for locked types
      if (o.locked || isGeometryLocked(o.type)) {
        const lock = LOCKED_DIMS[o.type];
        if (lock) {
          merged.w = lock.w;
          merged.h = lock.h;
        }
      }
      return merged;
    });
    this.snapshot();
  }

  getByType(type) {
    return this.objects.filter(o => o.type === type);
  }

  serialize() {
    return JSON.stringify(this.objects);
  }

  static deserialize(json) {
    try {
      return JSON.parse(json) || [];
    } catch {
      return [];
    }
  }
}