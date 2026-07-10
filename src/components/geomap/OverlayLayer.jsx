import React, { useMemo, memo } from "react";
import { Polygon, Polyline, Tooltip, CircleMarker } from "react-leaflet";
import { getMustateeelKillaGrid } from "@/lib/gisEngine";
import { canvasRectToLatLngs, canvasPolylineToLatLngs, polygonAreaSqMeters, sqMetersToUnits } from "@/lib/geoOverlay";

function labelFontSize(zoom) {
  return Math.max(8, Math.min(16, 9 + (zoom - 14) * 1.2));
}

// Killa label as a CircleMarker with permanent tooltip
function KillaLabel({ num, latlng, zoom }) {
  if (zoom < 17) return null;
  return (
    <CircleMarker
      center={latlng}
      radius={0}
      pathOptions={{ opacity: 0, fillOpacity: 0 }}
    >
      <Tooltip permanent direction="center" opacity={0.65} className="killa-label">
        <span style={{ fontSize: `${Math.max(7, labelFontSize(zoom) * 0.55)}px`, fontWeight: 600, color: "#991b1b" }}>{num}</span>
      </Tooltip>
    </CircleMarker>
  );
}

function MustateelLabel({ obj, latlngs, zoom, showKilla, killaLatLngs }) {
  const acres = useMemo(() => sqMetersToUnits(polygonAreaSqMeters(latlngs)).acres, [latlngs]);
  const fontSize = labelFontSize(zoom);

  return (
    <>
      <Polygon
        positions={latlngs.map(p => [p.lat, p.lng])}
        pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.12, weight: 2 }}
      >
        <Tooltip permanent direction="center" className="mustateel-label" opacity={1}>
          <div style={{ fontSize: `${fontSize}px`, fontWeight: 700, color: "#dc2626", textAlign: "center", lineHeight: 1.15, whiteSpace: "nowrap" }}>
            {obj.label && <div>{obj.label}</div>}
            <div style={{ fontSize: `${fontSize * 0.78}px`, color: "#7f1d1d" }}>{acres.toFixed(2)} ac</div>
            {obj.mogaNumber && (
              <div style={{ fontSize: `${fontSize * 0.68}px`, color: "#2563eb", fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
                موگہ {obj.mogaNumber}{obj.mogha_side ? `/${obj.mogha_side}` : ""}
              </div>
            )}
          </div>
        </Tooltip>
      </Polygon>
      {showKilla && killaLatLngs && zoom >= 17 && killaLatLngs.map((k, i) => (
        <KillaLabel key={i} num={k.num} latlng={k.latlng} zoom={zoom} />
      ))}
    </>
  );
}

function MurabaLabel({ obj, latlngs, zoom }) {
  const acres = useMemo(() => sqMetersToUnits(polygonAreaSqMeters(latlngs)).acres, [latlngs]);
  const fontSize = labelFontSize(zoom);
  return (
    <Polygon
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.08, weight: 2 }}
    >
      <Tooltip permanent direction="center" className="muraba-label" opacity={1}>
        <div style={{ fontSize: `${fontSize}px`, fontWeight: 700, color: "#c2410c", textAlign: "center", lineHeight: 1.15 }}>
          {obj.label && <div>{obj.label}</div>}
          <div style={{ fontSize: `${fontSize * 0.78}px`, color: "#9a3412" }}>{acres.toFixed(2)} ac</div>
        </div>
      </Tooltip>
    </Polygon>
  );
}

function AcreLabel({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polygon
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#eab308", fillColor: "#eab308", fillOpacity: 0.06, weight: 1 }}
    >
      {obj.label && (
        <Tooltip permanent direction="center" className="acre-label" opacity={0.85}>
          <span style={{ fontSize: `${fontSize * 0.65}px`, fontWeight: 600, color: "#854d0e" }}>{obj.label}</span>
        </Tooltip>
      )}
    </Polygon>
  );
}

