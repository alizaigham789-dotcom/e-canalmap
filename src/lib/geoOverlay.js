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
export function fmtDist(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  if (m >= 1) return `${m.toFixed(1)} m`;
  return `${(m * 3.281).toFixed(1)} ft`;
}

export function fmtArea(sqM) {
  const u = sqMetersToUnits(sqM);
  if (u.acres >= 1) return `${u.acres.toFixed(2)} ac · ${u.kanal.toFixed(1)} kanal`;
  if (u.kanal >= 1) return `${u.kanal.toFixed(2)} kanal · ${u.marla.toFixed(0)} marla`;
  if (u.marla >= 1) return `${u.marla.toFixed(1)} marla`;
  if (sqM >= 100) return `${sqM.toFixed(0)} m²`;
  return `${u.sqFeet.toFixed(0)} ft²`;
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