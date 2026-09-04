// ============================================================
// SERVER-SIDE PEAK SNAPSHOT — zero-data-loss recovery backend.
// Stores the best (highest non-parcel count) version of every map
// on the server, so lost canals/chakbandis/khals/mouzas/outlets are
// ALWAYS recoverable cross-device — not just from browser storage.
//
// A snapshot is ONLY upserted when the current non-parcel count
// exceeds the stored peak. Blank/parcel-only saves never touch it,
// so the recovery source is immune to the exact overwrite that
// loses vector layers.
// ============================================================
import { base44 } from "@/api/base44Client";

const PARCEL_TYPES = ["acre", "mustateel", "muraba"];

export function countNonParcels(objects) {
  return (objects || []).filter(o => !PARCEL_TYPES.includes(o.type)).length;
}

// Upsert the peak snapshot for a map.
// Returns the confirmed peak non-parcel count, or null if skipped/failed.
// force=true (Permanent Save) updates the snapshot when the non-parcel count
// is EQUAL so it reflects the latest parcel deletions — not stale deleted
// mustateels from before the edit. The non-parcel peak is never downgraded.
export async function saveMaxSnapshot(mapId, { title, moga_number, objects, drawingData, viewport, editorSettings, force }) {
  if (!mapId) return null;
  const np = countNonParcels(objects);
  if (np <= 0) return null; // never store a parcel-only/blank state as the peak
  try {
    const existing = await base44.entities.MapSnapshot.filter({ map_id: mapId });
    const prev = existing[0];
    // Never downgrade the non-parcel peak — preserves the recovery source.
    // With force, allow equal-count updates so parcel deletions are synced.
    if (prev && prev.non_parcel_count > np) return prev.non_parcel_count;
    if (prev && prev.non_parcel_count === np && !force) return prev.non_parcel_count;
    const payload = {
      map_id: mapId,
      map_title: title || "",
      moga_number: moga_number || "",
      drawing_data: drawingData,
      viewport,
      editor_settings: editorSettings,
      non_parcel_count: np,
      total_parcels: (objects || []).filter(o => PARCEL_TYPES.includes(o.type)).length,
    };
    if (prev) await base44.entities.MapSnapshot.update(prev.id, payload);
    else await base44.entities.MapSnapshot.create(payload);
    return np;
  } catch {
    return null;
  }
}

// Fetch the peak snapshot for a map (best non-parcel version on the server).
export async function getMaxSnapshot(mapId) {
  if (!mapId) return null;
  try {
    const existing = await base44.entities.MapSnapshot.filter({ map_id: mapId });
    return existing[0] || null;
  } catch {
    return null;
  }
}