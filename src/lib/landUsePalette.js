// ============================================================
// LAND-USE PALETTE — per-acre (killa) land-use coloring for
// mustateels. Each acre can be tagged with a color + Urdu label
// (آبادی / قبرستان / فیکٹری / ...). The legend lists every
// distinct land-use present on the map with its color and name.
// ============================================================

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

// Always returns a length-10 array (one entry per killa) of null | {color, label}.
export function getAcreUses(obj) {
  if (!obj || !Array.isArray(obj.acreUses)) return Array(10).fill(null);
  const u = obj.acreUses.slice(0, 10);
  while (u.length < 10) u.push(null);
  return u.map(x => (x && x.color ? { color: x.color, label: x.label || "" } : null));
}

// Collect every distinct land-use {color, label} used across all mustateels.
export function collectLandUses(objects) {
  const seen = new Map();
  for (const o of objects || []) {
    if (o.type !== "mustateel") continue;
    for (const u of getAcreUses(o)) {
      if (!u || !u.color || !u.label) continue;
      const key = u.color + "|" + u.label;
      if (!seen.has(key)) seen.set(key, { color: u.color, label: u.label });
    }
  }
  return Array.from(seen.values());
}