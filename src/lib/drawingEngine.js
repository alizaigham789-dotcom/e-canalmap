// ============================================================
// CHAKBANDI GIS DRAWING ENGINE
// Survey-grade cadastral mapping logic
// ============================================================

// Real-world survey measurements (in feet)
export const DIMENSIONS = {
  ACRE: { width: 220, height: 198 },
  MUSTATEEL: { width: 440, height: 990 },
  MURABA: { width: 1100, height: 990 },
  CANAL_WIDTH: 7,
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

// Snap a world point to nearest acre grid corner
export function snapToAcreGrid(wx, wy, zoom) {
  const { w, h } = acrePixels(zoom);
  const snappedX = Math.round(wx / w) * w;
  const snappedY = Math.round(wy / h) * h;
  return { x: snappedX, y: snappedY };
}

export function snapToMustateeelGrid(wx, wy, zoom) {
  const { w, h } = mustateeelPixels(zoom);
  const snappedX = Math.round(wx / w) * w;
  const snappedY = Math.round(wy / h) * h;
  return { x: snappedX, y: snappedY };
}

export function snapToMurabaGrid(wx, wy, zoom) {
  const { w, h } = murabaPixels(zoom);
  const snappedX = Math.round(wx / w) * w;
  const snappedY = Math.round(wy / h) * h;
  return { x: snappedX, y: snappedY };
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
// KILLA NUMBER GRIDS
// ============================================================

// Mustateel: 5 rows × 2 cols = 10 killas
// Left col: 1,2,3,4,5 (top→bottom)
// Right col: 10,9,8,7,6 (top→bottom)
export function getMustateeelKillaGrid() {
  return [
    [1, 10],
    [2, 9],
    [3, 8],
    [4, 7],
    [5, 6],
  ];
}

// Muraba: 5 rows × 5 cols = 25 killas
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

// Find nearest point on a polyline (array of {x,y})
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

// Get parallel offset of a polyline (for canal walls)
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
// OBJECT FACTORIES
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

export function createOutlet(canalId, startPt, endPt, label = "") {
  return {
    id: `outlet_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: "outlet",
    canalId,
    start: { ...startPt },
    end: { ...endPt },
    label,
    arrowScale: 1,
  };
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
    // Trim future if we branched
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
    this.objects = [...this.objects, obj];
    this.snapshot();
  }

  remove(id) {
    this.objects = this.objects.filter(o => o.id !== id);
    this.snapshot();
  }

  update(id, changes) {
    this.objects = this.objects.map(o => o.id === id ? { ...o, ...changes } : o);
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