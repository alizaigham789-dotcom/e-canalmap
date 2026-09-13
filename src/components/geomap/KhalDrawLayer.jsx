import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Polyline, Marker, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { inverseTransform } from "@/lib/geoOverlay";
import { createKhal, DIMENSIONS } from "@/lib/gisEngine";

// Vertex icon — small blue draggable circle
function vertexIcon(num) {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;">${num || ""}</div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// Delete button icon at khal midpoint
function deleteIcon() {
  return L.divIcon({
    html: `<div style="width:24px;height:24px;background:#dc2626;border:2px solid white;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:white;font-weight:bold;">×</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Add-vertex icon (mid-segment) — tap to insert a new draggable vertex there
function addVertexIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:#16a34a;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:bold;line-height:1;">+</div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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

// Background click capture — deselects the active khal when you tap empty map area
function BackgroundClickCapture({ active, onBackgroundClick }) {
  useMapEvents({
    click: (e) => { if (active) onBackgroundClick(e.latlng); },
  });
  return null;
}

export default function KhalDrawLayer({
  drawMode,
  editMode,
  overlay,
  objects,
  khalType = "approved",
  onKhalDrawn,
  onKhalUpdated,
  onKhalDeleted,
}) {
  const [draftPoints, setDraftPoints] = useState([]);
  const [mouseLatLng, setMouseLatLng] = useState(null);
  const [selectedKhalId, setSelectedKhalId] = useState(null);
  const [longPressSel, setLongPressSel] = useState(false); // selected via long-press/dblclick
  const rotationDeg = overlay?.rotation || 0;
  const transform = overlay?.transform;
  const longPressTimer = useRef(null);

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
    const khal = createKhal(canvasPts, "", khalType);
    // Inherit width / fill from an existing khal on this map so new khals match
    const ref = khals.find(k => k.width);
    if (ref) { khal.width = ref.width; if (ref.fillColor) khal.fillColor = ref.fillColor; }
    onKhalDrawn && onKhalDrawn(khal);
    setDraftPoints([]);
  }, [draftPoints, transform, rotationDeg, onKhalDrawn, khals]);

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

  // Insert a new vertex at the given segment midpoint (canvas coords)
  const handleAddVertex = useCallback((khalId, segIdx, latlng) => {
    const khal = khals.find(k => k.id === khalId);
    if (!khal) return;
    const canvasPt = inverseTransform(latlng.lat, latlng.lng, transform, rotationDeg);
    const newPoints = [...khal.points];
    newPoints.splice(segIdx + 1, 0, { x: canvasPt.x, y: canvasPt.y });
    onKhalUpdated && onKhalUpdated(khalId, newPoints);
  }, [khals, transform, rotationDeg, onKhalUpdated]);

  const handleKhalClick = useCallback((khalId, e) => {
    L.DomEvent.stopPropagation(e);
    setSelectedKhalId(prev => prev === khalId ? null : khalId);
    setLongPressSel(false);
  }, []);

  // Long-press / double-click → select khal and show edit nodes (works in ANY mode)
  const handleKhalSelectInline = useCallback((khalId, e) => {
    if (e) L.DomEvent.stopPropagation(e);
    setSelectedKhalId(khalId);
    setLongPressSel(true);
  }, []);

  // Long-press detection on a khal polyline (touch + mouse)
  const startLongPress = useCallback((khalId) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setSelectedKhalId(khalId);
      setLongPressSel(true);
    }, 500);
  }, []);
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  useEffect(() => () => cancelLongPress(), []);

  const handleDeleteKhal = useCallback((khalId, e) => {
    L.DomEvent.stopPropagation(e);
    onKhalDeleted && onKhalDeleted(khalId);
    setSelectedKhalId(null);
    setLongPressSel(false);
  }, [onKhalDeleted]);

  // Deselect on background click (when not drawing)
  const handleBackgroundClick = useCallback(() => {
    if (drawMode) return;
    setSelectedKhalId(null);
    setLongPressSel(false);
  }, [drawMode]);

  // Draft preview polyline
  const draftPreviewPositions = useMemo(() => {
    const pts = [...draftPoints];
    if (mouseLatLng && drawMode) pts.push(mouseLatLng);
    return pts.map(p => [p.lat, p.lng]);
  }, [draftPoints, mouseLatLng, drawMode]);

  if (!transform) return null;

  // A khal is editable (shows nodes) if:
  //  - editMode is on AND it's the selected one, OR
  //  - it was selected via long-press / dblclick (longPressSel)
  const isKhalEditable = (khalId) => {
    if (longPressSel && selectedKhalId === khalId) return true;
    if (editMode && selectedKhalId === khalId) return true;
    return false;
  };

  return (
    <>
      {/* Background click deselects — active whenever we're NOT drawing */}
      {!drawMode && (
        <BackgroundClickCapture active onBackgroundClick={handleBackgroundClick} />
      )}

      {drawMode && (
        <>
          <DraftMouseTracker />
          <ClickCapture active={drawMode} onAddPoint={handleAddPoint} onFinish={handleFinish} />
          {/* Draft preview */}
          {draftPreviewPositions.length >= 2 && (
            <Polyline positions={draftPreviewPositions} pathOptions={{ color: khalType === "informal" ? "#0891b2" : "#2563eb", weight: 3, dashArray: khalType === "informal" ? "8,6" : "6,4", opacity: 0.8 }} />
          )}
          {/* Draft vertex markers */}
          {draftPoints.map((p, i) => (
            <CircleMarker key={`draft-${i}`} center={[p.lat, p.lng]} radius={5} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 1, weight: 2 }} />
          ))}
        </>
      )}

      {/* Always render existing khals — clickable, and editable when selected */}
      {khals.map(khal => {
        const latlngs = khalLatLngs[khal.id];
        if (!latlngs || latlngs.length < 2) return null;
        const isSelected = isKhalEditable(khal.id);
        const isInformal = khal.khalType === "informal";
        const baseColor = isInformal ? "#0891b2" : "#2563eb";
        return (
          <React.Fragment key={khal.id}>
            <Polyline
              positions={latlngs}
              pathOptions={{
                color: isSelected ? "#ff0000" : baseColor,
                weight: isSelected ? 6 : 4,
                opacity: 0.9,
                dashArray: isInformal ? "8,6" : undefined,
              }}
              eventHandlers={{
                click: (e) => handleKhalClick(khal.id, e),
                dblclick: (e) => handleKhalSelectInline(khal.id, e),
                mousedown: () => startLongPress(khal.id),
                mouseup: cancelLongPress,
                mouseout: cancelLongPress,
                touchstart: () => startLongPress(khal.id),
                touchend: cancelLongPress,
                touchmove: cancelLongPress,
              }}
            >
              {!drawMode && (
                <Tooltip direction="top" sticky>
                  <div className={`text-[10px] font-bold whitespace-nowrap ${isInformal ? "text-cyan-700" : "text-blue-700"}`}>
                    {isInformal ? "خال (زمیندار — غیر رسمی) — ڈبل کلک / لانگ پریس سے ایڈٹ کریں" : "خال — ڈبل کلک / لانگ پریس سے ایڈٹ کریں"}
                  </div>
                </Tooltip>
              )}
            </Polyline>
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
            {/* Mid-segment "+" markers to insert new vertices */}
            {isSelected && khal.points.length >= 2 && khal.points.map((p, i) => {
              if (i >= khal.points.length - 1) return null;
              const a = khal.points[i], b = khal.points[i + 1];
              const midCanvas = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
              const midLL = transform.transform(midCanvas.x, midCanvas.y);
              return (
                <Marker
                  key={`add-${khal.id}-${i}`}
                  position={[midLL.lat, midLL.lng]}
                  icon={addVertexIcon()}
                  eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); handleAddVertex(khal.id, i, e.latlng || { lat: midLL.lat, lng: midLL.lng }); } }}
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