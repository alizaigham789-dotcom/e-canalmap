import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, ZoomIn, ZoomOut } from "lucide-react";
import {
  drawAcre, drawMustateel, drawMuraba, drawCanal, drawKhal, drawRoad,
  drawOutlet, drawChakbandi, drawMouza, drawDamageMarker,
} from "@/components/editor/GISRenderer";

const DRAW_ORDER = ["mouza", "muraba", "mustateel", "acre", "road", "canal", "khal", "chakbandi", "outlet", "damageMarker"];

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

// Re-render all objects onto a fresh canvas — print-optimised thick lines, no killa numbers
function renderObjectsToCanvas(objects, colorSettings, printSettings, printScale = 3) {
  const bounds = getObjectsBounds(objects);
  if (!bounds) return null;

  const pad = 80;
  const worldW = bounds.maxX - bounds.minX + pad * 2;
  const worldH = bounds.maxY - bounds.minY + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(worldW * printScale);
  canvas.height = Math.ceil(worldH * printScale);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate((pad - bounds.minX) * printScale, (pad - bounds.minY) * printScale);
  ctx.scale(printScale, printScale);

  // zoom=1 means lineWidth values from renderer are in world units.
  // We use a "print zoom" concept: dividing by zoom makes lines THICKER when zoom is small.
  // Use zoom=0.15 so all /zoom divisions produce thick, print-visible lines.
  const zoom = 0.15;
  const C = colorSettings || {};
  const ps = printSettings || {};

  // Override mustateel/muraba boundary thickness via patched objects
  const mustThick = ps.mustateelThickness || 6;   // world-unit line width at zoom=0.15
  const chakThick = ps.chakbandiThickness || 5;
  const killaOpacity = ps.killaGridOpacity || 0.55;
  const killaWidth = ps.killaGridWidth || 1.2;

  const sorted = [...objects].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));

  for (const obj of sorted) {
    if (obj.type === "acre") {
      drawAcre(ctx, obj, false, zoom, C);
    } else if (obj.type === "mustateel") {
      // patch killaStyle for print: thicker grid lines, more opaque
      const patched = {
        ...obj,
        killaStyle: {
          ...(obj.killaStyle || {}),
          strokeOpacity: killaOpacity,
          strokeWidth: killaWidth,
          strokeStyle: "solid",
        },
        showKillaNumbers: false, // always hide killa numbers in print
        _printBorderWidth: mustThick,
      };
      drawMustateelPrint(ctx, patched, zoom, C);
    } else if (obj.type === "muraba") {
      const patched = {
        ...obj,
        killaStyle: {
          ...(obj.killaStyle || {}),
          strokeOpacity: killaOpacity,
          strokeWidth: killaWidth,
          strokeStyle: "solid",
        },
        showKillaNumbers: false,
        _printBorderWidth: mustThick + 2,
      };
      drawMurabaPrint(ctx, patched, zoom, C);
    } else if (obj.type === "canal") {
      drawCanal(ctx, obj, false, zoom, C);
    } else if (obj.type === "khal") {
      drawKhal(ctx, obj, false, zoom, C);
    } else if (obj.type === "road") {
      drawRoad(ctx, obj, false, zoom, C);
    } else if (obj.type === "outlet") {
      drawOutlet(ctx, obj, false, zoom, C);
    } else if (obj.type === "chakbandi") {
      // force cross + thick line for print
      const patched = { ...obj, crossPattern: true, _printLineWidth: chakThick };
      drawChakbandiPrint(ctx, patched, zoom, C);
    } else if (obj.type === "mouza") {
      drawMouza(ctx, obj, false, zoom, C);
    } else if (obj.type === "damageMarker") {
      drawDamageMarker(ctx, obj, false, zoom);
    }
  }

  ctx.restore();
  return canvas;
}

