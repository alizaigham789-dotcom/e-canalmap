import { DIMENSIONS } from "./gisEngine";

// ============================================================
// PROFESSIONAL GIS GEO OVERLAY
// 3-Point Affine Transformation: cadastral canvas → satellite lat/lng
// Preserves true area, scale, rotation, and orientation.
// ============================================================

const SQM_PER_ACRE = 4046.8564224;
const M_PER_DEG_LAT = 111320;

// ─── LAND UNIT CONVERSIONS ─────────────────────────────────────
export const LAND_UNITS = {
  sqM_per_acre: SQM_PER_ACRE,
  sqFt_per_acre: 43560,
  kanal_per_acre: 8,
  marla_per_acre: 160,
  marla_per_kanal: 20,
  sqFt_per_marla: 272.25,
  sqM_per_marla: 25.2929,
};

// Convert square meters → all land units
export function sqMetersToUnits(sqM) {
  return {
    acres: sqM / SQM_PER_ACRE,
    kanal: sqM / (SQM_PER_ACRE / 8),
    marla: sqM / (SQM_PER_ACRE / 160),
    sqMeters: sqM,
    sqFeet: sqM * 10.7639,
  };
}

// ─── DISTANCE ───────────────────────────────────────────────────
// Haversine distance between two lat/lng points in meters
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Polyline length in meters
export function polylineLength(latlngs) {
  let len = 0;
  for (let i = 1; i < latlngs.length; i++) {
    len += haversine(latlngs[i-1].lat, latlngs[i-1].lng, latlngs[i].lat, latlngs[i].lng);
  }
  return len;
}

