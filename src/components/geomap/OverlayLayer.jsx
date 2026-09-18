import React, { useMemo, memo } from "react";
import { Polygon, Polyline, Tooltip, CircleMarker, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { getMustateelKillaCells, getMurabaKillaCells, DIMENSIONS, canalNameFont } from "@/lib/gisEngine";
import { canvasRectToLatLngs, canvasPolylineToLatLngs, computeCcaCenter } from "@/lib/geoOverlay";

function labelFontSize(zoom) {
  return Math.max(8, Math.min(16, 9 + (zoom - 14) * 1.2));
}

// ─── KILLA GRID LINES for mustateel ──────────────────────────────
// Draws the internal subdivision lines (2 cols × 5 rows) — RED, enhanced visibility.
function KillaGridLines({ obj, transform, zoom, forceVisible }) {
  if (zoom < 15 && !forceVisible) return null;
  const lines = [];
  const { x, y, w, h } = obj;
  // Mustateel = 2 cols × 5 rows, Muraba = 5 cols × 5 rows (25 acres)
  const cols = obj.type === "muraba" ? 5 : 2;
  const cellW = w / cols, cellH = h / 5;
  // Vertical lines between columns
  for (let c = 1; c < cols; c++) {
    const vTop = transform.transform(x + c * cellW, y);
    const vBot = transform.transform(x + c * cellW, y + h);
    lines.push([[vTop.lat, vTop.lng], [vBot.lat, vBot.lng]]);
  }
  // 4 horizontal lines (between 5 rows)
  for (let r = 1; r < 5; r++) {
    const hL = transform.transform(x, y + r * cellH);
    const hR = transform.transform(x + w, y + r * cellH);
    lines.push([[hL.lat, hL.lng], [hR.lat, hR.lng]]);
  }
  // Outer mustateel/muraba boundary drawn as yellow grid lines so the boundary itself is gridded
  const bTL = transform.transform(x, y);
  const bTR = transform.transform(x + w, y);
  const bBR = transform.transform(x + w, y + h);
  const bBL = transform.transform(x, y + h);
  lines.push([[bTL.lat, bTL.lng], [bTR.lat, bTR.lng]]);
  lines.push([[bTR.lat, bTR.lng], [bBR.lat, bBR.lng]]);
  lines.push([[bBR.lat, bBR.lng], [bBL.lat, bBL.lng]]);
  lines.push([[bBL.lat, bBL.lng], [bTL.lat, bTL.lng]]);
  return lines.map((pts, i) => (
    <Polyline key={i} positions={pts} pathOptions={{ color: "#facc15", weight: 2.5, opacity: 0.9, interactive: false }} />
  ));
}

// Killa label as a CircleMarker with permanent tooltip
function KillaLabel({ num, latlng, zoom }) {
  const size = Math.max(10, Math.min(24, 10 + (zoom - 15) * 2));
  return (
    <CircleMarker
      center={latlng}
      radius={0}
      pathOptions={{ opacity: 0, fillOpacity: 0, interactive: false }}
    >
      <Tooltip permanent direction="center" opacity={1} className="killa-label">
        <span style={{ fontSize: `${size}px`, fontWeight: 800, color: "#fde047", textShadow: "0 0 3px #000, 1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000, 0 0 8px rgba(253,224,71,0.85)" }}>{num}</span>
      </Tooltip>
    </CircleMarker>
  );
}

function MustateelLabel({ obj, latlngs, zoom, showKilla, killaLatLngs, transform, isActive, gridAll, onClick, interactive = true }) {
  const map = useMap();
  const boundaryThickness = obj.boundaryThickness || 5;
  const lineWeight = Math.max(3, boundaryThickness * 1.2);

  // Auto-fit font size to the mustateel's rendered pixel dimensions so the
  // number always stays INSIDE the boundary and shrinks naturally on zoom out
  // (never oversized). Progressively shows as the polygon becomes big enough.
  const { numSize, showLabel } = useMemo(() => {
    const px = latlngs.map(p => map.latLngToLayerPoint([p.lat, p.lng]));
    const xs = px.map(p => p.x), ys = px.map(p => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const minDim = Math.min(w, h);
    // Only show the label once the polygon is at least ~34px on screen
    if (minDim < 34) return { numSize: 0, showLabel: false };
    // Mustateel number: ~30% of smaller dimension, capped 8–30px (halved)
    return { numSize: Math.max(8, Math.min(30, minDim * 0.3)), showLabel: true };
  }, [latlngs, map, zoom]);

  return (
    <>
      <Polygon
        positions={latlngs.map(p => [p.lat, p.lng])}
        pathOptions={{
          color: isActive ? "#ff0000" : "#dc2626",
          fillColor: isActive ? "#ef4444" : "#dc2626",
          fillOpacity: isActive ? 0.18 : 0.08,
          weight: isActive ? lineWeight + 1.5 : lineWeight,
          opacity: 1,
          interactive: interactive,
        }}
        eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onClick && onClick(obj.id); } }}
      >
        {showLabel && (
          <Tooltip permanent direction="center" className="mustateel-label" opacity={1}>
            <div style={{ fontSize: `${numSize}px`, fontWeight: 800, color: "#dc2626", textAlign: "center", lineHeight: 1.1, whiteSpace: "nowrap", textShadow: "0 0 3px #fff, 0 0 3px #fff" }}>
              {obj.label && <div>{obj.label}</div>}
              {obj.mogaNumber && (
                <div style={{ fontSize: `${Math.max(7, numSize * 0.45)}px`, color: "#2563eb", fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
                  موگہ {obj.mogaNumber}{obj.mogha_side ? `/${obj.mogha_side}` : ""}
                </div>
              )}
            </div>
          </Tooltip>
        )}
      </Polygon>
      {/* Killa grid lines — clicked/active mustateel, or all parcels in cell-allocation mode */}
      {showKilla && (isActive || gridAll) && <KillaGridLines obj={obj} transform={transform} zoom={zoom} forceVisible={gridAll || isActive} />}
      {/* Killa (acre) numbers — inside each grid cell of the clicked mustateel */}
      {showKilla && isActive && killaLatLngs?.map((k) => <KillaLabel key={k.num} num={k.num} latlng={k.latlng} zoom={zoom} />)}
    </>
  );
}

function MurabaLabel({ obj, latlngs, zoom, showKilla, killaLatLngs, transform, isActive, gridAll, onClick, interactive = true }) {
  const map = useMap();
  // Bold boundary — same treatment as mustateel (boundaryThickness-driven weight)
  const boundaryThickness = obj.boundaryThickness || 5;
  const lineWeight = Math.max(3, boundaryThickness * 1.2);

  // Auto-fit font size — same as mustateel so the label stays inside the boundary
  const { numSize, showLabel } = useMemo(() => {
    const px = latlngs.map(p => map.latLngToLayerPoint([p.lat, p.lng]));
    const xs = px.map(p => p.x), ys = px.map(p => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const minDim = Math.min(w, h);
    if (minDim < 34) return { numSize: 0, showLabel: false };
    return { numSize: Math.max(8, Math.min(30, minDim * 0.3)), showLabel: true };
  }, [latlngs, map, zoom]);

  return (
    <>
      <Polygon
        positions={latlngs.map(p => [p.lat, p.lng])}
        pathOptions={{
          color: isActive ? "#ff0000" : "#f97316",
          fillColor: isActive ? "#ef4444" : "#f97316",
          fillOpacity: isActive ? 0.18 : 0.08,
          weight: isActive ? lineWeight + 1.5 : lineWeight,
          opacity: 1,
          interactive: interactive,
        }}
        eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onClick && onClick(obj.id); } }}
      >
        {showLabel && (
          <Tooltip permanent direction="center" className="muraba-label" opacity={1}>
            <div style={{ fontSize: `${numSize}px`, fontWeight: 800, color: "#c2410c", textAlign: "center", lineHeight: 1.1, whiteSpace: "nowrap", textShadow: "0 0 3px #fff, 0 0 3px #fff" }}>
              {obj.label && <div>{obj.label}</div>}
            </div>
          </Tooltip>
        )}
      </Polygon>
      {/* Acre grid lines — clicked/active muraba, or all parcels in cell-allocation mode */}
      {showKilla && (isActive || gridAll) && <KillaGridLines obj={obj} transform={transform} zoom={zoom} forceVisible={gridAll || isActive} />}
      {/* Killa (acre) numbers — inside each grid cell of the clicked muraba */}
      {showKilla && isActive && killaLatLngs?.map((k) => <KillaLabel key={k.num} num={k.num} latlng={k.latlng} zoom={zoom} />)}
    </>
  );
}

