import React, { useMemo, memo } from "react";
import { Polygon, Polyline, Tooltip, CircleMarker, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { getMustateelKillaCells, getMurabaKillaCells, DIMENSIONS } from "@/lib/gisEngine";
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
    <Polyline key={i} positions={pts} pathOptions={{ color: "#facc15", weight: 2.5, opacity: 0.9 }} />
  ));
}

// Killa label as a CircleMarker with permanent tooltip
function KillaLabel({ num, latlng, zoom }) {
  return (
    <CircleMarker
      center={latlng}
      radius={0}
      pathOptions={{ opacity: 0, fillOpacity: 0 }}
    >
      <Tooltip permanent direction="center" opacity={1} className="killa-label">
        <span style={{ fontSize: `${Math.max(8, labelFontSize(zoom) * 0.6)}px`, fontWeight: 700, color: "#16a34a", textShadow: "1px 1px 2px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9)" }}>{num}</span>
      </Tooltip>
    </CircleMarker>
  );
}

function MustateelLabel({ obj, latlngs, zoom, showKilla, killaLatLngs, transform, isActive, gridAll, onClick }) {
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
    </>
  );
}

function MurabaLabel({ obj, latlngs, zoom, showKilla, killaLatLngs, transform, isActive, gridAll, onClick }) {
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
    </>
  );
}

