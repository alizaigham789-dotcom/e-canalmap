import React, { useMemo } from "react";
import { DrawingStateManager } from "@/lib/gisEngine";
import { computeOneClickTransform } from "@/lib/geoOverlay";
import OverlayLayer from "@/components/geomap/OverlayLayer";

// Renders every saved map (one with geo_placement) as an overlay at the same
// time, so the user can see all placed maps together. The currently-selected
// map is excluded (it is rendered by the main interactive OverlayLayer).
// Show-all overlays are non-interactive (no killa grid, no mustateel click) —
// purely a visual overview.
export default function AllOverlaysLayer({ maps, excludeId, zoom }) {
  const EMPTY = useMemo(() => new Set(), []);

  const overlays = useMemo(() => {
    const out = [];
    for (const m of maps) {
      if (!m || m.id === excludeId) continue;
      if (m.geo_placement_lat == null || m.geo_placement_lng == null) continue;
      if (!m.drawing_data) continue;
      let objects;
      try {
        objects = DrawingStateManager.deserialize(m.drawing_data);
      } catch {
        continue;
      }
      if (!objects || !objects.length) continue;
      const transform = computeOneClickTransform(
        { lat: m.geo_placement_lat, lng: m.geo_placement_lng },
        objects,
        m.geo_rotation || 0
      );
      if (transform) out.push({ id: m.id, objects, transform });
    }
    return out;
  }, [maps, excludeId]);

  return (
    <>
      {overlays.map((o) => (
        <OverlayLayer
          key={o.id}
          objects={o.objects}
          transform={o.transform}
          zoom={zoom}
          killaVisible={false}
          mogaFilter={null}
          activeMustateelIds={EMPTY}
        />
      ))}
    </>
  );
}