// ─── POLYGON AREA (Shoelace on local planar projection) ─────────
export function polygonAreaSqMeters(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const lat0 = latlngs[0].lat;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const pts = latlngs.map(p => ({ x: p.lng * mPerDegLng, y: p.lat * M_PER_DEG_LAT }));
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

// ─── CIRCLE MEASUREMENTS ────────────────────────────────────────
export function circleMeasurements(centerLat, centerLng, radiusM) {
  return {
    radius: radiusM,
    diameter: radiusM * 2,
    circumference: 2 * Math.PI * radiusM,
    area: Math.PI * radiusM * radiusM,
  };
}

// ─── RECTANGLE MEASUREMENTS ─────────────────────────────────────
export function rectMeasurements(corner1, corner2) {
  const width = Math.abs(haversine(corner1.lat, corner1.lng, corner1.lat, corner2.lng));
  const height = Math.abs(haversine(corner1.lat, corner1.lng, corner2.lat, corner1.lng));
  return { width, height, area: width * height };
}

// ─── FORMAT HELPERS ─────────────────────────────────────────────
// Distance: always show feet (primary), with meters as secondary
export function fmtDist(m) {
  const ft = m * 3.28084;
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km · ${ft.toFixed(0)} ft`;
  return `${ft.toFixed(1)} ft`;
}

// Distance: feet only (for compact tooltip labels)
export function fmtDistFeet(m) {
  return `${(m * 3.28084).toFixed(1)} ft`;
}

// Area: always show acres and kanal (primary units for land)
export function fmtArea(sqM) {
  const u = sqMetersToUnits(sqM);
  return `${u.acres.toFixed(3)} ac · ${u.kanal.toFixed(2)} kanal`;
}

// Area: acres only (compact)
export function fmtAreaAcres(sqM) {
  return `${sqMetersToUnits(sqM).acres.toFixed(3)} ac`;
}

export function fmtAreaFull(sqM) {
  const u = sqMetersToUnits(sqM);
  return {
    acres: `${u.acres.toFixed(3)} ac`,
    kanal: `${u.kanal.toFixed(2)} kanal`,
    marla: `${u.marla.toFixed(1)} marla`,
    sqFeet: `${u.sqFeet.toFixed(0)} sq ft`,
    sqMeters: `${sqM.toFixed(1)} sq m`,
  };
}

// ============================================================
// 3-POINT AFFINE TRANSFORM
// Maps cadastral canvas coordinates → real-world lat/lng
// ============================================================

// Pick 3 non-collinear reference points from canvas objects' bounding box
export function getControlPoints(objects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.w); maxY = Math.max(maxY, o.y + o.h);
    } else if (o.points?.length) {
      for (const p of o.points) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    } else if (o.start) {
      minX = Math.min(minX, o.start.x); minY = Math.min(minY, o.start.y);
      maxX = Math.max(maxX, o.end.x); maxY = Math.max(maxY, o.end.y);
    }
  }
  if (minX === Infinity) return null;
  // Three corners: TL, TR, BL — guaranteed non-collinear
  return [
    { x: minX, y: minY, label: "Top-Left" },
    { x: maxX, y: minY, label: "Top-Right" },
    { x: minX, y: maxY, label: "Bottom-Left" },
  ];
}

// Solve 3×3 linear system via Cramer's rule
function solve3x3(a, b, c, d, e, f, g, h, i, j, k, l) {
  const det = a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return {
    x: (j*(e*i - f*h) - b*(k*i - f*l) + c*(k*h - e*l)) * inv,
    y: (a*(k*i - f*l) - j*(d*i - f*g) + c*(d*l - k*g)) * inv,
    z: (a*(e*l - k*h) - b*(d*l - k*g) + j*(d*h - e*g)) * inv,
  };
}

// Compute affine transform from 3 canvas→geo point pairs
// Returns transform function: (canvasX, canvasY) → {lat, lng}
export function computeAffineTransform(canvasPts, geoPts) {
  if (!canvasPts || canvasPts.length < 3 || !geoPts || geoPts.length < 3) return null;

  // Convert geo to local meters relative to first point
  const refLat = geoPts[0].lat, refLng = geoPts[0].lng;
  const cosLat = Math.cos((refLat * Math.PI) / 180);
  const mPerDegLng = M_PER_DEG_LAT * cosLat;

  const m = geoPts.map(p => ({
    east: (p.lng - refLng) * mPerDegLng,
    north: (p.lat - refLat) * M_PER_DEG_LAT,
  }));

  // Solve for east = a*x + b*y + c
  const eastSol = solve3x3(
    canvasPts[0].x, canvasPts[0].y, 1,
    canvasPts[1].x, canvasPts[1].y, 1,
    canvasPts[2].x, canvasPts[2].y, 1,
    m[0].east, m[1].east, m[2].east
  );
  // Solve for north = d*x + e*y + f
  const northSol = solve3x3(
    canvasPts[0].x, canvasPts[0].y, 1,
    canvasPts[1].x, canvasPts[1].y, 1,
    canvasPts[2].x, canvasPts[2].y, 1,
    m[0].north, m[1].north, m[2].north
  );

  if (!eastSol || !northSol) return null;

  const a = eastSol.x, b = eastSol.y, c = eastSol.z;
  const d = northSol.x, e = northSol.y, f = northSol.z;

  // Area scale factor (determinant) — for verification
  const det = a * e - b * d;
  const canvasAreaToSqM = Math.abs(det);

  return {
    transform: (cx, cy) => {
      const east = a * cx + b * cy + c;
      const north = d * cx + e * cy + f;
      return {
        lat: refLat + north / M_PER_DEG_LAT,
        lng: refLng + east / mPerDegLng,
      };
    },
    det,
    canvasAreaToSqM,
    refLat, refLng,
    params: { a, b, c, d, e, f },
  };
}

// ─── ONE-CLICK PLACEMENT TRANSFORM ──────────────────────────────
// Places the cadastral map's upper-left corner at a clicked geo point,
// with true scale: 1 canvas unit = 1 foot = 0.3048 m, so one mustateel
// (440×990 ft = 435,600 sq ft) covers exactly 10 acres on the ground.
// Optional rotation (degrees) rotates the whole overlay around the
// placed upper-left corner.
export const FT_TO_M = 0.3048;

export function getBoundingBox(objects) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.w); maxY = Math.max(maxY, o.y + o.h);
    } else if (o.points?.length) {
      for (const p of o.points) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    } else if (o.start && o.end) {
      minX = Math.min(minX, o.start.x, o.end.x); minY = Math.min(minY, o.start.y, o.end.y);
      maxX = Math.max(maxX, o.start.x, o.end.x); maxY = Math.max(maxY, o.start.y, o.end.y);
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

export function computeOneClickTransform(geoPt, objects, rotationDeg = 0) {
  const bbox = getBoundingBox(objects);
  if (!bbox) return null;
  const { minX, minY } = bbox;
  const refLat = geoPt.lat, refLng = geoPt.lng;
  const cosLat = Math.cos((refLat * Math.PI) / 180);
  const mPerDegLng = M_PER_DEG_LAT * cosLat;
  const rad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rad), sinR = Math.sin(rad);

  return {
    transform: (cx, cy) => {
      const dx = cx - minX;        // feet east of upper-left
      const dy = cy - minY;        // feet south of upper-left (canvas y grows downward)
      const east0 = dx * FT_TO_M;   // meters east
      const north0 = -dy * FT_TO_M; // meters north (y down = south, so negative)
      const east = east0 * cosR - north0 * sinR;
      const north = east0 * sinR + north0 * cosR;
      return {
        lat: refLat + north / M_PER_DEG_LAT,
        lng: refLng + east / mPerDegLng,
      };
    },
    refLat, refLng, minX, minY,
  };
}

// Convert canvas objects to geo lat/lng using the affine transform
export function canvasRectToLatLngs(obj, transform) {
  const corners = [
    { x: obj.x, y: obj.y },
    { x: obj.x + obj.w, y: obj.y },
    { x: obj.x + obj.w, y: obj.y + obj.h },
    { x: obj.x, y: obj.y + obj.h },
  ];
  return corners.map(p => transform.transform(p.x, p.y));
}

export function canvasPolylineToLatLngs(obj, transform) {
  if (!obj.points) return [];
  return obj.points.map(p => transform.transform(p.x, p.y));
}

// Expected acres for a canvas parcel (mustateel = 10, muraba = 25, acre = 1)
export function parcelExpectedAcres(obj) {
  const canvasArea = obj.w * obj.h;
  const stdArea = DIMENSIONS.MUSTATEEL.width * DIMENSIONS.MUSTATEEL.height;
  return (canvasArea / stdArea) * 10;
}