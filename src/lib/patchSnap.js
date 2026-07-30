import { polygonAreaSqMeters, sqMetersToUnits, haversine } from "@/lib/geoOverlay";
import { getMustateelKillaCells, getMurabaKillaCells } from "@/lib/gisEngine";

// Build invisible 1-kanal grid intersections (lat/lng) for mustateels/murabas of the moga.
// The draw tool snaps to these so patches follow acre/kanal boundaries without showing lines.
export function buildGridPoints(objects, transform, mogaFilter) {
  if (!transform) return [];
  const pts = [];
  for (const o of objects) {
    if (o.type !== "mustateel" && o.type !== "muraba") continue;
    if (mogaFilter && o.mogaNumber && String(o.mogaNumber) !== String(mogaFilter)) continue;
    // 1 acre = 8 kanal → subdivide each acre into 8 strips per axis.
    const cols = (o.type === "mustateel" ? 2 : 5) * 8;
    const rows = (o.type === "mustateel" ? 5 : 5) * 8;
    const stepX = o.w / cols;
    const stepY = o.h / rows;
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        pts.push(transform.transform(o.x + c * stepX, o.y + r * stepY));
      }
    }
  }
  // Canal / watercourse / khal centerlines — lets the pencil follow canal boundaries too.
  for (const o of objects) {
    if (o.type !== "canal" && o.type !== "khal" && o.type !== "watercourse") continue;
    if (!o.points || o.points.length < 2) continue;
    for (let i = 0; i < o.points.length - 1; i++) {
      const a = o.points[i], b = o.points[i + 1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(2, Math.floor(dist / 10));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        pts.push(transform.transform(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
      }
    }
  }
  return pts;
}

// Snap a lat/lng to the nearest invisible grid intersection within threshold (meters).
export function snapToGrid(latlng, gridPoints, thresholdM = 10) {
  if (!gridPoints || gridPoints.length === 0) return latlng;
  let best = latlng;
  let bestD = thresholdM;
  for (const p of gridPoints) {
    const d = haversine(latlng.lat, latlng.lng, p.lat, p.lng);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

// Area of a drawn patch (lat/lng polygon) in acres / kanal / marla.
export function patchArea(latlngs) {
  const sqm = polygonAreaSqMeters(latlngs);
  const u = sqMetersToUnits(sqm);
  const acres = u.acres;
  const totalK = acres * 8;
  const kanal = Math.floor(totalK);
  const marla = Math.round((totalK - kanal) * 20);
  return { acres, kanal, marla, totalKanal: totalK };
}

function pointInLatLngPolygon(p, poly) {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng,
      yi = poly[i].lat;
    const xj = poly[j].lng,
      yj = poly[j].lat;
    const intersect =
      yi > p.lat !== yj > p.lat &&
      p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Determine which killa (acre) cells are covered by the drawn polygon (centroid inside).
export function coveredAcres(latlngs, objects, transform, mogaFilter) {
  if (!transform) return [];
  const out = [];
  for (const o of objects) {
    if (o.type !== "mustateel" && o.type !== "muraba") continue;
    if (mogaFilter && o.mogaNumber && String(o.mogaNumber) !== String(mogaFilter)) continue;
    const mustNo = o.label || "";
    const cells = o.type === "mustateel" ? getMustateelKillaCells(o) : getMurabaKillaCells(o);
    for (const cell of cells) {
      const c = transform.transform(cell.x + cell.w / 2, cell.y + cell.h / 2);
      if (pointInLatLngPolygon(c, latlngs)) out.push({ mustNo, acre: cell.killa });
    }
  }
  return out;
}

// Reject a newly-drawn patch if it overlaps any existing patch polygon
// (a vertex of one falls inside the other).
export function patchesOverlap(newPoly, existingPolys) {
  if (!newPoly || newPoly.length < 3) return false;
  for (const ex of existingPolys) {
    const exPoly = ex.geometry || ex;
    if (!exPoly || exPoly.length < 3) continue;
    for (const p of newPoly) if (pointInLatLngPolygon(p, exPoly)) return true;
    for (const p of exPoly) if (pointInLatLngPolygon(p, newPoly)) return true;
  }
  return false;
}

// Build khasra list strings from covered acres, e.g. ["840/3,4,5", "841/1"]
export function khasraListFromCovered(covered) {
  const byMust = {};
  for (const c of covered) {
    if (!byMust[c.mustNo]) byMust[c.mustNo] = [];
    byMust[c.mustNo].push(c.acre);
  }
  const parts = [];
  for (const must of Object.keys(byMust)) {
    const acres = [...new Set(byMust[must])].sort((a, b) => a - b);
    parts.push(`${must}/${acres.join(",")}`);
  }
  return parts;
}