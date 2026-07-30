import { getMustateelKillaCells, getMurabaKillaCells } from "@/lib/gisEngine";

// Killa (acre) cells for a parcel — each cell = 1 acre = 8 kanal
export function parcelKillaCells(obj) {
  if (obj.type === "mustateel") return getMustateelKillaCells(obj);
  if (obj.type === "muraba") return getMurabaKillaCells(obj);
  return [];
}

// Convert a killa cell rect (canvas coords) → 4 lat/lng corners
export function cellLatLngs(cell, transform) {
  const c = [
    [cell.x, cell.y],
    [cell.x + cell.w, cell.y],
    [cell.x + cell.w, cell.y + cell.h],
    [cell.x, cell.y + cell.h],
  ];
  return c.map(([x, y]) => transform.transform(x, y));
}

export function khasraBase(mustateelNo, acre) {
  return `${mustateelNo}/${acre}`;
}

// All allocation portions within one acre
export function acreAllocations(allocations, mustateelNo, acre) {
  return allocations.filter(
    (a) => String(a.mustateel_no) === String(mustateelNo) && a.acre_no === acre
  );
}

export function kanalUsedInAcre(allocations, mustateelNo, acre) {
  return acreAllocations(allocations, mustateelNo, acre).reduce(
    (s, a) => s + (a.kanal || 0),
    0
  );
}

// Remaining kanal that can still be allotted in this acre (cap = 8)
export function remainingKanal(allocations, mustateelNo, acre) {
  return Math.max(0, 8 - kanalUsedInAcre(allocations, mustateelNo, acre));
}

// Next sub-index for a split acre (840/3_1, 840/3_2, …)
export function nextSubIndex(allocations, mustateelNo, acre) {
  return acreAllocations(allocations, mustateelNo, acre).length + 1;
}

// Total kanal allotted across a whole mustateel (must not exceed 80)
export function kanalUsedInMustateel(allocations, mustateelNo) {
  return allocations
    .filter((a) => String(a.mustateel_no) === String(mustateelNo))
    .reduce((s, a) => s + (a.kanal || 0), 0);
}

export function acresFromKanal(kanal) {
  return (kanal || 0) / 8;
}