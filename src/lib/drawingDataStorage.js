// ============================================================
// DRAWING DATA STORAGE — handle entity field size limits.
// Entity string fields have a maximum allowed size. When the
// serialized drawing data is too large to store inline, upload it
// as a file via the UploadFile integration and store the returned
// URL in the drawing_data field instead. On load, a URL is fetched
// and parsed back into objects.
// ============================================================

import { base44 } from "@/api/base44Client";

// Above this size, upload as a file and store the URL instead of inline JSON.
const SIZE_THRESHOLD = 100000;

export function isDrawingDataUrl(stored) {
  return typeof stored === "string" && /^https?:\/\//.test(stored);
}

// Serialize objects for the drawing_data field. Returns a JSON string (small)
// or an uploaded file URL (large). Always returns a string.
export async function storeDrawingData(objects) {
  const json = JSON.stringify(objects);
  if (json.length <= SIZE_THRESHOLD) return json;
  try {
    const blob = new Blob([json], { type: "application/json" });
    const file = new File([blob], `drawing_${Date.now()}.json`, { type: "application/json" });
    const res = await base44.integrations.Core.UploadFile({ file });
    return res.file_url;
  } catch {
    return json; // fall back to inline JSON (may fail at the API, but preserves shape)
  }
}

// Load objects from a stored drawing_data value (JSON string or file URL).
export async function loadDrawingData(stored) {
  if (!stored) return [];
  if (isDrawingDataUrl(stored)) {
    try {
      const res = await fetch(stored);
      const text = await res.text();
      return JSON.parse(text);
    } catch {
      return [];
    }
  }
  try { return JSON.parse(stored); } catch { return []; }
}