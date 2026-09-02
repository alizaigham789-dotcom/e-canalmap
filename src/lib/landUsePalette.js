// ============================================================
// LAND-USE PALETTE — per-acre (killa) land-use coloring for
// mustateels/murabas. Each acre can be tagged with a color + Urdu label
// (آبادی / قبرستان / فیکٹری / ...). The legend lists every
// distinct land-use present on the map with its color and name.
// ============================================================

import { getMustateelKillaCells, getMurabaKillaCells, getKanalFills } from "@/lib/gisEngine";

// Fixed, named land-use presets — explicit colours (not random).
export const LAND_USE_PRESETS = [
  { id: "abadi", label: "آبادی", color: "#dc2626" },     // red — population / settlement
  { id: "qabaristan", label: "قبرستان", color: "#4b5563" }, // slate — graveyard
  { id: "factory", label: "فیکٹری", color: "#92400e" },   // brown — factory / industry
  { id: "road", label: "سڑک", color: "#111827" },         // black — road
  { id: "water", label: "پانی", color: "#2563eb" },       // blue — water / pond
  { id: "khet", label: "کھیت", color: "#16a34a" },        // green — cultivated field
  { id: "khali", label: "خالی", color: "#eab308" },       // yellow — vacant / barren
  { id: "banjar", label: "بنجر", color: "#78716c" },      // stone — wasteland
];

// Total killa cells for a parcel type — mustateel = 10, muraba = 25, acre = 1.
export function killaCountFor(obj) {
  return obj && obj.type === "muraba" ? 25 : (obj && obj.type === "acre" ? 1 : 10);
}

// Always returns an array (one entry per killa) of null | {color, label}.
export function getAcreUses(obj) {
  const total = killaCountFor(obj);
  if (!obj || !Array.isArray(obj.acreUses)) return Array(total).fill(null);
  const u = obj.acreUses.slice(0, total);
  while (u.length < total) u.push(null);
  return u.map(x => (x && x.color ? { color: x.color, label: x.label || "" } : null));
}

// Collect every distinct land-use {color, label} used across all parcels — includes
// per-acre acreUses AND per-kanal box colours (so a single acre holding multiple
// colours still lists each one in the legend).
export function collectLandUses(objects) {
  const seen = new Map();
  const add = (color, label) => {
    if (!color || !label) return;
    const key = color + "|" + label;
    if (!seen.has(key)) seen.set(key, { color, label });
  };
  for (const o of objects || []) {
    if (o.type !== "mustateel" && o.type !== "muraba") continue;
    for (const u of getAcreUses(o)) add(u && u.color, u && u.label);
    for (const f of getKanalFills(o)) {
      if (!f) continue;
      add(f.color, f.label); // acre default
      if (f.boxColors) for (const b of Object.keys(f.boxColors)) {
        const bc = f.boxColors[b];
        if (bc) add(bc.color, bc.label);
      }
    }
  }
  return Array.from(seen.values());
}

// Which side of a polyline a point lies on (sign relative to nearest segment).
// +1 = left of the line, -1 = right, 0 = on it.
function sideOfPolyline(pts, px, py) {
  let best = Infinity, bestSign = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projx = a.x + t * dx, projy = a.y + t * dy;
    const d2 = (px - projx) ** 2 + (py - projy) ** 2;
    if (d2 < best) {
      best = d2;
      bestSign = Math.sign(dx * (py - a.y) - dy * (px - a.x));
    }
  }
  return bestSign;
}

// Per-acre label for a parcel. When the parcel carries two labels (label + label2)
// and a mouza boundary line crosses it, acres on one side show label, the other side
// label2. Used by both the colour-fill control and the ikhraj (exclusion) control so
// each acre row shows the correct mustateel/muraba number.
// Returns an array indexed by killa-1 (0..total-1).
export function acreLabelsFor(local, allObjects) {
  const total = killaCountFor(local);
  const label1 = local.label || "";
  const label2 = local.label2 || "";

  const cells = local.type === "muraba" ? getMurabaKillaCells(local)
    : local.type === "mustateel" ? getMustateelKillaCells(local)
    : [{ killa: 1, x: local.x, y: local.y, w: local.w || 220, h: local.h || 198 }];
  const byKilla = Array(total).fill(null);
  cells.forEach((cell) => { if (cell && cell.killa >= 1 && cell.killa <= total) byKilla[cell.killa - 1] = cell; });

  const mouzas = (allObjects || []).filter((o) => o.type === "mouza" && o.points && o.points.length >= 2);
  const useSplit = !!label2 && mouzas.length > 0;
  if (!useSplit) return byKilla.map(() => label1 || "—");

  const mx1 = local.x, my1 = local.y;
  const mx2 = local.x + (local.w || 0), my2 = local.y + (local.h || 0);
  const mouza = mouzas.find((m) => {
    const xs = m.points.map((p) => p.x), ys = m.points.map((p) => p.y);
    return Math.max(...xs) >= mx1 && Math.min(...xs) <= mx2 && Math.max(...ys) >= my1 && Math.min(...ys) <= my2;
  }) || mouzas[0];

  return byKilla.map((cell) => {
    if (!cell) return label1 || "—";
    const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
    return sideOfPolyline(mouza.points, cx, cy) >= 0 ? label1 : label2;
  });
}