import React, { useMemo, memo } from "react";
import { Polygon, Polyline, Tooltip, CircleMarker, Marker } from "react-leaflet";
import L from "leaflet";
import { DIMENSIONS, getMustateeelKillaGrid, getMurabaKillaGrid } from "@/lib/gisEngine";
import { canvasRectToLatLngs, canvasPolylineToLatLngs, polygonAreaSqMeters, sqMetersToUnits } from "@/lib/geoOverlay";

// Font sizes scale with zoom level
function labelFontSize(zoom) {
  return Math.max(8, Math.min(16, 9 + (zoom - 14) * 1.2));
}

// Mustateel label: number + acres + moga info
function MustateelLabel({ obj, latlngs, zoom, showKilla }) {
  const center = useMemo(() => {
    const lat = latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length;
    const lng = latlngs.reduce((s, p) => s + p.lng, 0) / latlngs.length;
    return [lat, lng];
  }, [latlngs]);

  const acres = useMemo(() => sqMetersToUnits(polygonAreaSqMeters(latlngs)).acres, [latlngs]);
  const fontSize = labelFontSize(zoom);
  const killaGrid = getMustateeelKillaGrid();
  const cellW = obj.w / 2, cellH = obj.h / 5;

  // Killa positions (in lat/lng) — only show at high zoom
  const killaLabels = useMemo(() => {
    if (!showKilla || zoom < 17) return [];
    const labels = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 2; c++) {
        const cx = obj.x + c * cellW + cellW / 2;
        const cy = obj.y + r * cellH + cellH / 2;
        labels.push({ num: killaGrid[r][c], cx, cy });
      }
    }
    return labels;
  }, [showKilla, zoom, obj.x, obj.y]);

  return (
    <>
      <Polygon
        positions={latlngs.map(p => [p.lat, p.lng])}
        pathOptions={{
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.15,
          weight: 2,
        }}
      >
        <Tooltip permanent direction="center" className="mustateel-label" opacity={1}>
          <div style={{ fontSize: `${fontSize}px`, fontWeight: 700, color: "#dc2626", textAlign: "center", lineHeight: 1.1 }}>
            {obj.label && <div>{obj.label}</div>}
            <div style={{ fontSize: `${fontSize * 0.8}px`, color: "#7f1d1d" }}>{acres.toFixed(2)} ac</div>
            {obj.mogaNumber && <div style={{ fontSize: `${fontSize * 0.7}px`, color: "#2563eb" }}>Moga {obj.mogaNumber}{obj.mogha_side ? `/${obj.mogha_side}` : ""}</div>}
          </div>
        </Tooltip>
      </Polygon>
      {killaLabels.map((k, i) => (
        <KillaLabel key={i} num={k.num} canvasX={k.cx} canvasY={k.cy} transform={null} zoom={zoom} />
      ))}
    </>
  );
}

// Killa number label at a canvas position (needs transform from parent)
function KillaLabelInternal({ num, latlng, zoom }) {
  if (zoom < 17) return null;
  return (
    <Tooltip position={latlng} permanent direction="center" className="killa-label" opacity={0.7}>
      <span style={{ fontSize: `${Math.max(7, labelFontSize(zoom) * 0.6)}px`, fontWeight: 600, color: "#991b1b" }}>{num}</span>
    </Tooltip>
  );
}

function MurabaLabel({ obj, latlngs, zoom, showKilla }) {
  const acres = useMemo(() => sqMetersToUnits(polygonAreaSqMeters(latlngs)).acres, [latlngs]);
  const fontSize = labelFontSize(zoom);
  return (
    <Polygon
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{
        color: "#f97316",
        fillColor: "#f97316",
        fillOpacity: 0.10,
        weight: 2,
      }}
    >
      <Tooltip permanent direction="center" className="muraba-label" opacity={1}>
        <div style={{ fontSize: `${fontSize}px`, fontWeight: 700, color: "#c2410c", textAlign: "center", lineHeight: 1.1 }}>
          {obj.label && <div>{obj.label}</div>}
          <div style={{ fontSize: `${fontSize * 0.8}px`, color: "#9a3412`" }}>{acres.toFixed(2)} ac</div>
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
      pathOptions={{ color: "#eab308", fillColor: "#eab308", fillOpacity: 0.08, weight: 1 }}
    >
      {obj.label && (
        <Tooltip permanent direction="center" className="acre-label" opacity={0.9}>
          <span style={{ fontSize: `${fontSize * 0.7}px`, fontWeight: 600, color: "#854d0e" }}>{obj.label}</span>
        </Tooltip>
      )}
    </Polygon>
  );
}

