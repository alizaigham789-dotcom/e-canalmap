import React, { useMemo } from "react";
import { Polygon, Tooltip } from "react-leaflet";
import L from "leaflet";
import { DrawingStateManager } from "@/lib/gisEngine";
import { computeOneClickTransform } from "@/lib/geoOverlay";

// Transparent clickable polygons over each saved (placed) moga.
// Default (Overlay mode): one polygon over each moga's bounding area —
// clicking selects that moga via onMogaClick(map).
// perMustateel (Map View): one polygon per mustateel/muraba of every placed
// moga — clicking selects that exact parcel via onMustateelClick(map, obj),
// so the clicked mustateel becomes the active parcel (grid lines + acre
// numbers) even when it belongs to a different moga than the current one.
export default function SavedMogaClickLayer({ maps, excludeId, onMogaClick, perMustateel = false, onMustateelClick }) {
  const clickableMogas = useMemo(() => {
    const out = [];
    for (const m of maps) {
      if (!m || m.id === excludeId) continue;
      if (m.geo_placement_lat == null || m.geo_placement_lng == null) continue;
      if (!m.drawing_data) continue;
      let objects;
      try { objects = DrawingStateManager.deserialize(m.drawing_data); } catch { continue; }
      if (!objects || !objects.length) continue;
      const transform = computeOneClickTransform(
        { lat: m.geo_placement_lat, lng: m.geo_placement_lng },
        objects, m.geo_rotation || 0
      );
      if (!transform) continue;
      const pts = [];
      for (const o of objects) {
        if (["mustateel", "muraba", "acre"].includes(o.type)) {
          const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
          for (const [cx, cy] of corners) pts.push(transform.transform(cx, cy));
        } else if (o.points?.length) {
          for (const p of o.points) pts.push(transform.transform(p.x, p.y));
        } else if (o.start && o.end) {
          pts.push(transform.transform(o.start.x, o.start.y));
          pts.push(transform.transform(o.end.x, o.end.y));
        }
      }
      const valid = pts.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (valid.length < 3) continue;
      const lats = valid.map(p => p.lat);
      const lngs = valid.map(p => p.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const bounds = [[minLat, minLng], [maxLat, minLng], [maxLat, maxLng], [minLat, maxLng]];
      const parcels = perMustateel
        ? objects
            .filter(o => (o.type === "mustateel" || o.type === "muraba"))
            .map(o => {
              const corners = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]]
                .map(([cx, cy]) => transform.transform(cx, cy));
              return { obj: o, positions: corners.map(p => [p.lat, p.lng]) };
            })
        : null;
      out.push({ id: m.id, map: m, bounds, parcels });
    }
    return out;
  }, [maps, excludeId, perMustateel]);

  if (perMustateel) {
    return (
      <>
        {clickableMogas.map(m => (m.parcels || []).map(({ obj, positions }) => (
          <Polygon
            key={`${m.id}-${obj.id || obj.label}`}
            positions={positions}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.01, weight: 0, interactive: true }}
            eventHandlers={{
              click: (e) => { L.DomEvent.stopPropagation(e); onMustateelClick && onMustateelClick(m.map, obj); },
            }}
          >
            <Tooltip direction="top" sticky opacity={1}>
              <div className="text-xs">
                <div className="font-bold text-slate-800">مستطیل {obj.label || "—"}</div>
                <div className="text-[10px] text-slate-500">موگہ {m.map.moga_number || "—"} · کلک کریں</div>
              </div>
            </Tooltip>
          </Polygon>
        )))}
      </>
    );
  }

  return (
    <>
      {clickableMogas.map((m) => (
        <Polygon
          key={m.id}
          positions={m.bounds}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.01, weight: 0, interactive: true }}
          eventHandlers={{
            click: (e) => { L.DomEvent.stopPropagation(e); onMogaClick(m.map); },
          }}
        >
          <Tooltip direction="top" sticky opacity={1}>
            <div className="text-xs">
              <div className="font-bold text-slate-800">{m.map.title}</div>
              <div className="text-[10px] text-slate-500">موگہ {m.map.moga_number || "—"} · کلک کریں</div>
            </div>
          </Tooltip>
        </Polygon>
      ))}
    </>
  );
}