function CanalLine({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#0284c7", weight: Math.max(2, 4 - (18 - zoom) * 0.3), opacity: 0.9 }}
    >
      {obj.name && (
        <Tooltip permanent direction="center" className="canal-label" opacity={0.95}>
          <span style={{ fontSize: `${fontSize * 0.68}px`, fontWeight: 600, color: "#0369a1", backgroundColor: "rgba(255,255,255,0.85)", padding: "0 3px", borderRadius: 2 }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </Polyline>
  );
}

function KhalLine({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#2563eb", weight: Math.max(1, 3 - (18 - zoom) * 0.2), opacity: 0.85 }}
    >
      {obj.name && (
        <Tooltip permanent direction="center" className="khal-label" opacity={0.9}>
          <span style={{ fontSize: `${fontSize * 0.58}px`, color: "#1d4ed8", backgroundColor: "rgba(255,255,255,0.7)", padding: "0 2px" }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </Polyline>
  );
}

function RoadLine({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#b45309", weight: Math.max(2, 4 - (18 - zoom) * 0.3), dashArray: "10,6", opacity: 0.8 }}
    >
      {obj.name && (
        <Tooltip permanent direction="center" className="road-label" opacity={0.9}>
          <span style={{ fontSize: `${fontSize * 0.58}px`, color: "#92400e", backgroundColor: "rgba(255,255,255,0.7)", padding: "0 2px" }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </Polyline>
  );
}

function ChakbandiLine({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#22c55e", weight: 2, dashArray: "8,4", opacity: 0.85 }}
    >
      {obj.name && (
        <Tooltip permanent direction="top" className="chakbandi-label" opacity={0.9}>
          <span style={{ fontSize: `${fontSize * 0.6}px`, fontWeight: 600, color: "#15803d" }}>{obj.name}</span>
        </Tooltip>
      )}
    </Polyline>
  );
}

function OutletMarker({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  if (!latlngs || latlngs.length < 2) return null;
  return (
    <>
      <Polyline
        positions={latlngs.map(p => [p.lat, p.lng])}
        pathOptions={{ color: "#06b6d4", weight: Math.max(2, 4 - (18 - zoom) * 0.25), opacity: 0.9 }}
      />
      <CircleMarker
        center={[latlngs[0].lat, latlngs[0].lng]}
        radius={Math.max(3, 5 - (18 - zoom) * 0.3)}
        pathOptions={{ color: "#0e7490", fillColor: "#06b6d4", fillOpacity: 0.9, weight: 2 }}
      >
        <Tooltip permanent direction="top" className="moga-label" opacity={0.95}>
          <span style={{ fontSize: `${fontSize * 0.62}px`, fontWeight: 700, color: "#0e7490", backgroundColor: "rgba(255,255,255,0.92)", padding: "1px 4px", borderRadius: 2, fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
            موگہ {obj.mogha_number || ""}{obj.mogha_side ? `/${obj.mogha_side}` : ""}
          </span>
        </Tooltip>
      </CircleMarker>
    </>
  );
}

function MouzaLine({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#000000", weight: 1.5, dashArray: "12,8", opacity: 0.7 }}
    >
      {obj.name && (
        <Tooltip permanent direction="top" className="mouza-label" opacity={0.85}>
          <span style={{ fontSize: `${fontSize * 0.62}px`, fontWeight: 700, color: "#000", backgroundColor: "rgba(255,255,255,0.8)", padding: "0 3px" }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </Polyline>
  );
}

const MemoMustateel = memo(MustateelLabel);
const MemoMuraba = memo(MurabaLabel);
const MemoAcre = memo(AcreLabel);
const MemoCanal = memo(CanalLine);
const MemoKhal = memo(KhalLine);
const MemoRoad = memo(RoadLine);
const MemoChakbandi = memo(ChakbandiLine);
const MemoMouza = memo(MouzaLine);
const MemoOutlet = memo(OutletMarker);

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "canal", "khal", "chakbandi", "outlet"];

// Precompute killa center lat/lng for mustateels
function computeKillaLatLngs(obj, transform) {
  const grid = getMustateeelKillaGrid();
  const cellW = obj.w / 2, cellH = obj.h / 5;
  const result = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 2; c++) {
      const cx = obj.x + c * cellW + cellW / 2;
      const cy = obj.y + r * cellH + cellH / 2;
      result.push({ num: grid[r][c], latlng: [transform.transform(cx, cy).lat, transform.transform(cx, cy).lng] });
    }
  }
  return result;
}

export default function OverlayLayer({ objects, transform, zoom, killaVisible, mogaFilter }) {
  const geoObjects = useMemo(() => {
    if (!transform || !objects.length) return [];
    const filtered = mogaFilter
      ? objects.filter(o => {
          if (o.type === "chakbandi") return o.mogaNumber === mogaFilter;
          if (o.type === "mustateel") return o.mogaNumber === mogaFilter || !o.mogaNumber;
          return true;
        })
      : objects;
    const sorted = [...filtered].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));
    return sorted.map(obj => {
      let latlngs, killaLatLngs = null;
      if (["mustateel", "muraba", "acre"].includes(obj.type)) {
        latlngs = canvasRectToLatLngs(obj, transform);
        if (obj.type === "mustateel" && killaVisible) {
          killaLatLngs = computeKillaLatLngs(obj, transform);
        }
      } else if (obj.start && obj.end) {
        latlngs = [transform.transform(obj.start.x, obj.start.y), transform.transform(obj.end.x, obj.end.y)];
      } else if (obj.points?.length >= 2) {
        latlngs = canvasPolylineToLatLngs(obj, transform);
      } else return null;
      return { obj, latlngs, killaLatLngs };
    }).filter(Boolean);
  }, [objects, transform, mogaFilter, killaVisible]);

  return (
    <>
      {geoObjects.map(({ obj, latlngs, killaLatLngs }) => {
        switch (obj.type) {
          case "mustateel": return <MemoMustateel key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} showKilla={killaVisible} killaLatLngs={killaLatLngs} />;
          case "muraba": return <MemoMuraba key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "acre": return <MemoAcre key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "canal": return <MemoCanal key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "khal": return <MemoKhal key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "road": return <MemoRoad key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "chakbandi": return <MemoChakbandi key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "mouza": return <MemoMouza key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "outlet": return <MemoOutlet key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          default: return null;
        }
      })}
    </>
  );
}