// Print-specific mustateel: thick outer border + visible killa grid, no numbers
function drawMustateelPrint(ctx, obj, zoom, C) {
  const ks = obj.killaStyle || {};
  const borderW = obj._printBorderWidth || 6;

  // Fill
  ctx.fillStyle = obj.fillColor || C.mustateelFill || "rgba(245,158,11,0.08)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);

  // Thick outer boundary
  ctx.strokeStyle = C.mustateelStroke || "#ef4444";
  ctx.lineWidth = borderW / zoom;
  ctx.lineJoin = "miter";
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // Killa grid — solid, clear lines
  const alpha = ks.strokeOpacity || 0.55;
  const ksColor = ks.strokeColor || "#ef4444";
  const rgb = hexToRgbStr(ksColor);
  ctx.strokeStyle = `rgba(${rgb},${alpha})`;
  ctx.lineWidth = (ks.strokeWidth || 1.2) / zoom;
  ctx.setLineDash([]);
  const cellW = obj.w / 2, cellH = obj.h / 5;
  ctx.beginPath();
  ctx.moveTo(obj.x + cellW, obj.y); ctx.lineTo(obj.x + cellW, obj.y + obj.h);
  for (let r = 1; r < 5; r++) {
    ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH);
  }
  ctx.stroke();

  // Center label
  if (obj.label) {
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x, obj.y, obj.w, obj.h); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    const maxFont = Math.min(obj.w, obj.h) * 0.38;
    ctx.font = `900 ${maxFont}px Rajdhani, Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
    ctx.restore();
  }
}

function drawMurabaPrint(ctx, obj, zoom, C) {
  const ks = obj.killaStyle || {};
  const borderW = obj._printBorderWidth || 8;

  ctx.fillStyle = obj.fillColor || C.murabaFill || "rgba(249,115,22,0.08)";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);

  ctx.strokeStyle = C.murabaStroke || "#ef4444";
  ctx.lineWidth = borderW / zoom;
  ctx.lineJoin = "miter";
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  const alpha = ks.strokeOpacity || 0.55;
  const ksColor = ks.strokeColor || "#ef4444";
  const rgb = hexToRgbStr(ksColor);
  ctx.strokeStyle = `rgba(${rgb},${alpha})`;
  ctx.lineWidth = (ks.strokeWidth || 1.2) / zoom;
  ctx.setLineDash([]);
  const cellW = obj.w / 5, cellH = obj.h / 5;
  ctx.beginPath();
  for (let c = 1; c < 5; c++) { ctx.moveTo(obj.x + c * cellW, obj.y); ctx.lineTo(obj.x + c * cellW, obj.y + obj.h); }
  for (let r = 1; r < 5; r++) { ctx.moveTo(obj.x, obj.y + r * cellH); ctx.lineTo(obj.x + obj.w, obj.y + r * cellH); }
  ctx.stroke();

  if (obj.label) {
    ctx.save();
    ctx.beginPath(); ctx.rect(obj.x, obj.y, obj.w, obj.h); ctx.clip();
    ctx.fillStyle = C.labelColor || "#1e293b";
    const maxFont = Math.min(obj.w, obj.h) * 0.30;
    ctx.font = `900 ${maxFont}px Rajdhani, Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y + obj.h / 2);
    ctx.restore();
  }
}

// Print chakbandi: ALWAYS shows thick line + crosses
function drawChakbandiPrint(ctx, obj, zoom, C) {
  if (!obj.points || obj.points.length < 2) return;
  const color = C.chakbandiStroke || "#22c55e";
  const lineW = (obj._printLineWidth || 5) / zoom;
  const crossSize = 8 / zoom;
  const spacing = 18 / zoom;

  // Main line
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(obj.points[0].x, obj.points[0].y);
  for (const p of obj.points) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Crosses overlay
  ctx.strokeStyle = color;
  ctx.lineWidth = (lineW * 0.55);
  ctx.lineCap = "round";
  for (let i = 0; i < obj.points.length - 1; i++) {
    const a = obj.points[i], b = obj.points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.floor(segLen / spacing));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t;
      ctx.beginPath();
      ctx.moveTo(cx - crossSize, cy - crossSize); ctx.lineTo(cx + crossSize, cy + crossSize);
      ctx.moveTo(cx + crossSize, cy - crossSize); ctx.lineTo(cx - crossSize, cy + crossSize);
      ctx.stroke();
    }
  }
}

function hexToRgbStr(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "239,68,68";
}

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

