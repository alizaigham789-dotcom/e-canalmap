import React, { useRef, useState, useMemo } from "react";
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

// Re-render all objects onto a fresh canvas at a chosen scale — gives crisp print quality
function renderObjectsToCanvas(objects, colorSettings, killaNumbersGlobal, killaVisibility, printScale = 2) {
  const bounds = getObjectsBounds(objects);
  if (!bounds) return null;

  const pad = 60;
  const worldW = bounds.maxX - bounds.minX + pad * 2;
  const worldH = bounds.maxY - bounds.minY + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(worldW * printScale);
  canvas.height = Math.ceil(worldH * printScale);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Translate so world origin is at top-left with padding
  ctx.save();
  ctx.translate((pad - bounds.minX) * printScale, (pad - bounds.minY) * printScale);
  ctx.scale(printScale, printScale);

  // Use zoom=1 for print — font sizes will be world-unit based
  const zoom = 1;
  const C = colorSettings || {};

  const kv = {
    mustateel: (killaVisibility?.mustateel !== false) && killaNumbersGlobal,
    muraba: (killaVisibility?.muraba !== false) && killaNumbersGlobal,
  };

  const sorted = [...objects].sort((a, b) => DRAW_ORDER.indexOf(a.type) - DRAW_ORDER.indexOf(b.type));

  for (const obj of sorted) {
    if (obj.type === "acre") drawAcre(ctx, obj, false, zoom, C);
    else if (obj.type === "mustateel") drawMustateel(ctx, obj, false, zoom, C, obj.showKillaNumbers !== false && kv.mustateel);
    else if (obj.type === "muraba") drawMuraba(ctx, obj, false, zoom, C, obj.showKillaNumbers !== false && kv.muraba);
    else if (obj.type === "canal") drawCanal(ctx, obj, false, zoom, C);
    else if (obj.type === "khal") drawKhal(ctx, obj, false, zoom, C);
    else if (obj.type === "road") drawRoad(ctx, obj, false, zoom, C);
    else if (obj.type === "outlet") drawOutlet(ctx, obj, false, zoom, C);
    else if (obj.type === "chakbandi") drawChakbandi(ctx, obj, false, zoom, C, true);
    else if (obj.type === "mouza") drawMouza(ctx, obj, false, zoom, C);
    else if (obj.type === "damageMarker") drawDamageMarker(ctx, obj, false, zoom);
  }

  ctx.restore();
  return canvas;
}

export default function PrintPreview({ mapData, objects, colorSettings, killaNumbersGlobal = true, killaVisibility, onClose }) {
  const [scale, setScale] = useState(100);

  const printCanvas = useMemo(() => {
    return renderObjectsToCanvas(objects, colorSettings, killaNumbersGlobal, killaVisibility, 2);
  }, [objects, colorSettings, killaNumbersGlobal, killaVisibility]);

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

        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex items-start justify-center">
          <div className="bg-white shadow-2xl" style={{ width: `${scale}%`, minWidth: 400 }}>
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