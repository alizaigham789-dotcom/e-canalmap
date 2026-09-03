import React, { useMemo } from "react";
import { Polygon, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { getEdgeDummyMustateels } from "@/lib/mogaArrange";

// Plus icon in the center of each dummy mustateel — signals "attach a moga here".
function plusIcon() {
  return L.divIcon({
    html: `<div style="width:38px;height:38px;border:2px dashed #22c55e;border-radius:10px;background:rgba(34,197,94,0.14);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 6px rgba(0,0,0,0.35);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div>`,
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

// Renders editable "dummy" mustateel cells around the boundary of the selected
// moga. Each dummy has no label and a "+" icon; clicking opens the attach dialog
// so the user can type a Khasra number and chain a new moga here.
export default function DummyMustateelLayer({ objects, overlay, selectedMoga, onClick }) {
  const dummies = useMemo(
    () => getEdgeDummyMustateels(objects, selectedMoga),
    [objects, selectedMoga]
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
        return (
          <React.Fragment key={i}>
            <Polygon
              positions={corners.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: "#22c55e",
                fillColor: "#22c55e",
                fillOpacity: 0.10,
                weight: 2,
                dashArray: "8,6",
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onClick(d);
                },
              }}
            >
              <Tooltip direction="center" className="khal-label" opacity={0.95}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#16a34a", backgroundColor: "rgba(255,255,255,0.9)", padding: "1px 6px", borderRadius: 4, fontFamily: "'Noto Nastaliq Urdu', sans-serif", whiteSpace: "nowrap" }}>
                  موگہ جوڑیں
                </span>
              </Tooltip>
            </Polygon>
            <Marker position={[center.lat, center.lng]} icon={plusIcon()} interactive={false} />
          </React.Fragment>
        );
      })}
    </>
  );
}