export default function PrintPreview({ mapData, objects, colorSettings, onClose }) {
  const [scale, setScale] = useState(100);
  const [printSettings, setPrintSettings] = useState({
    mustateelThickness: 6,
    chakbandiThickness: 5,
    killaGridOpacity: 0.55,
    killaGridWidth: 1.2,
  });

  const updatePS = (key, val) => setPrintSettings(prev => ({ ...prev, [key]: val }));

  const printCanvas = useMemo(() => {
    return renderObjectsToCanvas(objects, colorSettings, printSettings, 3);
  }, [objects, colorSettings, printSettings]);

  const dataUrl = printCanvas ? printCanvas.toDataURL("image/png") : null;

  const handlePrint = () => {
    if (!printCanvas) return;
    const imgDataUrl = printCanvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${mapData?.title || "Chakbandi Map"} - Print</title>
          <style>
            @page { margin: 10mm; size: A4 landscape; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: white; font-family: 'Rajdhani', Arial, sans-serif; }
            .header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
            .meta { font-size: 10px; color: #444; text-align: right; }
            .map-img { max-width: 100%; max-height: 70vh; height: auto; border: 1px solid #999; display: block; margin: 0 auto; object-fit: contain; }
            .footer { border-top: 1px solid #999; margin-top: 8px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9px; color: #555; }
            .legend-row { display: flex; gap: 16px; font-size: 9px; margin-top: 6px; flex-wrap: wrap; }
            .legend-item { display: flex; align-items: center; gap: 5px; }
            .legend-box { width: 24px; height: 3px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">CHAKBANDI GIS — ${mapData?.title || "Cadastral Survey Map"}</div>
              <div style="font-size:11px; margin-top:3px;">
                ${mapData?.village ? `Village: <b>${mapData.village}</b>` : ""}
                ${mapData?.tehsil ? ` | Sub Division: <b>${mapData.tehsil}</b>` : ""}
                ${mapData?.district ? ` | Division: <b>${mapData.district}</b>` : ""}
              </div>
            </div>
            <div class="meta">
              <div>Status: <b>${(mapData?.status || "draft").toUpperCase()}</b></div>
              <div>Printed: ${new Date().toLocaleDateString()}</div>
              <div>Parcels: ${mapData?.total_parcels || 0}</div>
            </div>
          </div>
          <img class="map-img" src="${imgDataUrl}" />
          <div class="footer">
            <div>
              <div class="legend-row">
                <div class="legend-item"><span class="legend-box" style="background:#ef4444;height:3px;"></span>Mustateel/Muraba (Red)</div>
                <div class="legend-item"><span class="legend-box" style="background:#eab308;height:2px;"></span>Acre (Yellow)</div>
                <div class="legend-item"><span class="legend-box" style="background:#3b82f6;height:2px;"></span>Canal (Blue)</div>
                <div class="legend-item" style="display:flex;align-items:center;gap:5px;"><svg width="30" height="10" viewBox="0 0 30 10"><line x1="0" y1="5" x2="30" y2="5" stroke="#22c55e" stroke-width="2"/><line x1="7" y1="1" x2="7" y2="9" stroke="#22c55e" stroke-width="1.5"/><line x1="15" y1="1" x2="15" y2="9" stroke="#22c55e" stroke-width="1.5"/><line x1="23" y1="1" x2="23" y2="9" stroke="#22c55e" stroke-width="1.5"/></svg>Chakbandi (Green)</div>
                <div class="legend-item"><span class="legend-box" style="background:#06b6d4;height:2px;"></span>Outlet</div>
              </div>
            </div>
            <div style="text-align:right;">Survey-grade Cadastral Map — Chakbandi GIS System<br/>1 Killa = 220×198 ft | Scale: Survey Grade</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1420] border border-slate-700 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[95vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Printer className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white font-heading tracking-wider">PRINT PREVIEW</span>
            <span className="text-xs text-slate-500">{mapData?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white"
                onClick={() => setScale(s => Math.max(25, s - 10))}>
                <ZoomOut className="w-3 h-3" />
              </Button>
              <span className="text-xs text-slate-300 font-mono w-10 text-center">{scale}%</span>
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white"
                onClick={() => setScale(s => Math.min(200, s + 10))}>
                <ZoomIn className="w-3 h-3" />
              </Button>
            </div>
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1"
              onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-white"
              onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Print Settings Panel */}
        <div className="flex items-center gap-6 px-5 py-2 bg-slate-900 border-b border-slate-700 flex-wrap">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Print Settings</span>
          <SettingSlider label="Mustateel Border" value={printSettings.mustateelThickness} min={2} max={16} step={1} onChange={v => updatePS("mustateelThickness", v)} />
          <SettingSlider label="Chakbandi Line" value={printSettings.chakbandiThickness} min={1} max={12} step={1} onChange={v => updatePS("chakbandiThickness", v)} />
          <SettingSlider label="Killa Grid Opacity" value={Math.round(printSettings.killaGridOpacity * 100)} min={10} max={100} step={5} onChange={v => updatePS("killaGridOpacity", v / 100)} unit="%" />
          <SettingSlider label="Killa Grid Width" value={printSettings.killaGridWidth} min={0.5} max={4} step={0.5} onChange={v => updatePS("killaGridWidth", v)} unit="px" />
          <div className="text-[9px] text-slate-500 ml-auto">Killa numbers always hidden in print</div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex items-start justify-center">
          <div className="bg-white shadow-2xl" style={{ width: `${scale}%`, minWidth: 500 }}>
            <div style={{ padding: "12px 16px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: "bold", fontFamily: "serif", textTransform: "uppercase", letterSpacing: 2, color: "#000" }}>
                  CHAKBANDI GIS — {mapData?.title || "Cadastral Survey Map"}
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                  {mapData?.village && `Village: ${mapData.village}`}
                  {mapData?.tehsil && ` | Sub Division: ${mapData.tehsil}`}
                  {mapData?.district && ` | Division: ${mapData.district}`}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#555", textAlign: "right" }}>
                <div>Status: <b>{(mapData?.status || "draft").toUpperCase()}</b></div>
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Parcels: {mapData?.total_parcels || 0}</div>
              </div>
            </div>

            {dataUrl && (
              <img src={dataUrl} alt="Map" style={{ width: "100%", display: "block", borderBottom: "1px solid #ccc" }} />
            )}
            {!dataUrl && (
              <div style={{ padding: 40, textAlign: "center", color: "#999" }}>No objects to print</div>
            )}

            <div style={{ padding: "8px 16px", borderTop: "1px solid #999", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {[
                  { label: "Mustateel/Muraba", color: "#ef4444" },
                  { label: "Acre (Killa)", color: "#eab308" },
                  { label: "Canal", color: "#3b82f6" },
                  { label: "Chakbandi", color: "#22c55e" },
                  { label: "Outlet", color: "#06b6d4" },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#333" }}>
                    <span style={{ display: "inline-block", width: 20, height: 3, background: color, borderRadius: 1 }}></span>
                    {label}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "#666", textAlign: "right" }}>
                Survey-grade Cadastral | Chakbandi GIS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}