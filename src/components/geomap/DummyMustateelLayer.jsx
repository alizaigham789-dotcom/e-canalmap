import React, { useMemo } from "react";
import { Polygon, Marker } from "react-leaflet";
import L from "leaflet";
import { getEdgeDummyMustateels, getMapMustateels } from "@/lib/mogaArrange";
import { computeOneClickTransform } from "@/lib/geoOverlay";
import { DrawingStateManager } from "@/lib/gisEngine";

// Yellow plus icon in the center of each dummy mustateel — signals "attach a moga here".
function plusIcon() {
  return L.divIcon({
    html: `<div style="position:relative;width:44px;height:44px;border:3px dashed #eab308;border-radius:10px;background:rgba(234,179,8,0.22);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(234,179,8,0.5);">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a16207" stroke-width="3.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// Collect the geo bounding rectangles of all mustateels from already-placed mogas
// (excluding the current map). Used to suppress dummies that OVERLAP a placed
// moga's mustateel — so when two mogas are joined, the inner dummies between
// them disappear and only the outer-boundary dummies remain.
function placedMustateelGeoRects(maps, excludeId) {
  const rects = [];
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
      const cs = [
        [must.x, must.y], [must.x + must.w, must.y],
        [must.x + must.w, must.y + must.h], [must.x, must.y + must.h],
      ].map(([cx, cy]) => t.transform(cx, cy));
      const lats = cs.map(c => c.lat), lngs = cs.map(c => c.lng);
      rects.push({
        minLat: Math.min(...lats), maxLat: Math.max(...lats),
        minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
      });
    }
  }
  return rects;
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

  const occupiedRects = useMemo(
    () => placedMustateelGeoRects(maps, excludeMapId),
    [maps, excludeMapId]
  );

  if (!overlay?.transform || !dummies.length) return null;

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
        // Skip this dummy if its rectangle overlaps any placed moga's mustateel
        // (rectangle-overlap test — robust to small placement drift, unlike a
        // corner-only match which misses dummies sitting between joined mogas).
        const lats = corners.map(c => c.lat), lngs = corners.map(c => c.lng);
        const dMinLat = Math.min(...lats), dMaxLat = Math.max(...lats);
        const dMinLng = Math.min(...lngs), dMaxLng = Math.max(...lngs);
        const isOccupied = occupiedRects.some(r =>
          dMinLat < r.maxLat && dMaxLat > r.minLat &&
          dMinLng < r.maxLng && dMaxLng > r.minLng
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
            <Marker position={[center.lat, center.lng]} icon={plusIcon()} interactive={false} />
          </React.Fragment>
        );
      })}
    </>
  );
}