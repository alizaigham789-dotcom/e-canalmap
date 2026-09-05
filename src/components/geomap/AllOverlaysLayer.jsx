import React, { useMemo } from "react";
import { DrawingStateManager } from "@/lib/gisEngine";
import { computeOneClickTransform } from "@/lib/geoOverlay";
import OverlayLayer from "@/components/geomap/OverlayLayer";

// Renders every saved map (one with geo_placement) as an overlay at the same
// time, so the user can see all placed maps together. The currently-selected
// map is excluded (it is rendered by the main interactive OverlayLayer).
// Show-all overlays are non-interactive (no killa grid, no mustateel click) —
// purely a visual overview.
//
// Same-number mustateels shared between adjacent mogas are merged: only the
// first moga (in render order) draws a given mustateel label, so overlapping
// same-number mustateels appear as a single boundary (no "double mustateel").
export default function AllOverlaysLayer({ maps, excludeId, zoom, showCanals = true, chakbandiOnly = false }) {
  const EMPTY = useMemo(() => new Set(), []);

  const { overlays, skipMap } = useMemo(() => {
    const out = [];
    const labelOwner = new Map(); // label -> first moga id that claimed it
    const skipByMoga = new Map(); // mogaId -> Set<label> to skip (already drawn by another moga)
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
      if (!transform) continue;
      out.push({ id: m.id, objects, transform });

      const skip = new Set();
      for (const o of objects) {
        if ((o.type === "mustateel" || o.type === "muraba") && o.label) {
          const lbl = String(o.label).trim();
          if (!lbl) continue;
          if (labelOwner.has(lbl) && labelOwner.get(lbl) !== m.id) {
            skip.add(lbl); // another moga already draws this label → merge
          } else {
            labelOwner.set(lbl, m.id);
          }
        }
      }
      skipByMoga.set(m.id, skip);
    }
    return { overlays: out, skipMap: skipByMoga };
  }, [maps, excludeId]);

  return (
    <>
      {overlays.map((o) => (
        <OverlayLayer
          key={`${o.id}-${chakbandiOnly ? "ch" : "base"}`}
          objects={o.objects}
          transform={o.transform}
          zoom={zoom}
          killaVisible={false}
          mogaFilter={null}
          activeMustateelIds={EMPTY}
          skipLabels={skipMap.get(o.id) || EMPTY}
          showCanals={showCanals}
          chakbandiOnly={chakbandiOnly}
        />
      ))}
    </>
  );
}