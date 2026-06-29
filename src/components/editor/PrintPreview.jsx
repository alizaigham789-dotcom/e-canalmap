import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, ZoomIn, ZoomOut } from "lucide-react";
import { getParallelPolyline, getMustateeelKillaGrid, getMurabaKillaGrid, DIMENSIONS } from "@/lib/gisEngine";

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

function hexToRgbStr(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "239,68,68";
}

function getObjectsBounds(objects) {
  if (!objects || objects.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.w); maxY = Math.max(maxY, o.y + o.h);
    } else if (o.points && o.points.length > 0) {
      for (const p of o.points) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    } else if (o.start && o.end) {
      minX = Math.min(minX, o.start.x, o.end.x); minY = Math.min(minY, o.start.y, o.end.y);
      maxX = Math.max(maxX, o.start.x, o.end.x); maxY = Math.max(maxY, o.start.y, o.end.y);
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// ─── PRINT DRAW FUNCTIONS ──────────────────────────────────────────────────
// All lineWidth values are in SCREEN PIXELS (the canvas is already scaled via ctx.scale).
// Do NOT divide by zoom — we render at a fixed print scale.

function printMustateel(ctx, obj, C, ps) {
  const borderPx = ps.mustateelThickness;
  const gridOpacity = ps.killaGridOpacity;
  const gridPx = ps.killaGridWidth;

  // Fill
  ctx.fillStyle = obj.fillColor || C.mustateelFill || "rgba(245,158,11,0.07)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);

  // Killa internal grid — BEFORE outer border so border paints over grid edges
  const ksColor = (obj.killaStyle || {}).strokeColor || C.mustateelStroke || "#ef4444";
  const rgb = hexToRgbStr(ksColor);
  ctx.strokeStyle = `rgba(${rgb},${gridOpacity})`;
  ctx.lineWidth = gridPx;
  ctx.setLineDash([]);
  const cellW = obj.w / 2, cellH = obj.h / 5;
  ctx.beginPath();
  // vertical centre line
  ctx.moveTo(obj.x + cellW, obj.y); ctx.lineTo(obj.x + cellW, obj.y + obj.h);
  // horizontal dividers (4 inner lines = 5 rows)
  for (let r = 1; r < 5; r++) {
    ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
  }
  ctx.stroke();

  // Outer boundary — thick red
  ctx.strokeStyle = C.mustateelStroke || "#ef4444";
  ctx.lineWidth = borderPx;
  ctx.lineJoin = "miter";
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Center survey number label
  if (obj.label) {
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x + 1, obj.y + 1, obj.w - 2, obj.h - 2); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    const fSize = Math.min(obj.w * 0.36, obj.h * 0.36);
    ctx.font = `900 ${fSize}px Rajdhani, Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
    ctx.restore();
  }
}

function printMuraba(ctx, obj, C, ps) {
  const borderPx = ps.mustateelThickness + 1.5;
  const gridOpacity = ps.killaGridOpacity;
  const gridPx = ps.killaGridWidth;

  ctx.fillStyle = obj.fillColor || C.murabaFill || "rgba(249,115,22,0.06)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);

  const ksColor = (obj.killaStyle || {}).strokeColor || C.murabaStroke || "#ef4444";
  const rgb = hexToRgbStr(ksColor);
  ctx.strokeStyle = `rgba(${rgb},${gridOpacity})`;
  ctx.lineWidth = gridPx;
  ctx.setLineDash([]);
  const cellW = obj.w / 5, cellH = obj.h / 5;
  ctx.beginPath();
  for (let c = 1; c < 5; c++) { ctx.moveTo(obj.x + c * cellW, obj.y); ctx.lineTo(obj.x + c * cellW, obj.y + obj.h); }
  for (let r = 1; r < 5; r++) { ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH); }
  ctx.stroke();

  ctx.strokeStyle = C.murabaStroke || "#ef4444";
  ctx.lineWidth = borderPx;
  ctx.lineJoin = "miter";
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  if (obj.label) {
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x + 1, obj.y + 1, obj.w - 2, obj.h - 2); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    const fSize = Math.min(obj.w * 0.28, obj.h * 0.28);
    ctx.font = `900 ${fSize}px Rajdhani, Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
    ctx.restore();
  }
}

