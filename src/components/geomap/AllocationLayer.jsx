import React, { useMemo } from "react";
import { Polygon, Tooltip } from "react-leaflet";
import L from "leaflet";
import {
  parcelKillaCells,
  cellLatLngs,
  kanalUsedInAcre,
  acreAllocations,
} from "@/lib/allocationEngine";

// Renders clickable killa (acre) cells over each mustateel/muraba of the selected moga.
// The filled area inside each acre is proportional to the kanal allotted (used/8);
// the remaining portion stays vacant (dashed boundary). Clickable only in allocation mode.
export default function AllocationLayer({ objects, overlay, selectedMoga, allocations, mode, onCellClick, onEditAllocation, activeMustateelIds, onMustateelClick }) {
  const cells = useMemo(() => {
    if (!overlay?.transform) return [];
    const out = [];
    for (const o of objects) {
      if (o.type !== "mustateel" && o.type !== "muraba") continue;
      if (selectedMoga && o.mogaNumber && String(o.mogaNumber) !== String(selectedMoga)) continue;
      const mustNo = o.label || "";
      for (const cell of parcelKillaCells(o)) {
        out.push({
          key: `${o.id}-${cell.killa}`,
          obj: o,
          mustNo,
          acre: cell.killa,
          cell,
          latlngs: cellLatLngs(cell, overlay.transform),
        });
      }
    }
    return out;
  }, [objects, overlay, selectedMoga]);

  return (
    <>
      {cells.map(({ key, obj, mustNo, acre, cell, latlngs }) => {
        const used = kanalUsedInAcre(allocations, mustNo, acre);
        const acs = acreAllocations(allocations, mustNo, acre);
        const frac = Math.max(0, Math.min(1, used / 8));
        const label = acs.map((a) => `${(a.farmer_name || "?").slice(0, 12)} ${a.kanal}K`).join(" / ");
        const isActive = activeMustateelIds?.has(obj.id);
        // Filled sub-rectangle — left portion of the acre = used/8 of its width
        const fillLatLngs =
          frac > 0
            ? [
                [cell.x, cell.y],
                [cell.x + cell.w * frac, cell.y],
                [cell.x + cell.w * frac, cell.y + cell.h],
                [cell.x, cell.y + cell.h],
              ].map(([cx, cy]) => overlay.transform.transform(cx, cy))
            : null;
        return (
          <React.Fragment key={key}>
            {/* Base acre cell — dashed boundary, vacant */}
            <Polygon
              positions={latlngs.map((p) => [p.lat, p.lng])}
              pathOptions={{ color: "#dc2626", fillColor: "#000000", fillOpacity: 0, weight: mode ? 1 : 0, dashArray: "4,4", interactive: true }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  if (mode) onCellClick(obj, mustNo, acre);
                  else onMustateelClick && onMustateelClick(obj.id);
                },
              }}
            >
              {(isActive || label) && (
                <Tooltip permanent direction="center" className="killa-label" opacity={1}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#fff",
                      textShadow: "0 0 2px #000, 0 0 2px #000",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isActive && <span style={{ color: "#facc15" }}>{acre}</span>}
                    {isActive && label ? " · " : ""}
                    {label}
                  </span>
                </Tooltip>
              )}
            </Polygon>
            {/* Filled portion — proportional to kanal selected; clickable to edit the
                existing allocation (green patch → open its properties). */}
            {fillLatLngs && mode && (
              <Polygon
                positions={fillLatLngs.map((p) => [p.lat, p.lng])}
                pathOptions={{ color: "#15803d", fillColor: "#16a34a", fillOpacity: 0.55, weight: 1, interactive: true }}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onEditAllocation && onEditAllocation(obj, mustNo, acre);
                  },
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}