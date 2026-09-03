import React, { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

// Draggable marker for each placed moga. Dragging updates its saved
// geo_placement anchor so the whole overlay moves with it.
function moveIcon(label) {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(99,102,241,0.7);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;cursor:grab;">${label || "↔"}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function MogaMoveLayer({ maps, village, selectedMapId, onMoved }) {
  const placed = useMemo(
    () =>
      (maps || []).filter(
        (m) =>
          m.geo_placement_lat != null &&
          m.geo_placement_lng != null &&
          m.id !== selectedMapId &&
          (!village || !m.village || m.village === village)
      ),
    [maps, village, selectedMapId]
  );

  return (
    <>
      {placed.map((m) => (
        <Marker
          key={m.id}
          position={[m.geo_placement_lat, m.geo_placement_lng]}
          icon={moveIcon(m.moga_number || "")}
          draggable
          eventHandlers={{ dragend: (e) => onMoved && onMoved(m.id, e.target.getLatLng()) }}
        />
      ))}
    </>
  );
}