import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMapEvents, Polygon, Polyline, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import {
  buildGridPoints,
  snapToGrid,
  patchArea,
  coveredAcres,
  khasraListFromCovered,
} from "@/lib/patchSnap";

const COLORS = ["#6366f1", "#0ea5e9", "#14b8a6", "#f97316", "#ec4899", "#84cc16", "#a855f7", "#06b6d4"];

function nodeIcon(color) {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px #000;cursor:grab;"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Draw mode: click to add grid-snapped vertices, double-click to close → onDrawComplete.
// Edit mode: click a patch to select; drag its nodes to adjust geometry.
// Saved patches render as filled polygons with a permanent farmer + area label.
export default function PatchDrawLayer({
  drawMode,
  editMode,
  objects,
  overlay,
  selectedMoga,
  patches,
  activePatchId,
  onDrawComplete,
  onSelectPatch,
  onUpdatePatchGeometry,
}) {
  const [points, setPoints] = useState([]);
  const [mouse, setMouse] = useState(null);
  const clickTimer = useRef(null);

  const grid = useMemo(
    () => (overlay?.transform ? buildGridPoints(objects, overlay.transform, selectedMoga) : []),
    [objects, overlay, selectedMoga]
  );

  useEffect(() => {
    if (!drawMode) {
      setPoints([]);
      setMouse(null);
    }
  }, [drawMode]);

  useMapEvents({
    click: (e) => {
      if (!drawMode) return;
      const snapped = snapToGrid(e.latlng, grid);
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => {
        setPoints((prev) => [...prev, snapped]);
        clickTimer.current = null;
      }, 220);
    },
    dblclick: () => {
      if (!drawMode) return;
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      setPoints((prev) => {
        if (prev.length >= 3 && overlay?.transform) {
          const area = patchArea(prev);
          const covered = coveredAcres(prev, objects, overlay.transform, selectedMoga);
          const khasra = khasraListFromCovered(covered);
          onDrawComplete(prev, area, khasra);
        }
        return [];
      });
    },
    mousemove: (e) => {
      if (drawMode) setMouse(e.latlng);
    },
  });

  // In-progress preview
  let preview = null;
  if (drawMode && points.length > 0) {
    const snapMouse = mouse ? snapToGrid(mouse, grid) : null;
    const linePts = snapMouse ? [...points, snapMouse] : points;
    preview = (
      <>
        <Polyline
          positions={linePts.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#6366f1", weight: 3, dashArray: "6,4" }}
        />
        {points.length >= 3 && (
          <Polygon
            positions={linePts.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.15, dashArray: "6,4" }}
          />
        )}
      </>
    );
  }

  const patchPolys = patches.map((p, i) => {
    const color = COLORS[i % COLORS.length];
    const isActive = editMode && activePatchId === p.id;
    const latlngs = p.geometry || [];
    if (!latlngs.length) return null;
    const label = `${p.farmer_name || "—"} · ${(p.acres || 0).toFixed(2)} ac / ${p.kanal || 0} K`;
    return (
      <React.Fragment key={p.id}>
        <Polygon
          positions={latlngs.map((pt) => [pt.lat, pt.lng])}
          pathOptions={{
            color: isActive ? "#facc15" : color,
            fillColor: color,
            fillOpacity: isActive ? 0.5 : 0.25,
            weight: isActive ? 4 : 2,
            interactive: editMode,
          }}
          eventHandlers={editMode ? { click: (e) => { L.DomEvent.stopPropagation(e); onSelectPatch(p.id); } } : {}}
        >
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
              {label}
            </span>
          </Tooltip>
        </Polygon>
        {isActive &&
          latlngs.map((pt, idx) => (
            <Marker
              key={idx}
              position={[pt.lat, pt.lng]}
              icon={nodeIcon(color)}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const np = e.target.getLatLng();
                  const next = latlngs.map((q, j) => (j === idx ? { lat: np.lat, lng: np.lng } : q));
                  onUpdatePatchGeometry(p.id, next);
                },
              }}
            />
          ))}
      </React.Fragment>
    );
  });

  return (
    <>
      {preview}
      {patchPolys}
    </>
  );
}