function printChakbandi(ctx, obj, C, ps) {
  if (!obj.points || obj.points.length < 2) return;
  const color = C.chakbandiStroke || "#22c55e";
  const linePx = ps.chakbandiThickness;
  const crossPx = linePx * 3.5;   // cross arm half-length in pixels
  const spacingPx = crossPx * 3;  // spacing between crosses

  // Main green line
  ctx.strokeStyle = color;
  ctx.lineWidth = linePx;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Crosses — always in print
  ctx.strokeStyle = color;
  ctx.lineWidth = linePx * 0.7;
  ctx.lineCap = "round";
  for (let i = 0; i < obj.points.length - 1; i++) {
    const a = obj.points[i], b = obj.points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.floor(segLen / spacingPx));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = a.x + (b.x - a.x) * t;
      const cy = a.y + (b.y - a.y) * t;
      ctx.beginPath();
      ctx.moveTo(cx - crossPx, cy - crossPx); ctx.lineTo(cx + crossPx, cy + crossPx);
      ctx.moveTo(cx + crossPx, cy - crossPx); ctx.lineTo(cx - crossPx, cy + crossPx);
      ctx.stroke();
    }
  }
}

function printAcre(ctx, obj, C) {
  ctx.fillStyle = obj.fillColor || C.acreFill || "rgba(234,179,8,0.07)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.strokeStyle = C.acreStroke || "#eab308";
  ctx.lineWidth = 1;
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
  if (obj.label) {
    ctx.fillStyle = C.labelColor || "#000";
    const fSize = Math.min(obj.w, obj.h) * 0.22;
    ctx.font = `bold ${fSize}px Rajdhani, Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
  }
}

function printCanal(ctx, obj, C) {
  if (!obj.points || obj.points.length < 2) return;
  const halfW = (obj.width || DIMENSIONS.CANAL_WIDTH) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  ctx.fillStyle = C.canalFill || "rgba(30,144,255,0.20)";
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  for (let i = right.length-1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.canalStroke || "#0284c7";
  ctx.lineWidth = 2;
  ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  for (const side of [left, right]) {
    ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y); ctx.lineTo(right[0].x, right[0].y);
  ctx.moveTo(left[left.length-1].x, left[left.length-1].y); ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  ctx.stroke();
  if (obj.name) {
    const mid = Math.floor(obj.points.length / 2);
    const p = obj.points[mid], p2 = obj.points[Math.min(mid+1, obj.points.length-1)];
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p2.y-p.y, p2.x-p.x));
    ctx.fillStyle = "#dc2626"; ctx.font = "bold 14px Rajdhani, Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(obj.name, 0, 0); ctx.restore();
  }
}

function printKhal(ctx, obj, C) {
  if (!obj.points || obj.points.length < 2) return;
  const halfW = (obj.width || DIMENSIONS.KHAL_WIDTH) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  const color = C.khalStroke || "#2563eb";
  ctx.fillStyle = `${color}22`;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  for (let i = right.length-1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  for (const side of [left, right]) {
    ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
}

function printRoad(ctx, obj, C) {
  if (!obj.points || obj.points.length < 2) return;
  const halfW = (obj.width || DIMENSIONS.ROAD_WIDTH) / 2;
  const left = getParallelPolyline(obj.points, -halfW);
  const right = getParallelPolyline(obj.points, halfW);
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
  for (let i = right.length-1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.roadStroke || "#b45309"; ctx.lineWidth = 2;
  ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  for (const side of [left, right]) {
    ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y);
    for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke();
  }
}

function printMouza(ctx, obj, C) {
  if (!obj.points || obj.points.length < 2) return;
  ctx.strokeStyle = C.mouzaStroke || "#000"; ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke(); ctx.setLineDash([]);
}

// ─── MAIN RENDER ──────────────────────────────────────────────────────────
function renderObjectsToCanvas(objects, colorSettings, printSettings) {
  const bounds = getObjectsBounds(objects);
  if (!bounds) return null;

  // printScale: how many canvas pixels per world unit
  const pad = 80;
  const worldW = bounds.maxX - bounds.minX + pad * 2;
  const worldH = bounds.maxY - bounds.minY + pad * 2;

  // Target ~2400px wide for crisp A4 print at 300dpi
  const printScale = Math.min(4, Math.max(0.5, 2400 / worldW));

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(worldW * printScale);
  canvas.height = Math.ceil(worldH * printScale);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Scale so world coords map directly to pixels
  ctx.save();
  ctx.translate((pad - bounds.minX) * printScale, (pad - bounds.minY) * printScale);
  ctx.scale(printScale, printScale);

  const C = colorSettings || {};
  const ps = {
    mustateelThickness: (printSettings?.mustateelThickness || 3) / printScale,  // convert slider px → world units
    chakbandiThickness: (printSettings?.chakbandiThickness || 2) / printScale,
    killaGridOpacity: printSettings?.killaGridOpacity || 0.55,
    killaGridWidth: (printSettings?.killaGridWidth || 0.8) / printScale,
  };

  const sorted = [...objects].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));

  for (const obj of sorted) {
    switch (obj.type) {
      case "acre":         printAcre(ctx, obj, C); break;
      case "mustateel":    printMustateel(ctx, obj, C, ps); break;
      case "muraba":       printMuraba(ctx, obj, C, ps); break;
      case "canal":        printCanal(ctx, obj, C); break;
      case "khal":         printKhal(ctx, obj, C); break;
      case "road":         printRoad(ctx, obj, C); break;
      case "chakbandi":    printChakbandi(ctx, obj, C, ps); break;
      case "mouza":        printMouza(ctx, obj, C); break;
      default: break;
    }
  }

  ctx.restore();
  return canvas;
}

// ─── SLIDER HELPER ─────────────────────────────────────────────────────────
function SettingSlider({ label, value, min, max, step, onChange, unit = "" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 whitespace-nowrap">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-20 h-1 accent-blue-400 cursor-pointer"
      />
      <span className="text-[10px] font-mono text-slate-300 w-8">{value}{unit}</span>
    </div>
  );
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────
export default function PrintPreview({ mapData, objects, colorSettings, onClose }) {
  const [scale, setScale] = useState(100);
  const [printSettings, setPrintSettings] = useState({
    mustateelThickness: 3,
    chakbandiThickness: 2,
    killaGridOpacity: 0.55,
    killaGridWidth: 0.8,
  });

  const updatePS = (key, val) => setPrintSettings(prev => ({ ...prev, [key]: val }));

  const printCanvas = useMemo(
    () => renderObjectsToCanvas(objects, colorSettings, printSettings),
    [objects, colorSettings, printSettings]
  );

  const dataUrl = printCanvas ? printCanvas.toDataURL("image/png") : null;

  const handlePrint = () => {
    if (!printCanvas) return;
    const imgDataUrl = printCanvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${mapData?.title || "Chakbandi Map"} - Print</title>
      <style>
        @page { margin: 8mm; size: A4 landscape; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; font-family: Arial, sans-serif; }
        .header { border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:8px; display:flex; justify-content:space-between; }
        .title { font-size:18px; font-weight:bold; text-transform:uppercase; letter-spacing:2px; }
        .map-img { max-width:100%; height:auto; border:1px solid #999; display:block; }
        .footer { border-top:1px solid #aaa; margin-top:6px; padding-top:5px; display:flex; justify-content:space-between; font-size:9px; color:#555; }
        .legend { display:flex; gap:12px; flex-wrap:wrap; }
        .li { display:flex; align-items:center; gap:4px; font-size:9px; }
        .lb { display:inline-block; width:20px; height:3px; border-radius:1px; }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="title">CHAKBANDI GIS — ${mapData?.title || "Cadastral Map"}</div>
          <div style="font-size:10px;color:#444;margin-top:2px;">
            ${mapData?.village ? `Village: <b>${mapData.village}</b>` : ""}
            ${mapData?.tehsil ? ` | Sub Division: <b>${mapData.tehsil}</b>` : ""}
            ${mapData?.district ? ` | Division: <b>${mapData.district}</b>` : ""}
          </div>
        </div>
        <div style="font-size:10px;color:#555;text-align:right;">
          Status: <b>${(mapData?.status||"draft").toUpperCase()}</b><br/>
          Date: ${new Date().toLocaleDateString()}<br/>
          Parcels: ${mapData?.total_parcels || 0}
        </div>
      </div>
      <img class="map-img" src="${imgDataUrl}" />
      <div class="footer">
        <div class="legend">
          <div class="li"><span class="lb" style="background:#ef4444"></span>Mustateel/Muraba</div>
          <div class="li"><span class="lb" style="background:#eab308"></span>Acre</div>
          <div class="li"><span class="lb" style="background:#3b82f6"></span>Canal</div>
          <div class="li"><span class="lb" style="background:#22c55e"></span>Chakbandi</div>
          <div class="li"><span class="lb" style="background:#06b6d4"></span>Outlet</div>
        </div>
        <div>Survey-grade Cadastral | Chakbandi GIS | 1 Killa = 220×198 ft</div>
      </div>
    </body></html>`);
    win.document.close();
    win.onload = () => win.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1420] border border-slate-700 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Printer className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white font-heading tracking-wider">PRINT PREVIEW</span>
            <span className="text-xs text-slate-500">{mapData?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white"
                onClick={() => setScale(s => Math.max(25, s - 10))}><ZoomOut className="w-3 h-3" /></Button>
              <span className="text-xs text-slate-300 font-mono w-10 text-center">{scale}%</span>
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white"
                onClick={() => setScale(s => Math.min(200, s + 10))}><ZoomIn className="w-3 h-3" /></Button>
            </div>
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-white" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Settings */}
        <div className="flex items-center gap-5 px-5 py-2 bg-slate-900 border-b border-slate-700 flex-wrap">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono shrink-0">Print Settings</span>
          <SettingSlider label="Mustateel Border" value={printSettings.mustateelThickness} min={1} max={10} step={0.5} onChange={v => updatePS("mustateelThickness", v)} unit="px" />
          <SettingSlider label="Chakbandi Line" value={printSettings.chakbandiThickness} min={0.5} max={8} step={0.5} onChange={v => updatePS("chakbandiThickness", v)} unit="px" />
          <SettingSlider label="Killa Grid" value={Math.round(printSettings.killaGridOpacity * 100)} min={10} max={100} step={5} onChange={v => updatePS("killaGridOpacity", v / 100)} unit="%" />
          <SettingSlider label="Killa Width" value={printSettings.killaGridWidth} min={0.2} max={3} step={0.2} onChange={v => updatePS("killaGridWidth", v)} unit="px" />
          <span className="text-[9px] text-slate-500 ml-auto">Killa numbers always hidden in print</span>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex items-start justify-center">
          <div className="bg-white shadow-2xl" style={{ width: `${scale}%`, minWidth: 500 }}>
            <div style={{ padding:"10px 14px", borderBottom:"2px solid #000", display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:"bold", textTransform:"uppercase", letterSpacing:2 }}>
                  CHAKBANDI GIS — {mapData?.title || "Cadastral Map"}
                </div>
                <div style={{ fontSize:10, color:"#444", marginTop:2 }}>
                  {mapData?.village && `Village: ${mapData.village}`}
                  {mapData?.tehsil && ` | Sub Division: ${mapData.tehsil}`}
                  {mapData?.district && ` | Division: ${mapData.district}`}
                </div>
              </div>
              <div style={{ fontSize:10, color:"#555", textAlign:"right" }}>
                <div>Status: <b>{(mapData?.status||"draft").toUpperCase()}</b></div>
                <div>Date: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {dataUrl
              ? <img src={dataUrl} alt="Map" style={{ width:"100%", display:"block" }} />
              : <div style={{ padding:40, textAlign:"center", color:"#999" }}>No objects to print</div>
            }

            <div style={{ padding:"6px 14px", borderTop:"1px solid #bbb", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {[["Mustateel/Muraba","#ef4444"],["Acre","#eab308"],["Canal","#3b82f6"],["Chakbandi","#22c55e"],["Outlet","#06b6d4"]].map(([label,color]) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:4, fontSize:9, color:"#333" }}>
                    <span style={{ display:"inline-block", width:18, height:3, background:color, borderRadius:1 }}></span>{label}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:9, color:"#777" }}>Survey-grade Cadastral | Chakbandi GIS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}