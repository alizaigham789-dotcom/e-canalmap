import React, { useMemo } from "react";
import { Polygon, Marker } from "react-leaflet";
import L from "leaflet";
import { getEdgeDummyMustateels, getMapMustateels } from "@/lib/mogaArrange";
import { computeOneClickTransform } from "@/lib/geoOverlay";
import { DrawingStateManager } from "@/lib/gisEngine";

// Suggested next Khasra number for a dummy — based on the adjacent
// mustateel's label and which side the dummy sits on.
function nextNumber(srcLabel, side) {
  const n = parseInt(srcLabel, 10);
  if (isNaN(n)) return null;
  // Mustateel numbering usually runs left→right, then wraps. A dummy on
  // the right or bottom continues forward (+1); left or top goes back (-1).
  if (side === "right" || side === "bottom") return n + 1;
  return n - 1;
}

// Yellow plus icon in the center of each dummy mustateel — signals "attach a moga here".
function plusIcon(num) {
  const badge = num != null
    ? `<div style="position:absolute;top:-10px;right:-10px;min-width:22px;height:22px;background:#eab308;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#1a1a1a;box-shadow:0 1px 4px rgba(0,0,0,0.4);padding:0 4px;">${num}</div>`
    : "";
  return L.divIcon({
    html: `<div style="position:relative;width:44px;height:44px;border:3px dashed #eab308;border-radius:10px;background:rgba(234,179,8,0.22);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(234,179,8,0.5);">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a16207" stroke-width="3.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      ${badge}
    </div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// Collect the geo top-left corners of all mustateels from already-placed mogas
// (excluding the current map). Used to suppress dummies that would sit on top
// of a placed moga's mustateel — so when two mogas are chained, the inner dummies
// between them disappear and only the outer-boundary dummies remain.
function placedMustateelGeoCorners(maps, excludeId) {
  const corners = [];
  for (const m of maps || []) {
    if (!m || m.id === excludeId) continue;
    if (m.geo_placement_lat == null || m.geo_placement_lng == null) continue;
    if (!m.drawing_data) continue;
    let objs;
    try { objs = DrawingStateManager.deserialize(m.drawing_data); } catch { continue; }
    const t = computeOneClickTransform(
      { lat: m.geo_placement_lat, lng: m.geo_placement_lng },
      objs,
      m.geo_rotation || 0
    );
    if (!t) continue;
    for (const must of getMapMustateels(m)) {
      const tl = t.transform(must.x, must.y);
      corners.push({ lat: tl.lat, lng: tl.lng });
    }
  }
  return corners;
}

// Renders full-size yellow "dummy" mustateel cells on every open side of the
// placed moga. Each dummy is one mustateel-sized rectangle with a "+" icon and
// the suggested next Khasra number badge. Dummies that overlap an already-placed
// adjacent moga's mustateel are hidden so only the outer boundary shows.
export default function DummyMustateelLayer({ objects, overlay, selectedMoga, onClick, maps, excludeMapId }) {
  const dummies = useMemo(
    () => getEdgeDummyMustateels(objects, selectedMoga),
    [objects, selectedMoga]
  );

  const occupiedCorners = useMemo(
    () => placedMustateelGeoCorners(maps, excludeMapId),
    [maps, excludeMapId]
  );

  if (!overlay?.transform || !dummies.length) return null;

  // ~2 m tolerance in degrees — enough to catch mustateel corners that align
  // after chaining, without removing dummies that are merely nearby.
  const TOL = 0.00002;

  return (
    <>
      {dummies.map((d, i) => {
        const corners = [
          [d.x, d.y],
          [d.x + d.w, d.y],
          [d.x + d.w, d.y + d.h],
          [d.x, d.y + d.h],
        ].map(([cx, cy]) => overlay.transform.transform(cx, cy));
        const center = overlay.transform.transform(d.x + d.w / 2, d.y + d.h / 2);
        const num = nextNumber(d.srcLabel, d.side);
        // Skip this dummy if a placed adjacent moga already occupies its corner
        const tl = corners[0];
        const isOccupied = occupiedCorners.some(
          (c) => Math.abs(c.lat - tl.lat) < TOL && Math.abs(c.lng - tl.lng) < TOL
        );
        if (isOccupied) return null;
        return (
          <React.Fragment key={i}>
            <Polygon
              positions={corners.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: "#eab308",
                fillColor: "#facc15",
                fillOpacity: 0.28,
                weight: 3,
                dashArray: "10,6",
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onClick(d);
                },
              }}
            />
            <Marker position={[center.lat, center.lng]} icon={plusIcon(num)} interactive={false} />
          </React.Fragment>
        );
      })}
    </>
  );
}