function AcreLabel({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polygon
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#facc15", fillColor: "#facc15", fillOpacity: 0, weight: 0, opacity: 0, interactive: false }}
    >
      {obj.label && (
        <Tooltip permanent direction="center" className="acre-label" opacity={1}>
          <span style={{ fontSize: `${fontSize * 0.65 * 2}px`, fontWeight: 700, color: "#a16207", textShadow: "1px 1px 2px rgba(255,255,255,0.9), -1px -1px 2px rgba(255,255,255,0.9)" }}>{obj.label}</span>
        </Tooltip>
      )}
    </Polygon>
  );
}

// ─── CANAL: flat style with parallel boundaries + water fill ─────
// Reads colors from the canal object's own properties (set in the Map Editor
// PropertiesPanel) and the editor's global colorSettings, so changes made in
// the Map Editor are reflected here automatically.
const CANAL_STYLE_COLORS = {
  flat:        { fill: "#1E90FF", stroke: "#1565C0" },
  "3d":        { fill: "#1d6fa5", stroke: "#1d6fa5" },
  concrete:    { fill: "#9ca3af", stroke: "#6b7280" },
  earth:       { fill: "#a16207", stroke: "#78350f" },
  water:       { fill: "#1e90ff", stroke: "#0c6fb3" },
  "3dwater":   { fill: "#0ea5e9", stroke: "#0284c7" },
  green:       { fill: "#16a34a", stroke: "#15803d" },
  greenWater:  { fill: "#16a34a", stroke: "#1d4ed8" },
  engineering: { fill: "#2563eb", stroke: "#1e40af" },
  dashed:      { fill: "#3b82f6", stroke: "#2563eb" },
  custom:      { fill: "#1E90FF", stroke: "#1565C0" },
};
function CanalLine({ obj, latlngs, zoom, transform, colorSettings }) {
  const fontSize = labelFontSize(zoom);
  const halfW = (obj.width || DIMENSIONS.CANAL_WIDTH || 14) / 2;
  const C = colorSettings || {};
  // Resolve canal colours: per-object custom → global editor settings → style default
  const styleKey = obj.canalStyle || "flat";
  const styleDef = CANAL_STYLE_COLORS[styleKey] || CANAL_STYLE_COLORS.flat;
  const fillColor = obj.fillColor || C.canalFill || styleDef.fill;
  const strokeColor = obj.strokeColor || C.canalStroke || styleDef.stroke;
  const fillOpacity = obj.fillOpacity ?? 0.70;

  // Compute parallel offset in canvas space, then transform to lat/lng
  const { leftLine, rightLine, fillLatLngs } = useMemo(() => {
    if (!obj.points || obj.points.length < 2 || !transform) return { leftLine: [], rightLine: [], fillLatLngs: [] };
    const pts = obj.points;
    const left = [], right = [];
    const MITER_LIMIT = 4;
    for (let i = 0; i < pts.length; i++) {
      let nx, ny;
      if (pts.length === 2) {
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len; ny = dx / len;
      } else if (i === 0) {
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len; ny = dx / len;
      } else if (i === pts.length - 1) {
        const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len; ny = dx / len;
      } else {
        const dx1 = pts[i].x - pts[i-1].x, dy1 = pts[i].y - pts[i-1].y;
        const dx2 = pts[i+1].x - pts[i].x, dy2 = pts[i+1].y - pts[i].y;
        const len1 = Math.hypot(dx1, dy1) || 1, len2 = Math.hypot(dx2, dy2) || 1;
        const n1x = -dy1/len1, n1y = dx1/len1;
        const n2x = -dy2/len2, n2y = dx2/len2;
        let bx = (n1x + n2x) / 2, by = (n1y + n2y) / 2;
        const bLen = Math.hypot(bx, by);
        if (bLen > 1e-9) {
          bx /= bLen; by /= bLen;
          const dot = n1x * bx + n1y * by;
          if (Math.abs(dot) > 1e-6) {
            let miterFactor = 1 / dot;
            if (miterFactor > MITER_LIMIT) miterFactor = MITER_LIMIT;
            else if (miterFactor < -MITER_LIMIT) miterFactor = -MITER_LIMIT;
            nx = bx * miterFactor; ny = by * miterFactor;
          } else { nx = n1x; ny = n1y; }
        } else { nx = n1x; ny = n1y; }
      }
      left.push(transform.transform(pts[i].x + nx * halfW, pts[i].y + ny * halfW));
      right.push(transform.transform(pts[i].x - nx * halfW, pts[i].y - ny * halfW));
    }
    // Fill polygon: left points + reversed right points
    const fill = [...left, ...[...right].reverse()];
    return { leftLine: left, rightLine: right, fillLatLngs: fill };
  }, [obj.points, transform, halfW]);

  // Repeating canal-name label positions along the centerline — matches the Map
  // Editor: gold text with dark outline, repeating every ~5 acres of frontage.
  const labelPoints = useMemo(() => {
    if (!obj.name || !obj.points || obj.points.length < 2 || !transform) return [];
    const pts = obj.points;
    const segLens = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      segLens.push(d); total += d;
    }
    if (total < 1) return [];
    const cf = canalNameFont(obj.width || DIMENSIONS.CANAL_WIDTH || 14);
    const labelW = obj.name.length * cf * 0.55;
    const repeatSpacing = 1100; // ~5 acres of canal frontage
    const out = [];
    for (let dist = labelW / 2; dist + labelW / 2 < total; dist += repeatSpacing) {
      let acc = 0, placed = false, px = 0, py = 0;
      for (let i = 0; i < segLens.length; i++) {
        if (acc + segLens[i] >= dist) {
          const t = segLens[i] > 0 ? (dist - acc) / segLens[i] : 0;
          const a = pts[i], b = pts[i + 1];
          px = a.x + (b.x - a.x) * t;
          py = a.y + (b.y - a.y) * t;
          placed = true; break;
        }
        acc += segLens[i];
      }
      if (!placed) break;
      out.push(transform.transform(px, py));
    }
    return out;
  }, [obj.name, obj.points, obj.width, transform]);

  if (fillLatLngs.length === 0) {
    return (
      <Polyline positions={latlngs.map(p => [p.lat, p.lng])} pathOptions={{ color: "#1E90FF", weight: 3, opacity: 0.9, interactive: false }} />
    );
  }

  const boundaryWeight = Math.max(1.5, 3 - (18 - zoom) * 0.2);
  const isDashed = styleKey === "dashed";

  return (
    <>
      {/* Water fill polygon */}
      <Polygon
        positions={fillLatLngs.map(p => [p.lat, p.lng])}
        pathOptions={{ color: strokeColor, fillColor, fillOpacity, weight: 0, opacity: 0, interactive: false }}
      />
      {/* Left boundary */}
      <Polyline positions={leftLine.map(p => [p.lat, p.lng])} pathOptions={{ color: strokeColor, weight: boundaryWeight, opacity: 0.9, dashArray: isDashed ? "10,6" : undefined, interactive: false }} />
      {/* Right boundary */}
      <Polyline positions={rightLine.map(p => [p.lat, p.lng])} pathOptions={{ color: strokeColor, weight: boundaryWeight, opacity: 0.9, dashArray: isDashed ? "10,6" : undefined, interactive: false }} />
      {/* Canal name — repeating along the centerline, gold with dark outline (matches Map Editor) */}
      {obj.name && labelPoints.map((p, i) => (
        <CircleMarker key={`lbl-${i}`} center={[p.lat, p.lng]} radius={0} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
          <Tooltip permanent direction="center" className="canal-label" opacity={0.95}>
            <span style={{ fontSize: `${Math.max(10, fontSize * 0.62)}px`, fontWeight: 700, color: "#FFD700", textShadow: "1px 1px 2px #000, -1px -1px 2px #000, 0 0 3px #000", whiteSpace: "nowrap" }}>
              {obj.name}
            </span>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

// ─── KHAL: parallel blue boundary lines ──────────────────────────
function KhalLine({ obj, latlngs, zoom, transform }) {
  const fontSize = labelFontSize(zoom);
  const halfW = (obj.width || 8) / 2;

  const { leftLine, rightLine, fillLatLngs } = useMemo(() => {
    if (!obj.points || obj.points.length < 2 || !transform) return { leftLine: [], rightLine: [] };
    const pts = obj.points;
    const left = [], right = [];
    const MITER_LIMIT = 4;
    for (let i = 0; i < pts.length; i++) {
      let nx, ny;
      if (pts.length === 2) {
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1; nx = -dy/len; ny = dx/len;
      } else if (i === 0) {
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1; nx = -dy/len; ny = dx/len;
      } else if (i === pts.length - 1) {
        const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
        const len = Math.hypot(dx, dy) || 1; nx = -dy/len; ny = dx/len;
      } else {
        const dx1 = pts[i].x - pts[i-1].x, dy1 = pts[i].y - pts[i-1].y;
        const dx2 = pts[i+1].x - pts[i].x, dy2 = pts[i+1].y - pts[i].y;
        const len1 = Math.hypot(dx1, dy1) || 1, len2 = Math.hypot(dx2, dy2) || 1;
        const n1x = -dy1/len1, n1y = dx1/len1, n2x = -dy2/len2, n2y = dx2/len2;
        let bx = (n1x + n2x) / 2, by = (n1y + n2y) / 2;
        const bLen = Math.hypot(bx, by);
        if (bLen > 1e-9) {
          bx /= bLen; by /= bLen;
          const dot = n1x * bx + n1y * by;
          if (Math.abs(dot) > 1e-6) {
            let mf = 1 / dot;
            if (mf > MITER_LIMIT) mf = MITER_LIMIT; else if (mf < -MITER_LIMIT) mf = -MITER_LIMIT;
            nx = bx * mf; ny = by * mf;
          } else { nx = n1x; ny = n1y; }
        } else { nx = n1x; ny = n1y; }
      }
      left.push(transform.transform(pts[i].x + nx * halfW, pts[i].y + ny * halfW));
      right.push(transform.transform(pts[i].x - nx * halfW, pts[i].y - ny * halfW));
    }
    return { leftLine: left, rightLine: right, fillLatLngs: [...left, ...[...right].reverse()] };
  }, [obj.points, transform, halfW]);

  const isInformal = obj.khalType === "informal";
  const khalColor = isInformal ? "#0891b2" : "#2563eb";
  const bankColor = isInformal ? "#0e7490" : "#1d4ed8";
  if (leftLine.length === 0) {
    return <Polyline positions={latlngs.map(p => [p.lat, p.lng])} pathOptions={{ color: khalColor, weight: 3, opacity: 0.9, dashArray: isInformal ? "8,6" : undefined, interactive: false }} />;
  }

  const w = Math.max(2.5, 3 - (18 - zoom) * 0.15); // ≥ mustateel grid line width so the khal stays visible
  return (
    <>
      <Polygon positions={fillLatLngs.map(p => [p.lat, p.lng])} pathOptions={{ color: bankColor, fillColor: khalColor, fillOpacity: 0.7, weight: 0, opacity: 0, interactive: false }}>
        {obj.name && (
          <Tooltip permanent direction="center" className="khal-label" opacity={0.9}>
            <span style={{ fontSize: `${fontSize * 0.58}px`, color: isInformal ? "#0e7490" : "#1d4ed8", backgroundColor: "rgba(255,255,255,0.8)", padding: "0 2px" }}>
              {obj.name}
            </span>
          </Tooltip>
        )}
      </Polygon>
      <Polyline positions={leftLine.map(p => [p.lat, p.lng])} pathOptions={{ color: bankColor, weight: w, opacity: 0.9, dashArray: isInformal ? "8,6" : undefined, interactive: false }} />
      <Polyline positions={rightLine.map(p => [p.lat, p.lng])} pathOptions={{ color: bankColor, weight: w, opacity: 0.9, dashArray: isInformal ? "8,6" : undefined, interactive: false }} />
    </>
  );
}

// ─── ROAD: parallel amber boundary lines ──────────────────────────
function RoadLine({ obj, latlngs, zoom, transform }) {
  const fontSize = labelFontSize(zoom);
  const halfW = (obj.width || 28) / 2;

  const { leftLine, rightLine } = useMemo(() => {
    if (!obj.points || obj.points.length < 2 || !transform) return { leftLine: [], rightLine: [] };
    const pts = obj.points;
    const left = [], right = [];
    const MITER_LIMIT = 4;
    for (let i = 0; i < pts.length; i++) {
      let nx, ny;
      if (pts.length === 2) {
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1; nx = -dy/len; ny = dx/len;
      } else if (i === 0) {
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1; nx = -dy/len; ny = dx/len;
      } else if (i === pts.length - 1) {
        const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
        const len = Math.hypot(dx, dy) || 1; nx = -dy/len; ny = dx/len;
      } else {
        const dx1 = pts[i].x - pts[i-1].x, dy1 = pts[i].y - pts[i-1].y;
        const dx2 = pts[i+1].x - pts[i].x, dy2 = pts[i+1].y - pts[i].y;
        const len1 = Math.hypot(dx1, dy1) || 1, len2 = Math.hypot(dx2, dy2) || 1;
        const n1x = -dy1/len1, n1y = dx1/len1, n2x = -dy2/len2, n2y = dx2/len2;
        let bx = (n1x + n2x) / 2, by = (n1y + n2y) / 2;
        const bLen = Math.hypot(bx, by);
        if (bLen > 1e-9) {
          bx /= bLen; by /= bLen;
          const dot = n1x * bx + n1y * by;
          if (Math.abs(dot) > 1e-6) {
            let mf = 1 / dot;
            if (mf > MITER_LIMIT) mf = MITER_LIMIT; else if (mf < -MITER_LIMIT) mf = -MITER_LIMIT;
            nx = bx * mf; ny = by * mf;
          } else { nx = n1x; ny = n1y; }
        } else { nx = n1x; ny = n1y; }
      }
      left.push(transform.transform(pts[i].x + nx * halfW, pts[i].y + ny * halfW));
      right.push(transform.transform(pts[i].x - nx * halfW, pts[i].y - ny * halfW));
    }
    return { leftLine: left, rightLine: right };
  }, [obj.points, transform, halfW]);

  if (leftLine.length === 0) {
    return <Polyline positions={latlngs.map(p => [p.lat, p.lng])} pathOptions={{ color: "#b45309", weight: 3, dashArray: "10,6", opacity: 0.8, interactive: false }} />;
  }

  const w = Math.max(1.5, 3 - (18 - zoom) * 0.2);
  return (
    <>
      <Polyline positions={leftLine.map(p => [p.lat, p.lng])} pathOptions={{ color: "#b45309", weight: w, opacity: 0.8, interactive: false }} />
      <Polyline positions={rightLine.map(p => [p.lat, p.lng])} pathOptions={{ color: "#b45309", weight: w, opacity: 0.8, interactive: false }} />
      {obj.name && (
        <Tooltip permanent direction="center" className="road-label" opacity={0.9}>
          <span style={{ fontSize: `${fontSize * 0.58}px`, color: "#92400e", backgroundColor: "rgba(255,255,255,0.8)", padding: "0 2px" }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </>
  );
}

// ─── CHAKBANDI: green line + cross pattern marks ─────────────────
// Same as map editor: green boundary with × marks at regular intervals.
function ChakbandiLine({ obj, latlngs, zoom, transform, ccaCenter }) {
  const fontSize = labelFontSize(zoom);
  const lineThickness = obj.lineThickness || 6;
  const crossPattern = obj.crossPattern !== false;
  const crossSize = obj.crossSize || 6;
  const crossSpacing = obj.crossSpacing || 8;
  const lineWeight = Math.max(3, lineThickness * 0.9);

  // Generate cross marks along the path in canvas space
  const crossMarks = useMemo(() => {
    if (!crossPattern || !obj.points || obj.points.length < 2 || !transform) return [];
    const pts = obj.points;
    // Calculate cumulative distances
    const segLens = [], cumDists = [0];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
      segLens.push(d); total += d; cumDists.push(total);
    }
    if (total < 1) return [];
    const marks = [];
    const spacingFt = crossSpacing * 50; // scale cross spacing to canvas units
    for (let dist = spacingFt / 2; dist < total; dist += spacingFt) {
      // Find position at this distance
      let segIdx = 0, rem = dist;
      while (segIdx < segLens.length && rem > segLens[segIdx]) { rem -= segLens[segIdx]; segIdx++; }
      if (segIdx >= segLens.length) break;
      const t = segLens[segIdx] > 0 ? rem / segLens[segIdx] : 0;
      const p1 = pts[segIdx], p2 = pts[segIdx + 1];
      const cx = p1.x + (p2.x - p1.x) * t;
      const cy = p1.y + (p2.y - p1.y) * t;
      // Tangent angle
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const s = crossSize * 3; // scale cross size
      // X mark: 4 points (two diagonal lines)
      const p1a = transform.transform(cx + (-cosA - sinA) * s, cy + (-sinA + cosA) * s);
      const p1b = transform.transform(cx + (cosA + sinA) * s, cy + (sinA - cosA) * s);
      const p2a = transform.transform(cx + (cosA - sinA) * s, cy + (sinA + cosA) * s);
      const p2b = transform.transform(cx + (-cosA + sinA) * s, cy + (-sinA - cosA) * s);
      marks.push([[p1a.lat, p1a.lng], [p1b.lat, p1b.lng]]);
      marks.push([[p2a.lat, p2a.lng], [p2b.lat, p2b.lng]]);
    }
    return marks;
  }, [obj.points, transform, crossPattern, crossSize, crossSpacing]);

  return (
    <>
      <Polyline
        positions={latlngs.map(p => [p.lat, p.lng])}
        pathOptions={{ color: "#00cc00", weight: lineWeight + 1, opacity: 1, interactive: false }}
      />
      {/* Cross pattern marks */}
      {crossMarks.map((pts, i) => (
        <Polyline key={i} positions={pts} pathOptions={{ color: "#00cc00", weight: Math.max(2.5, lineWeight * 0.9), opacity: 1, interactive: false }} />
      ))}
      {obj.name && (
        <Tooltip permanent direction="top" className="chakbandi-label" opacity={0.9}>
          <span style={{ fontSize: `${fontSize * 0.6}px`, fontWeight: 600, color: "#15803d", backgroundColor: "rgba(255,255,255,0.8)", padding: "0 3px" }}>{obj.name}</span>
        </Tooltip>
      )}
      <CcaCenterLabel latlng={ccaCenter} text={obj.centerLabel} zoom={zoom} />
    </>
  );
}

// CCA/GCA label placed at the centroid of the canal + chakbandi closed loop,
// nudged away from mustateel numbers so it doesn't disturb parcel text.
function CcaCenterLabel({ latlng, text, zoom }) {
  if (!latlng || !text) return null;
  const fontSize = labelFontSize(zoom);
  return (
    <CircleMarker
      center={[latlng.lat, latlng.lng]}
      radius={0}
      pathOptions={{ opacity: 0, fillOpacity: 0, interactive: false }}
    >
      <Tooltip permanent direction="center" opacity={0.95} className="chakbandi-center">
        <span style={{ fontSize: `${Math.max(13, fontSize * 0.95)}px`, fontWeight: 700, color: "#15803d", backgroundColor: "rgba(255,255,255,0.92)", padding: "2px 6px", borderRadius: 3, border: "1px solid #15803d", whiteSpace: "nowrap" }}>{text}</span>
      </Tooltip>
    </CircleMarker>
  );
}

function OutletMarker({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  if (!latlngs || latlngs.length < 2) return null;
  const blockSize = Math.max(3, (obj.blockSize || 20) / 6 - (18 - zoom) * 0.3);
  return (
    <>
      <Polyline
        positions={latlngs.map(p => [p.lat, p.lng])}
        pathOptions={{ color: obj.outletColor || "#06b6d4", weight: Math.max(2, 4 - (18 - zoom) * 0.25), opacity: 0.9, interactive: false }}
      />
      {/* Block at start */}
      <CircleMarker
        center={[latlngs[0].lat, latlngs[0].lng]}
        radius={blockSize}
        pathOptions={{ color: "#0e7490", fillColor: obj.outletColor || "#06b6d4", fillOpacity: 0.9, weight: 2, interactive: false }}
      >
        <Tooltip permanent direction="top" className="moga-label" opacity={0.95}>
          <span style={{ fontSize: `${Math.max(14, fontSize * 1.0)}px`, fontWeight: 700, color: "#0e7490", backgroundColor: "rgba(255,255,255,0.92)", padding: "1px 4px", borderRadius: 2, fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
            موگہ {obj.mogha_number || ""}{obj.mogha_side ? `/${obj.mogha_side}` : ""}
          </span>
        </Tooltip>
      </CircleMarker>
      {/* Arrow at end — pointed head at the end point, tail toward the line's origin */}
      {(() => {
        const p1 = latlngs[latlngs.length - 2], p2 = latlngs[latlngs.length - 1];
        // Bearing (clockwise from north) of the last segment, p1 → p2
        const bearing = Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI;
        // CSS rotate(0°) points east; bearing 0 = north → offset by -90°
        const rot = bearing - 90;
        const color = obj.outletColor || "#06b6d4";
        const arrowIcon = L.divIcon({
          html: `<div style="transform: rotate(${rot}deg); transform-origin: 26px 10px; line-height: 0;">
            <svg width="28" height="20" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
              <line x1="3" y1="10" x2="19" y2="10" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M15 3 L26 10 L15 17 Z" fill="${color}" stroke="#ffffff" stroke-width="1" stroke-linejoin="round"/>
            </svg>
          </div>`,
          className: "",
          iconSize: [28, 20],
          iconAnchor: [26, 10],
        });
        return <Marker position={[p2.lat, p2.lng]} icon={arrowIcon} />;
      })()}
    </>
  );
}

function MouzaLine({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polyline
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#000000", weight: 1.5, dashArray: "12,8", opacity: 0.7, interactive: false }}
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
  const cells = obj.type === "muraba" ? getMurabaKillaCells(obj) : getMustateelKillaCells(obj);
  return cells.map(cell => {
    const p = transform.transform(cell.x + cell.w / 2, cell.y + cell.h / 2);
    return { num: cell.killa, latlng: [p.lat, p.lng] };
  });
}

export default function OverlayLayer({ objects, transform, zoom, killaVisible, mogaFilter, activeMustateelIds, gridAll, onMustateelClick, skipLabels, showCanals = true, chakbandiOnly = false, colorSettings, interactive = true }) {
  // NOTE: chakbandis render in the SAME overlay pane (the final chakbandiOnly
  // pass adds them last → drawn on top within the shared canvas). A separate
  // top pane would give chakbandis their own full-viewport canvas ABOVE the
  // overlay canvas — that canvas intercepts every map click/dblclick and
  // silently kills clicks on mustateels, khals and allocation cells below.

  const geoObjects = useMemo(() => {
    if (!transform || !objects.length) return [];
    const filtered = objects.filter(o => {
      if (!showCanals && o.type === "canal") return false;
      // Merge same-number mustateels shared across mogas: if another moga
      // already draws this label, skip it here so only one boundary shows.
      if (skipLabels && skipLabels.size && (o.type === "mustateel" || o.type === "muraba") && o.label && skipLabels.has(String(o.label).trim())) return false;
      if (mogaFilter) {
        if (o.type === "chakbandi") return o.mogaNumber === mogaFilter || !o.mogaNumber;
        if (o.type === "mustateel") return o.mogaNumber === mogaFilter || !o.mogaNumber;
        return true;
      }
      return true;
    });
    const sorted = [...filtered].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));
    return sorted.map(obj => {
      let latlngs, killaLatLngs = null;
      if (["mustateel", "muraba", "acre"].includes(obj.type)) {
        latlngs = canvasRectToLatLngs(obj, transform);
        if ((obj.type === "mustateel" || obj.type === "muraba") && killaVisible) {
          killaLatLngs = computeKillaLatLngs(obj, transform);
        }
      } else if (obj.start && obj.end) {
        latlngs = [transform.transform(obj.start.x, obj.start.y), transform.transform(obj.end.x, obj.end.y)];
      } else if (obj.points?.length >= 2) {
        latlngs = canvasPolylineToLatLngs(obj, transform);
      } else return null;
      const ccaCenter = obj.type === "chakbandi" && obj.centerLabel ? computeCcaCenter(obj, objects, transform) : null;
      return { obj, latlngs, killaLatLngs, ccaCenter };
    }).filter(Boolean);
  }, [objects, transform, mogaFilter, killaVisible, skipLabels, showCanals]);

  // Chakbandis are only split into a separate render list: callers run a final
  // chakbandiOnly pass AFTER all mustateel passes, so within the shared canvas
  // they are added last → drawn (and stacked) above every mustateel polygon,
  // even across multiple placed mogas in AllOverlaysLayer.
  const regularObjects = geoObjects.filter(({ obj }) => obj.type !== "chakbandi");
  const chakbandiObjects = geoObjects.filter(({ obj }) => obj.type === "chakbandi");

  // Chakbandi-only pass: renders just the green boundary lines so callers can
  // place them in a final render pass (after all mustateels from every moga).
  // Leaflet SVG stacks by DOM order, so rendering chakbandis last guarantees
  // they stay on top — never hidden under another moga's mustateel polygons.
  if (chakbandiOnly) {
    return (
      <>
        {chakbandiObjects.map(({ obj, latlngs, ccaCenter }) => (
          <MemoChakbandi key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} transform={transform} ccaCenter={ccaCenter} />
        ))}
      </>
    );
  }

  return (
    <>
      {regularObjects.map(({ obj, latlngs, killaLatLngs, ccaCenter }) => {
        switch (obj.type) {
          case "mustateel": return <MemoMustateel key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} showKilla={killaVisible} killaLatLngs={killaLatLngs} transform={transform} isActive={activeMustateelIds?.has(obj.id)} gridAll={gridAll} onClick={onMustateelClick} interactive={interactive} />;
          case "muraba": return <MemoMuraba key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} showKilla={killaVisible} killaLatLngs={killaLatLngs} transform={transform} isActive={activeMustateelIds?.has(obj.id)} gridAll={gridAll} onClick={onMustateelClick} interactive={interactive} />;
          case "acre": return <MemoAcre key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "canal": return <MemoCanal key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} transform={transform} colorSettings={colorSettings} />;
          case "khal": return <MemoKhal key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} transform={transform} />;
          case "road": return <MemoRoad key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} transform={transform} />;
          case "mouza": return <MemoMouza key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "outlet": return <MemoOutlet key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          default: return null;
        }
      })}
    </>
  );
}