import React, { useState, useMemo, useCallback } from "react";
import { Polyline, Marker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { inverseTransform } from "@/lib/geoOverlay";

function vertexIcon(num) {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:#f59e0b;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;">${num || ""}</div>`,
    className: "", iconSize: [18, 18], iconAnchor: [9, 9],
  });
}
function addVertexIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:#16a34a;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:bold;line-height:1;">+</div>`,
    className: "", iconSize: [16, 16], iconAnchor: [8, 8],
  });
}
function deleteIcon() {
  return L.divIcon({
    html: `<div style="width:24px;height:24px;background:#dc2626;border:2px solid white;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:white;font-weight:bold;">×</div>`,
    className: "", iconSize: [24, 24], iconAnchor: [12, 12],
  });
}

function BackgroundClickCapture({ onBackgroundClick }) {
  useMapEvents({ click: () => onBackgroundClick() });
  return null;
}

// Canal node-editor — mirrors the Map Editor: tap a canal to select it, then
// drag any vertex node to turn/reshape it. Mid-segment "+" nodes insert new
// vertices so the canal can be turned from any point along its length.
export default function CanalEditLayer({ editMode, overlay, objects, onCanalUpdated, onCanalDeleted }) {
  const [selectedId, setSelectedId] = useState(null);
  const transform = overlay?.transform;
  const rotationDeg = overlay?.rotation || 0;

  const canals = useMemo(() => objects.filter(o => o.type === "canal" && o.points?.length >= 2), [objects]);

  const canalLatLngs = useMemo(() => {
    if (!transform) return {};
    const map = {};
    for (const c of canals) {
      map[c.id] = c.points.map(p => {
        const ll = transform.transform(p.x, p.y);
        return [ll.lat, ll.lng];
      });
    }
    return map;
  }, [canals, transform]);

  const [dragPreview, setDragPreview] = useState(null); // { id, points } canvas coords during vertex drag

  // Live drag — canal follows the node in real time; server updated on dragend.
  const handleVertexDrag = useCallback((id, idx, ll) => {
    const c = canals.find(o => o.id === id);
    if (!c) return;
    const cp = inverseTransform(ll.lat, ll.lng, transform, rotationDeg);
    const newPoints = c.points.map((p, i) => i === idx ? { x: cp.x, y: cp.y } : p);
    setDragPreview({ id, points: newPoints });
  }, [canals, transform, rotationDeg]);

  const handleVertexDragEnd = useCallback((id) => {
    setDragPreview(prev => {
      if (prev && prev.id === id) onCanalUpdated && onCanalUpdated(id, prev.points);
      return null;
    });
  }, [onCanalUpdated]);

  const handleAddVertex = useCallback((id, segIdx, midLL) => {
    const c = canals.find(o => o.id === id);
    if (!c) return;
    const cp = inverseTransform(midLL.lat, midLL.lng, transform, rotationDeg);
    const newPoints = [...c.points];
    newPoints.splice(segIdx + 1, 0, { x: cp.x, y: cp.y });
    onCanalUpdated && onCanalUpdated(id, newPoints);
  }, [canals, transform, rotationDeg, onCanalUpdated]);

  const handleDelete = useCallback((id, e) => {
    L.DomEvent.stopPropagation(e);
    onCanalDeleted && onCanalDeleted(id);
    setSelectedId(null);
  }, [onCanalDeleted]);

  if (!transform || !editMode) return null;

  return (
    <>
      <BackgroundClickCapture onBackgroundClick={() => setSelectedId(null)} />
      {canals.map(c => {
        const latlngs = canalLatLngs[c.id];
        if (!latlngs) return null;
        const isSelected = selectedId === c.id;
        const isDragging = dragPreview?.id === c.id;
        const effPoints = isDragging ? dragPreview.points : c.points;
        const effLatLngs = isDragging
          ? effPoints.map(p => { const ll = transform.transform(p.x, p.y); return [ll.lat, ll.lng]; })
          : latlngs;
        return (
          <React.Fragment key={c.id}>
            <Polyline
              positions={effLatLngs}
              pathOptions={{
                color: isSelected ? "#ff0000" : "#f59e0b",
                weight: isSelected ? 6 : 8,
                opacity: isSelected ? 0.9 : 0,
              }}
              eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); setSelectedId(prev => prev === c.id ? null : c.id); } }}
            >
              <Tooltip direction="top" sticky>
                <div className="text-[10px] font-bold whitespace-nowrap text-amber-700">{c.name || "نہر"} — کلک سے ایڈٹ کریں</div>
              </Tooltip>
            </Polyline>
            {isSelected && effPoints.map((p, i) => {
              const ll = transform.transform(p.x, p.y);
              return (
                <Marker
                  key={`cv-${c.id}-${i}`}
                  position={[ll.lat, ll.lng]}
                  icon={vertexIcon(i + 1)}
                  draggable
                  eventHandlers={{
                    drag: (e) => handleVertexDrag(c.id, i, e.target.getLatLng()),
                    dragend: () => handleVertexDragEnd(c.id),
                  }}
                />
              );
            })}
            {isSelected && effPoints.length >= 2 && effPoints.map((p, i) => {
              if (i >= effPoints.length - 1) return null;
              const a = effPoints[i], b = effPoints[i + 1];
              const mid = transform.transform((a.x + b.x) / 2, (a.y + b.y) / 2);
              return (
                <Marker
                  key={`ca-${c.id}-${i}`}
                  position={[mid.lat, mid.lng]}
                  icon={addVertexIcon()}
                  eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); handleAddVertex(c.id, i, { lat: mid.lat, lng: mid.lng }); } }}
                />
              );
            })}
            {isSelected && effLatLngs.length >= 2 && (() => {
              const mid = effLatLngs[Math.floor(effLatLngs.length / 2)];
              return (
                <Marker
                  position={mid}
                  icon={deleteIcon()}
                  eventHandlers={{ click: (e) => handleDelete(c.id, e) }}
                />
              );
            })()}
          </React.Fragment>
        );
      })}
    </>
  );
}