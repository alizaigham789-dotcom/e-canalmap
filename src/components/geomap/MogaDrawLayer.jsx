import React, { useState, useCallback, useMemo } from "react";
import { Polyline, CircleMarker, Marker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { inverseTransform } from "@/lib/geoOverlay";
import { createOutlet } from "@/lib/gisEngine";
import { snapToGrid } from "@/lib/patchSnap";

function vertexIcon(label) {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:#06b6d4;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;">${label || ""}</div>`,
    className: "", iconSize: [18, 18], iconAnchor: [9, 9],
  });
}
function deleteIcon() {
  return L.divIcon({
    html: `<div style="width:24px;height:24px;background:#dc2626;border:2px solid white;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:white;font-weight:bold;">×</div>`,
    className: "", iconSize: [24, 24], iconAnchor: [12, 12],
  });
}

// Draw a Moga (outlet) — click 1 = start (block), click 2 = end (arrow), then
// prompt for mogha number + side. Points snap to the killa grid. In edit mode
// existing mogas are clickable: selecting one shows draggable start/end nodes.
export default function MogaDrawLayer({ drawMode, editMode, overlay, objects, gridPoints, onMogaDrawn, onMogaUpdated, onMogaDeleted }) {
  const [startLatLng, setStartLatLng] = useState(null);
  const [mouseLatLng, setMouseLatLng] = useState(null);
  const [pending, setPending] = useState(null);
  const [moghaNumber, setMoghaNumber] = useState("");
  const [moghaSide, setMoghaSide] = useState("");
  const [selectedMogaId, setSelectedMogaId] = useState(null);
  const transform = overlay?.transform;
  const rotationDeg = overlay?.rotation || 0;

  const mogas = useMemo(() => objects.filter(o => o.type === "outlet"), [objects]);

  const mogaLatLngs = useMemo(() => {
    if (!transform) return {};
    const map = {};
    for (const m of mogas) {
      if (m.start && m.end) {
        const s = transform.transform(m.start.x, m.start.y);
        const e = transform.transform(m.end.x, m.end.y);
        map[m.id] = { start: [s.lat, s.lng], end: [e.lat, e.lng] };
      }
    }
    return map;
  }, [mogas, transform]);

  const snap = useCallback((latlng) => snapToGrid(latlng, gridPoints, 10), [gridPoints]);

  const handleAddPoint = useCallback((latlng) => {
    if (!transform) return;
    const p = snap(latlng);
    if (!startLatLng) { setStartLatLng(p); return; }
    const startCanvas = inverseTransform(startLatLng.lat, startLatLng.lng, transform, rotationDeg);
    const endCanvas = inverseTransform(p.lat, p.lng, transform, rotationDeg);
    setPending({ startCanvas, endCanvas, startLatLng, endLatLng: p });
  }, [transform, rotationDeg, startLatLng, snap]);

  useMapEvents({
    click: (e) => {
      if (drawMode) handleAddPoint(e.latlng);
      else if (editMode) setSelectedMogaId(null); // background tap deselects
    },
    mousemove: (e) => { if (drawMode) setMouseLatLng(e.latlng); },
  });

  const confirm = () => {
    if (!pending) return;
    // Inherit properties from an existing moga (outlet) on this map so the new
    // moga matches the ones already drawn (block size, arrow scale, colour…)
    const ref = (objects || []).find(o => o.type === "outlet");
    const outlet = createOutlet("", pending.startCanvas, pending.endCanvas, "", ref?.canalWidth || 100, moghaNumber.trim(), moghaSide);
    if (ref) { outlet.arrowScale = ref.arrowScale || 1; outlet.blockSize = ref.blockSize || 32; outlet.outletColor = ref.outletColor || "#dc2626"; }
    onMogaDrawn && onMogaDrawn(outlet);
    setPending(null); setStartLatLng(null); setMoghaNumber(""); setMoghaSide("");
  };
  const cancel = () => { setPending(null); setStartLatLng(null); };

  const handleVertexDrag = useCallback((mogaId, which, newLatLng) => {
    const m = mogas.find(o => o.id === mogaId);
    if (!m) return;
    const canvasPt = inverseTransform(newLatLng.lat, newLatLng.lng, transform, rotationDeg);
    const newStart = which === "start" ? canvasPt : m.start;
    const newEnd = which === "end" ? canvasPt : m.end;
    onMogaUpdated && onMogaUpdated(mogaId, newStart, newEnd);
  }, [mogas, transform, rotationDeg, onMogaUpdated]);

  const handleMogaClick = useCallback((mogaId, e) => {
    L.DomEvent.stopPropagation(e);
    setSelectedMogaId(prev => prev === mogaId ? null : mogaId);
  }, []);

  const handleDeleteMoga = useCallback((mogaId, e) => {
    L.DomEvent.stopPropagation(e);
    onMogaDeleted && onMogaDeleted(mogaId);
    setSelectedMogaId(null);
  }, [onMogaDeleted]);

  if (!transform) return null;

  const draftEnd = pending ? pending.endLatLng : mouseLatLng;
  const showDraft = drawMode && startLatLng && draftEnd && !pending;

  return (
    <>
      {showDraft && (
        <>
          <Polyline positions={[[startLatLng.lat, startLatLng.lng], [draftEnd.lat, draftEnd.lng]]} pathOptions={{ color: "#06b6d4", weight: 3, dashArray: "6,4", opacity: 0.9 }} />
          <CircleMarker center={[startLatLng.lat, startLatLng.lng]} radius={6} pathOptions={{ color: "#06b6d4", fillColor: "#06b6d4", fillOpacity: 1, weight: 2 }} />
        </>
      )}

      {/* Existing mogas — clickable + editable (nodes) when selected in edit mode */}
      {editMode && mogas.map(m => {
        const ll = mogaLatLngs[m.id];
        if (!ll) return null;
        const isSelected = selectedMogaId === m.id;
        return (
          <React.Fragment key={m.id}>
            <Polyline
              positions={[ll.start, ll.end]}
              pathOptions={{ color: isSelected ? "#ff0000" : "#06b6d4", weight: isSelected ? 6 : 4, opacity: 0.9 }}
              eventHandlers={{ click: (e) => handleMogaClick(m.id, e) }}
            >
              <Tooltip direction="top" sticky>
                <div className="text-[10px] font-bold whitespace-nowrap text-cyan-700">موگہ — کلک سے ایڈٹ کریں</div>
              </Tooltip>
            </Polyline>
            {isSelected && (
              <>
                <Marker position={ll.start} icon={vertexIcon("S")} draggable eventHandlers={{ dragend: (e) => handleVertexDrag(m.id, "start", e.target.getLatLng()) }} />
                <Marker position={ll.end} icon={vertexIcon("E")} draggable eventHandlers={{ dragend: (e) => handleVertexDrag(m.id, "end", e.target.getLatLng()) }} />
                <Marker position={[(ll.start[0] + ll.end[0]) / 2, (ll.start[1] + ll.end[1]) / 2]} icon={deleteIcon()} eventHandlers={{ click: (e) => handleDeleteMoga(m.id, e) }} />
              </>
            )}
          </React.Fragment>
        );
      })}

      {pending && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1100] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-[260px]">
          <p className="text-sm font-bold text-slate-800 mb-2">موگہ تفصیل</p>
          <input value={moghaNumber} onChange={(e) => setMoghaNumber(e.target.value)} placeholder="موگہ نمبری" className="w-full h-9 rounded-md border border-slate-300 px-2 text-sm mb-2" autoFocus />
          <div className="flex gap-2 mb-3">
            <button onClick={() => setMoghaSide("L")} className={`flex-1 h-9 rounded-md text-xs font-bold ${moghaSide === "L" ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600"}`}>L</button>
            <button onClick={() => setMoghaSide("R")} className={`flex-1 h-9 rounded-md text-xs font-bold ${moghaSide === "R" ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600"}`}>R</button>
          </div>
          <div className="flex gap-2">
            <button onClick={confirm} className="flex-1 h-9 rounded-md bg-cyan-600 text-white text-xs font-bold">محفوظ کریں</button>
            <button onClick={cancel} className="flex-1 h-9 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">منسوخ</button>
          </div>
        </div>
      )}
    </>
  );
}