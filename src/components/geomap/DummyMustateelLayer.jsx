import React, { useMemo } from "react";
import { Polygon, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { getEdgeDummyMustateels } from "@/lib/mogaArrange";

// Suggested next Khasra number for a dummy — based on the adjacent
// mustateel's label and which side the dummy sits on.
function nextNumber(srcLabel, side) {
  const n = parseInt(srcLabel, 10);
  if (isNaN(n)) return null;
  // Mustateel numbering usually runs left→right, then wraps. A dummy on
  // the right or bottom continues forward (+1); left or top goes back (-1).
  if (side === "right" || side === "bottom") return n + 1;
  return n - 1;
}

// Yellow plus icon in the center of each dummy mustateel — signals "attach a moga here".
function plusIcon(num) {
  const badge = num != null
    ? `<div style="position:absolute;top:-10px;right:-10px;min-width:22px;height:22px;background:#eab308;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#1a1a1a;box-shadow:0 1px 4px rgba(0,0,0,0.4);padding:0 4px;">${num}</div>`
    : "";
  return L.divIcon({
    html: `<div style="position:relative;width:44px;height:44px;border:3px dashed #eab308;border-radius:10px;background:rgba(234,179,8,0.22);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(234,179,8,0.5);">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a16207" stroke-width="3.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      ${badge}
    </div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// Renders full-size yellow "dummy" mustateel cells around the boundary of the
// selected moga. Each dummy is one mustateel-sized rectangle sitting adjacent
// to an edge mustateel, with a "+" icon and the suggested next Khasra number.
// Clicking opens the attach dialog so the user can chain a new moga here.
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
        const num = nextNumber(d.srcLabel, d.side);
        return (
          <React.Fragment key={i}>
            <Polygon
              positions={corners.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: "#eab308",
                fillColor: "#facc15",
                fillOpacity: 0.28,
                weight: 3,
                dashArray: "10,6",
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onClick(d);
                },
              }}
            >
              <Tooltip permanent direction="center" className="khal-label" opacity={1}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#854d0e", backgroundColor: "rgba(255,255,255,0.95)", padding: "2px 8px", borderRadius: 4, fontFamily: "'Noto Nastaliq Urdu', sans-serif", whiteSpace: "nowrap", border: "1px solid #eab308" }}>
                  {num != null ? `کہسڑا ${num}` : "موگہ جوڑیں"}
                </span>
              </Tooltip>
            </Polygon>
            <Marker position={[center.lat, center.lng]} icon={plusIcon(num)} interactive={false} />
          </React.Fragment>
        );
      })}
    </>
  );
}