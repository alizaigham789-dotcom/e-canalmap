import React, { useState, useCallback } from "react";
import { Polyline, CircleMarker, useMapEvents } from "react-leaflet";
import { inverseTransform } from "@/lib/geoOverlay";
import { createOutlet } from "@/lib/gisEngine";

// Draw a Moga (outlet) on the GeoMap — click 1 = start (block), click 2 = end
// (arrow). Then prompts for mogha number + side, creates the outlet and calls
// onMogaDrawn. The outlet is saved into the map's drawing_data so it appears in
// the Map Editor at exactly the same place (and passes through the same
// mustateels), identical to a khal drawn here.
export default function MogaDrawLayer({ drawMode, overlay, objects, onMogaDrawn }) {
  const [startLatLng, setStartLatLng] = useState(null);
  const [mouseLatLng, setMouseLatLng] = useState(null);
  const [pending, setPending] = useState(null); // { startCanvas, endCanvas, startLatLng, endLatLng }
  const [moghaNumber, setMoghaNumber] = useState("");
  const [moghaSide, setMoghaSide] = useState("");
  const transform = overlay?.transform;
  const rotationDeg = overlay?.rotation || 0;

  const handleAddPoint = useCallback((latlng) => {
    if (!transform) return;
    if (!startLatLng) { setStartLatLng(latlng); return; }
    const startCanvas = inverseTransform(startLatLng.lat, startLatLng.lng, transform, rotationDeg);
    const endCanvas = inverseTransform(latlng.lat, latlng.lng, transform, rotationDeg);
    setPending({ startCanvas, endCanvas, startLatLng, endLatLng: latlng });
  }, [startLatLng, transform, rotationDeg]);

  useMapEvents({
    click: (e) => { if (drawMode) handleAddPoint(e.latlng); },
    mousemove: (e) => { if (drawMode) setMouseLatLng(e.latlng); },
  });

  if (!transform) return null;

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