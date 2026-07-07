import { DIMENSIONS } from "./gisEngine";

// ============================================================
// GEO OVERLAY — Georeference editor mustateels onto satellite map
// The mustateel's canvas area (440×990 = 435,600 sq units) = 10 acres.
// Scale is LOCKED so every mustateel measures exactly 10 acres on the geo map.
// ============================================================

const SQM_PER_ACRE = 4046.8564224;
const MUSTATEEL_STD_CANVAS_AREA = DIMENSIONS.MUSTATEEL.width * DIMENSIONS.MUSTATEEL.height; // 435,600
const ACRES_PER_CANVAS_SQ = 10 / MUSTATEEL_STD_CANVAS_AREA;
const SQM_PER_CANVAS_SQ = ACRES_PER_CANVAS_SQ * SQM_PER_ACRE;

// Meters per canvas unit — fixed by the 10-acre mustateel definition
export const METERS_PER_CANVAS_UNIT = Math.sqrt(SQM_PER_CANVAS_SQ);

// Centroid of all overlay objects — used as the rotation pivot
export function getOverlayRefPoint(objects) {
  const parcels = objects.filter(o => ["mustateel", "muraba", "acre"].includes(o.type));
  if (parcels.length > 0) {
    const cx = parcels.reduce((s, o) => s + o.x + o.w / 2, 0) / parcels.length;
    const cy = parcels.reduce((s, o) => s + o.y + o.h / 2, 0) / parcels.length;
    return { x: cx, y: cy };
  }
  const pts = objects.filter(o => o.points).flatMap(o => o.points);
  if (pts.length === 0) return { x: 0, y: 0 };
  return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
}

// Canvas offset (canvas units, relative to ref) → {lat, lng}
// Canvas: X=right(east), Y=down(south). Geographic: lat=north(up), lng=east(right).
export function canvasOffsetToLatLng(anchorLat, anchorLng, dxCanvas, dyCanvas, rotationDeg = 0) {
  const eastM = dxCanvas * METERS_PER_CANVAS_UNIT;
  const northM = -dyCanvas * METERS_PER_CANVAS_UNIT;
  const theta = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const rEast = eastM * cos - northM * sin;
  const rNorth = eastM * sin + northM * cos;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((anchorLat * Math.PI) / 180);
  return { lat: anchorLat + rNorth / mPerDegLat, lng: anchorLng + rEast / mPerDegLng };
}

// Mustateel / muraba / acre rect → 4 lat/lng corners
export function parcelToLatLngs(obj, anchor, refX, refY, rotationDeg) {
  const corners = [
    { x: obj.x, y: obj.y },
    { x: obj.x + obj.w, y: obj.y },
    { x: obj.x + obj.w, y: obj.y + obj.h },
    { x: obj.x, y: obj.y + obj.h },
  ];
  return corners.map(c => canvasOffsetToLatLng(anchor.lat, anchor.lng, c.x - refX, c.y - refY, rotationDeg));
}

// Polyline (canal/khal/road/chakbandi/mouza) → array of {lat,lng}
export function polylineToLatLngs(obj, anchor, refX, refY, rotationDeg) {
  if (!obj.points) return [];
  return obj.points.map(p => canvasOffsetToLatLng(anchor.lat, anchor.lng, p.x - refX, p.y - refY, rotationDeg));
}

// Polygon area in acres (Shoelace, local planar approximation)
export function polygonAreaAcres(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const lat0 = (latlngs[0].lat * Math.PI) / 180;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(lat0);
  const pts = latlngs.map(p => ({ x: p.lng * mPerDegLng, y: p.lat * mPerDegLat }));
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2 / SQM_PER_ACRE;
}

// Expected acres for a parcel based on its canvas dimensions (always 10 for standard mustateel)
export function parcelExpectedAcres(obj) {
  return (obj.w * obj.h) / MUSTATEEL_STD_CANVAS_AREA * 10;
}