import React, { useState, useMemo, useRef, useCallback } from "react";
import { Polyline, Marker, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { inverseTransform } from "@/lib/geoOverlay";
import { createKhal, DIMENSIONS } from "@/lib/gisEngine";

// Vertex icon — small blue draggable circle
function vertexIcon(num) {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;">${num || ""}</div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Delete button icon at khal midpoint
function deleteIcon() {
  return L.divIcon({
    html: `<div style="width:22px;height:22px;background:#dc2626;border:2px solid white;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;color:white;font-weight:bold;">×</div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// Click capture component — adds points to the draft on map click, finishes on dblclick
function ClickCapture({ active, onAddPoint, onFinish }) {
  useMapEvents({
    click: (e) => { if (active) onAddPoint(e.latlng); },
    dblclick: (e) => { if (active) onFinish(); },
  });
  return null;
}

export default function KhalDrawLayer({
  drawMode,
  editMode,
  overlay,
  objects,
  onKhalDrawn,
  onKhalUpdated,
  onKhalDeleted,
}) {
  const [draftPoints, setDraftPoints] = useState([]);
  const [mouseLatLng, setMouseLatLng] = useState(null);
  const [selectedKhalId, setSelectedKhalId] = useState(null);
  const rotationDeg = overlay?.rotation || 0;
  const transform = overlay?.transform;

  // Existing khal objects
  const khals = useMemo(() => objects.filter(o => o.type === "khal"), [objects]);

  // Convert khal canvas points → lat/lng for rendering
  const khalLatLngs = useMemo(() => {
    if (!transform) return {};
    const map = {};
    for (const k of khals) {
      if (k.points?.length >= 2) {
        map[k.id] = k.points.map(p => {
          const ll = transform.transform(p.x, p.y);
          return [ll.lat, ll.lng];
        });
      }
    }
    return map;
  }, [khals, transform]);

  const handleAddPoint = useCallback((latlng) => {
    setDraftPoints(prev => [...prev, latlng]);
  }, []);

  const handleFinish = useCallback(() => {
    if (draftPoints.length < 2) {
      setDraftPoints([]);
      return;
    }
    // Convert lat/lng → canvas coords
    const canvasPts = draftPoints.map(ll => inverseTransform(ll.lat, ll.lng, transform, rotationDeg));
    const khal = createKhal(canvasPts, "");
    onKhalDrawn && onKhalDrawn(khal);
    setDraftPoints([]);
  }, [draftPoints, transform, rotationDeg, onKhalDrawn]);

  // Mouse tracker for draft preview
  function DraftMouseTracker() {
    useMapEvents({
      mousemove: (e) => setMouseLatLng(e.latlng),
    });
    return null;
  }

  // Edit mode: drag a vertex → update khal
  const handleVertexDrag = useCallback((khalId, vertexIdx, newLatLng) => {
    const khal = khals.find(k => k.id === khalId);
    if (!khal) return;
    const canvasPt = inverseTransform(newLatLng.lat, newLatLng.lng, transform, rotationDeg);
    const newPoints = khal.points.map((p, i) => i === vertexIdx ? { x: canvasPt.x, y: canvasPt.y } : p);
    onKhalUpdated && onKhalUpdated(khalId, newPoints);
  }, [khals, transform, rotationDeg, onKhalUpdated]);

  const handleKhalClick = useCallback((khalId, e) => {
    L.DomEvent.stopPropagation(e);
    setSelectedKhalId(prev => prev === khalId ? null : khalId);
  }, []);

  const handleDeleteKhal = useCallback((khalId, e) => {
    L.DomEvent.stopPropagation(e);
    onKhalDeleted && onKhalDeleted(khalId);
    setSelectedKhalId(null);
  }, [onKhalDeleted]);

  // Draft preview polyline
  const draftPreviewPositions = useMemo(() => {
    const pts = [...draftPoints];
    if (mouseLatLng && drawMode) pts.push(mouseLatLng);
    return pts.map(p => [p.lat, p.lng]);
  }, [draftPoints, mouseLatLng, drawMode]);

  if (!transform) return null;

  return (
    <>
      {drawMode && (
        <>
          <DraftMouseTracker />
          <ClickCapture active={drawMode} onAddPoint={handleAddPoint} onFinish={handleFinish} />
          {/* Draft preview */}
          {draftPreviewPositions.length >= 2 && (
            <Polyline positions={draftPreviewPositions} pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6,4", opacity: 0.8 }} />
          )}
          {/* Draft vertex markers */}
          {draftPoints.map((p, i) => (
            <CircleMarker key={`draft-${i}`} center={[p.lat, p.lng]} radius={5} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 1, weight: 2 }} />
          ))}
        </>
      )}

      {/* Edit mode: show all khals as clickable + selected khal's vertices draggable */}
      {editMode && khals.map(khal => {
        const latlngs = khalLatLngs[khal.id];
        if (!latlngs || latlngs.length < 2) return null;
        const isSelected = selectedKhalId === khal.id;
        return (
          <React.Fragment key={khal.id}>
            <Polyline
              positions={latlngs}
              pathOptions={{
                color: isSelected ? "#ff0000" : "#2563eb",
                weight: isSelected ? 5 : 3,
                opacity: 0.9,
              }}
              eventHandlers={{ click: (e) => handleKhalClick(khal.id, e) }}
            />
            {isSelected && khal.points.map((p, i) => {
              const ll = transform.transform(p.x, p.y);
              return (
                <Marker
                  key={`v-${khal.id}-${i}`}
                  position={[ll.lat, ll.lng]}
                  icon={vertexIcon(i + 1)}
                  draggable
                  eventHandlers={{ dragend: (e) => handleVertexDrag(khal.id, i, e.target.getLatLng()) }}
                />
              );
            })}
            {isSelected && latlngs.length >= 2 && (() => {
              const midIdx = Math.floor(latlngs.length / 2);
              const mid = latlngs[midIdx];
              return (
                <Marker
                  position={mid}
                  icon={deleteIcon()}
                  eventHandlers={{ click: (e) => handleDeleteKhal(khal.id, e) }}
                />
              );
            })()}
          </React.Fragment>
        );
      })}
    </>
  );
}