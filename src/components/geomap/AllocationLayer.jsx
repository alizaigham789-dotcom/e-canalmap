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
// Allocated acres are highlighted (green = full 8 kanal, amber = partial).
// Unallocated acres show a dashed red grid cell. Clickable only in allocation mode.
export default function AllocationLayer({ objects, overlay, selectedMoga, allocations, mode, onCellClick }) {
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
          latlngs: cellLatLngs(cell, overlay.transform),
        });
      }
    }
    return out;
  }, [objects, overlay, selectedMoga]);

  return (
    <>
      {cells.map(({ key, obj, mustNo, acre, latlngs }) => {
        const used = kanalUsedInAcre(allocations, mustNo, acre);
        const acs = acreAllocations(allocations, mustNo, acre);
        let pathOpts, label;
        if (used >= 8) {
          pathOpts = { color: "#15803d", fillColor: "#16a34a", fillOpacity: 0.55, weight: 2 };
          label = acs.map((a) => `${(a.farmer_name || "?").slice(0, 12)} ${a.kanal}K`).join(" / ");
        } else if (used > 0) {
          pathOpts = { color: "#b45309", fillColor: "#f59e0b", fillOpacity: 0.42, weight: 2 };
          label = acs.map((a) => `${(a.farmer_name || "?").slice(0, 12)} ${a.kanal}K`).join(" / ");
        } else {
          pathOpts = { color: "#dc2626", fillColor: "#000000", fillOpacity: 0, weight: 1, dashArray: "4,4" };
          label = "";
        }
        return (
          <Polygon
            key={key}
            positions={latlngs.map((p) => [p.lat, p.lng])}
            pathOptions={{ ...pathOpts, interactive: mode }}
            eventHandlers={
              mode
                ? {
                    click: (e) => {
                      L.DomEvent.stopPropagation(e);
                      onCellClick(obj, mustNo, acre);
                    },
                  }
                : {}
            }
          >
            {label && (
              <Tooltip permanent direction="center" className="killa-label" opacity={1}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#fff",
                    textShadow: "0 0 2px #000, 0 0 2px #000",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </Tooltip>
            )}
          </Polygon>
        );
      })}
    </>
  );
}