function AcreLabel({ obj, latlngs, zoom }) {
  const fontSize = labelFontSize(zoom);
  return (
    <Polygon
      positions={latlngs.map(p => [p.lat, p.lng])}
      pathOptions={{ color: "#facc15", fillColor: "#facc15", fillOpacity: 0, weight: 0, opacity: 0 }}
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
// Same as map editor: two parallel blue boundary lines, blue water fill between.
function CanalLine({ obj, latlngs, zoom, transform }) {
  const fontSize = labelFontSize(zoom);
  const halfW = (obj.width || DIMENSIONS.CANAL_WIDTH || 14) / 2;

  // Compute parallel offset in canvas space, then transform to lat/lng
  const { leftLine, rightLine, fillLatLngs } = useMemo(() => {
    if (!obj.points || obj.points.length < 2 || !transform) return { leftLine: [], rightLine: [], fillLatLngs: [] };
    const pts = obj.points;
    const left = [], right = [];
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
        nx = (-dy1/len1 + -dy2/len2) / 2;
        ny = (dx1/len1 + dx2/len2) / 2;
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl; ny /= nl;
      }
      left.push(transform.transform(pts[i].x + nx * halfW, pts[i].y + ny * halfW));
      right.push(transform.transform(pts[i].x - nx * halfW, pts[i].y - ny * halfW));
    }
    // Fill polygon: left points + reversed right points
    const fill = [...left, ...[...right].reverse()];
    return { leftLine: left, rightLine: right, fillLatLngs: fill };
  }, [obj.points, transform, halfW]);

  if (fillLatLngs.length === 0) {
    return (
      <Polyline positions={latlngs.map(p => [p.lat, p.lng])} pathOptions={{ color: "#0284c7", weight: 3, opacity: 0.9 }} />
    );
  }

  const boundaryWeight = Math.max(1.5, 3 - (18 - zoom) * 0.2);

  return (
    <>
      {/* Water fill polygon */}
      <Polygon
        positions={fillLatLngs.map(p => [p.lat, p.lng])}
        pathOptions={{ color: "#2B7AB8", fillColor: "#A3DAF4", fillOpacity: 0.70, weight: 0, opacity: 0 }}
      />
      {/* Left boundary */}
      <Polyline positions={leftLine.map(p => [p.lat, p.lng])} pathOptions={{ color: "#2B7AB8", weight: boundaryWeight, opacity: 0.9 }} />
      {/* Right boundary */}
      <Polyline positions={rightLine.map(p => [p.lat, p.lng])} pathOptions={{ color: "#2B7AB8", weight: boundaryWeight, opacity: 0.9 }} />
      {obj.name && (
        <Tooltip permanent direction="center" className="canal-label" opacity={0.95}>
          <span style={{ fontSize: `${fontSize * 0.68}px`, fontWeight: 700, color: "#FFD700", backgroundColor: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: 2 }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
    </>
  );
}

// ─── KHAL: parallel blue boundary lines ──────────────────────────
function KhalLine({ obj, latlngs, zoom, transform }) {
  const fontSize = labelFontSize(zoom);
  const halfW = (obj.width || 8) / 2;

  const { leftLine, rightLine } = useMemo(() => {
    if (!obj.points || obj.points.length < 2 || !transform) return { leftLine: [], rightLine: [] };
    const pts = obj.points;
    const left = [], right = [];
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
        nx = (-dy1/len1 + -dy2/len2) / 2; ny = (dx1/len1 + dx2/len2) / 2;
        const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      }
      left.push(transform.transform(pts[i].x + nx * halfW, pts[i].y + ny * halfW));
      right.push(transform.transform(pts[i].x - nx * halfW, pts[i].y - ny * halfW));
    }
    return { leftLine: left, rightLine: right };
  }, [obj.points, transform, halfW]);

  if (leftLine.length === 0) {
    return <Polyline positions={latlngs.map(p => [p.lat, p.lng])} pathOptions={{ color: "#2563eb", weight: 2, opacity: 0.85 }} />;
  }

  const w = Math.max(1, 2 - (18 - zoom) * 0.15);
  return (
    <>
      <Polyline positions={leftLine.map(p => [p.lat, p.lng])} pathOptions={{ color: "#2563eb", weight: w, opacity: 0.85 }} />
      <Polyline positions={rightLine.map(p => [p.lat, p.lng])} pathOptions={{ color: "#2563eb", weight: w, opacity: 0.85 }} />
      {obj.name && (
        <Tooltip permanent direction="center" className="khal-label" opacity={0.9}>
          <span style={{ fontSize: `${fontSize * 0.58}px`, color: "#1d4ed8", backgroundColor: "rgba(255,255,255,0.8)", padding: "0 2px" }}>
            {obj.name}
          </span>
        </Tooltip>
      )}
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
        nx = (-dy1/len1 + -dy2/len2) / 2; ny = (dx1/len1 + dx2/len2) / 2;
        const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      }
      left.push(transform.transform(pts[i].x + nx * halfW, pts[i].y + ny * halfW));
      right.push(transform.transform(pts[i].x - nx * halfW, pts[i].y - ny * halfW));
    }
    return { leftLine: left, rightLine: right };
  }, [obj.points, transform, halfW]);

  if (leftLine.length === 0) {
    return <Polyline positions={latlngs.map(p => [p.lat, p.lng])} pathOptions={{ color: "#b45309", weight: 3, dashArray: "10,6", opacity: 0.8 }} />;
  }

  const w = Math.max(1.5, 3 - (18 - zoom) * 0.2);
  return (
    <>
      <Polyline positions={leftLine.map(p => [p.lat, p.lng])} pathOptions={{ color: "#b45309", weight: w, opacity: 0.8 }} />
      <Polyline positions={rightLine.map(p => [p.lat, p.lng])} pathOptions={{ color: "#b45309", weight: w, opacity: 0.8 }} />
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
        pathOptions={{ color: "#00cc00", weight: lineWeight + 1, opacity: 1 }}
      />
      {/* Cross pattern marks */}
      {crossMarks.map((pts, i) => (
        <Polyline key={i} positions={pts} pathOptions={{ color: "#00cc00", weight: Math.max(2.5, lineWeight * 0.9), opacity: 1 }} />
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
      pathOptions={{ opacity: 0, fillOpacity: 0 }}
    >
      <Tooltip permanent direction="center" opacity={0.95} className="chakbandi-center">
        <span style={{ fontSize: `${fontSize * 0.6}px`, fontWeight: 700, color: "#15803d", backgroundColor: "rgba(255,255,255,0.92)", padding: "2px 6px", borderRadius: 3, border: "1px solid #15803d", whiteSpace: "nowrap" }}>{text}</span>
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
        pathOptions={{ color: obj.outletColor || "#06b6d4", weight: Math.max(2, 4 - (18 - zoom) * 0.25), opacity: 0.9 }}
      />
      {/* Block at start */}
      <CircleMarker
        center={[latlngs[0].lat, latlngs[0].lng]}
        radius={blockSize}
        pathOptions={{ color: "#0e7490", fillColor: obj.outletColor || "#06b6d4", fillOpacity: 0.9, weight: 2 }}
      >
        <Tooltip permanent direction="top" className="moga-label" opacity={0.95}>
          <span style={{ fontSize: `${fontSize * 0.62}px`, fontWeight: 700, color: "#0e7490", backgroundColor: "rgba(255,255,255,0.92)", padding: "1px 4px", borderRadius: 2, fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
            موگہ {obj.mogha_number || ""}{obj.mogha_side ? `/${obj.mogha_side}` : ""}
          </span>
        </Tooltip>
      </CircleMarker>
      {/* Arrow at end — using a marker with rotation */}
      {(() => {
        const p1 = latlngs[latlngs.length - 2], p2 = latlngs[latlngs.length - 1];
        const angle = Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI;
        const arrowIcon = L.divIcon({
          html: `<div style="transform: rotate(${angle}deg); font-size: 18px; color: ${obj.outletColor || "#06b6d4"}; line-height: 1;">➤</div>`,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
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
  const cells = obj.type === "muraba" ? getMurabaKillaCells(obj) : getMustateelKillaCells(obj);
  return cells.map(cell => {
    const p = transform.transform(cell.x + cell.w / 2, cell.y + cell.h / 2);
    return { num: cell.killa, latlng: [p.lat, p.lng] };
  });
}

export default function OverlayLayer({ objects, transform, zoom, killaVisible, mogaFilter, activeMustateelIds, gridAll, onMustateelClick }) {
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
  }, [objects, transform, mogaFilter, killaVisible]);

  return (
    <>
      {geoObjects.map(({ obj, latlngs, killaLatLngs, ccaCenter }) => {
        switch (obj.type) {
          case "mustateel": return <MemoMustateel key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} showKilla={killaVisible} killaLatLngs={killaLatLngs} transform={transform} isActive={activeMustateelIds?.has(obj.id)} gridAll={gridAll} onClick={onMustateelClick} />;
          case "muraba": return <MemoMuraba key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} showKilla={killaVisible} killaLatLngs={killaLatLngs} transform={transform} isActive={activeMustateelIds?.has(obj.id)} gridAll={gridAll} onClick={onMustateelClick} />;
          case "acre": return <MemoAcre key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "canal": return <MemoCanal key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} transform={transform} />;
          case "khal": return <MemoKhal key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} transform={transform} />;
          case "road": return <MemoRoad key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} transform={transform} />;
          case "chakbandi": return <MemoChakbandi key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} transform={transform} ccaCenter={ccaCenter} />;
          case "mouza": return <MemoMouza key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          case "outlet": return <MemoOutlet key={obj.id} obj={obj} latlngs={latlngs} zoom={zoom} />;
          default: return null;
        }
      })}
    </>
  );
}