function CanalLine({ obj, latlngs, zoom }) {
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#0284c7", weight: Math.max(2, 4 - (18 - zoom) * 0.3), opacity: 0.9 }}
    >
      {obj.name && (
        <Tooltip permanent direction="center" className="canal-label" opacity={0.95}>
          <span style={{ fontSize: `${labelFontSize(zoom) * 0.7}px`, fontWeight: 600, color: "#0369a1", backgroundColor: "rgba(255,255,255,0.8)", padding: "0 3px", borderRadius: 2 }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </Polyline>
  );
}

function KhalLine({ obj, latlngs, zoom }) {
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#2563eb", weight: Math.max(1, 3 - (18 - zoom) * 0.2), opacity: 0.85 }}
    >
      {obj.name && (
        <Tooltip permanent direction="center" className="khal-label" opacity={0.9}>
          <span style={{ fontSize: `${labelFontSize(zoom) * 0.6}px`, color: "#1d4ed8", backgroundColor: "rgba(255,255,255,0.7)", padding: "0 2px" }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </Polyline>
  );
}

function RoadLine({ obj, latlngs, zoom }) {
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#b45309", weight: Math.max(2, 4 - (18 - zoom) * 0.3), dashArray: "10,6", opacity: 0.8 }}
    >
      {obj.name && (
        <Tooltip permanent direction="center" className="road-label" opacity={0.9}>
          <span style={{ fontSize: `${labelFontSize(zoom) * 0.6}px`, color: "#92400e", backgroundColor: "rgba(255,255,255,0.7)", padding: "0 2px" }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </Polyline>
  );
}

function ChakbandiLine({ obj, latlngs, zoom }) {
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#22c55e", weight: 2, dashArray: "8,4", opacity: 0.85 }}
    >
      {obj.name && (
        <Tooltip permanent direction="top" className="chakbandi-label" opacity={0.9}>
          <span style={{ fontSize: `${labelFontSize(zoom) * 0.6}px`, fontWeight: 600, color: "#15803d" }}>{obj.name}</span>
        </Tooltip>
      )}
    </Polyline>
  );
}

function MouzaLine({ obj, latlngs, zoom }) {
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#000000", weight: 1.5, dashArray: "12,8", opacity: 0.7 }}
    >
      {obj.name && (
        <Tooltip permanent direction="top" className="mouza-label" opacity={0.85}>
          <span style={{ fontSize: `${labelFontSize(zoom) * 0.65}px`, fontWeight: 700, color: "#000", backgroundColor: "rgba(255,255,255,0.8)", padding: "0 3px" }}>
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

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "canal", "khal", "chakbandi"];

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
      if (["mustateel", "muraba", "acre"].includes(obj.type)) {
        return { obj, latlngs: canvasRectToLatLngs(obj, transform) };
      }
      if (obj.points?.length >= 2) {
        return { obj, latlngs: canvasPolylineToLatLngs(obj, transform) };
      }
      return null;
    }).filter(Boolean);
  }, [objects, transform, mogaFilter]);

  return (
    <>
      {geoObjects.map(({ obj, latlngs }) => {
        switch (obj.type) {
          case "mustateel": return <MemoMustateel key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} showKilla={killaVisible} />;
          case "muraba": return <MemoMuraba key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} showKilla={killaVisible} />;
          case "acre": return <MemoAcre key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "canal": return <MemoCanal key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "khal": return <MemoKhal key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "road": return <MemoRoad key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "chakbandi": return <MemoChakbandi key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "mouza": return <MemoMouza key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          default: return null;
        }
      })}
    </>
  );
}