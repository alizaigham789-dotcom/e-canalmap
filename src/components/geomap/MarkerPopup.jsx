import React, { useState, useEffect } from "react";
import { Popup, useMap } from "react-leaflet";
import { Trash2, Palette } from "lucide-react";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#000000"];

export default function MarkerPopup({ marker, onUpdate, onDelete }) {
  const [title, setTitle] = useState(marker.title || "");
  const [color, setColor] = useState(marker.color || "#ef4444");
  const map = useMap();

  useEffect(() => {
    setTitle(marker.title || "");
    setColor(marker.color || "#ef4444");
  }, [marker.id]);

  const handleSave = () => {
    onUpdate(marker.id, { title, color });
  };

  return (
    <Popup>
      <div className="w-44 space-y-2">
        <div className="text-[9px] font-mono text-slate-500 bg-slate-50 rounded px-1.5 py-1 leading-tight">
          <div>Lat: {marker.latlng.lat.toFixed(6)}</div>
          <div>Lng: {marker.latlng.lng.toFixed(6)}</div>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); }}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder="Marker title…"
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setColor(c); onUpdate(marker.id, { color: c }); }}
              className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? "border-slate-700 scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          onClick={() => { map.closePopup(); onDelete(marker.id); }}
          className="w-full flex items-center justify-center gap-1 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete Marker
        </button>
      </div>
    </Popup>
  );
}