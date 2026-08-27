// ============================================================
// MAP BACKUP — IndexedDB persistent crash-recovery storage
// Survives app kills, browser restarts, phone reboots.
// Stores full project (objects + viewport + editor settings)
// with version history (keeps last 10 versions per map).
// ============================================================

const DB_NAME = "chakbandi_gis_db";
const DB_VERSION = 1;
const STORE_NAME = "map_backups";
const MAX_VERSIONS = 10;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function backupKey(mapId) {
  return `backup_${mapId}`;
}

// Save a backup version. Keeps the latest MAX_VERSIONS snapshots.
// Each version: { objects, viewport, editorSettings, timestamp }
export async function saveBackup(mapId, data) {
  if (!mapId || !data) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Fetch existing versions
    const existing = await new Promise((resolve) => {
      const getReq = store.get(backupKey(mapId));
      getReq.onsuccess = () => resolve(getReq.result || { key: backupKey(mapId), versions: [] });
      getReq.onerror = () => resolve({ key: backupKey(mapId), versions: [] });
    });

    const versions = existing.versions || [];
    // Prepend new version
    versions.unshift({
      objects: data.objects || [],
      viewport: data.viewport || null,
      editorSettings: data.editorSettings || null,
      timestamp: Date.now(),
    });
    // Trim to MAX_VERSIONS
    const trimmed = versions.slice(0, MAX_VERSIONS);

    store.put({ key: backupKey(mapId), versions: trimmed });

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// Get the latest backup version for a map (or null if none)
export async function getBackup(mapId) {
  if (!mapId) return null;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return await new Promise((resolve) => {
      const getReq = store.get(backupKey(mapId));
      getReq.onsuccess = () => {
        const result = getReq.result;
        if (result && result.versions && result.versions.length > 0) {
          resolve(result.versions[0]);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Get the BEST backup version for a map — the one with the most non-parcel
// objects (canals/chakbandis/khals/mouzas/outlets/roads), scanning ALL stored
// versions. This protects recovery: if a transient glitch wrote an empty/partial
// state as the latest version, getBestBackup still returns the most complete
// historical version instead of the corrupted latest one.
const NON_PARCEL_TYPES = ["canal", "chakbandi", "khal", "road", "railway", "mouza", "outlet", "damageMarker", "bridge"];
function nonParcelCount(objs) { return (objs || []).filter(o => NON_PARCEL_TYPES.includes(o.type)).length; }
export async function getBestBackup(mapId) {
  if (!mapId) return null;
  const versions = await getAllBackups(mapId);
  if (!versions || versions.length === 0) return null;
  let best = versions[0], bestNp = nonParcelCount(best.objects);
  for (const v of versions) {
    const np = nonParcelCount(v.objects);
    // Prefer the version with the most non-parcel objects; tiebreak by total count
    if (np > bestNp || (np === bestNp && (v.objects || []).length > (best.objects || []).length)) {
      best = v; bestNp = np;
    }
  }
  return best;
}

// Get all backup versions (newest first) for crash recovery / version history
export async function getAllBackups(mapId) {
  if (!mapId) return [];
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return await new Promise((resolve) => {
      const getReq = store.get(backupKey(mapId));
      getReq.onsuccess = () => resolve(getReq.result?.versions || []);
      getReq.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Clear all backups for a map (called when map is deleted)
export async function clearBackup(mapId) {
  if (!mapId) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(backupKey(mapId));
  } catch {}
}

// Save last opened map ID so the app can restore it on launch
const LAST_MAP_KEY = "chakbandi_last_map_id";
export function setLastMapId(mapId) {
  try { if (mapId) localStorage.setItem(LAST_MAP_KEY, mapId); } catch {}
}
export function getLastMapId() {
  try { return localStorage.getItem(LAST_MAP_KEY) || null; } catch { return null; }
}
export function clearLastMapId() {
  try { localStorage.removeItem(LAST_MAP_KEY); } catch {}
}