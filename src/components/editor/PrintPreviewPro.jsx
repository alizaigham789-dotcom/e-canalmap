import React, { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, ZoomIn, ZoomOut } from "lucide-react";

function getObjectsBounds(objects) {
  if (!objects || objects.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.w); maxY = Math.max(maxY, o.y + o.h);
    } else if (o.points?.length > 0) {
      for (const p of o.points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    } else if (o.start && o.end) {
      minX = Math.min(minX, o.start.x, o.end.x); minY = Math.min(minY, o.start.y, o.end.y);
      maxX = Math.max(maxX, o.start.x, o.end.x); maxY = Math.max(maxY, o.start.y, o.end.y);
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

// High-res crop with 4× scale for crisp print output
function getHighResCanvas(sourceCanvas, objects, zoom, pan, scale = 4) {
  if (!sourceCanvas) return null;
  const bounds = getObjectsBounds(objects);
  const pad = 50;
  const sx1 = bounds ? Math.max(0, bounds.minX * zoom + pan.x - pad) : 0;
  const sy1 = bounds ? Math.max(0, bounds.minY * zoom + pan.y - pad) : 0;
  const sx2 = bounds ? Math.min(sourceCanvas.width, bounds.maxX * zoom + pan.x + pad) : sourceCanvas.width;
  const sy2 = bounds ? Math.min(sourceCanvas.height, bounds.maxY * zoom + pan.y + pad) : sourceCanvas.height;
  const cropW = Math.max(10, sx2 - sx1);
  const cropH = Math.max(10, sy2 - sy1);

  const out = document.createElement("canvas");
  out.width = Math.ceil(cropW * scale);
  out.height = Math.ceil(cropH * scale);
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.scale(scale, scale);
  ctx.drawImage(sourceCanvas, sx1, sy1, cropW, cropH, 0, 0, cropW, cropH);
  return out;
}

export default function PrintPreviewPro({ mapData, canvasRef, objects, zoom, pan, onClose }) {
  const [scale, setScale] = useState(100);

  const { hrCanvas, dataUrl } = useMemo(() => {
    const canvas = canvasRef?.current?.getCanvas?.();
    if (!canvas) return { hrCanvas: null, dataUrl: null };
    const hr = getHighResCanvas(canvas, objects, zoom, pan, 4);
    return { hrCanvas: hr, dataUrl: hr ? hr.toDataURL("image/png") : null };
  }, [objects, zoom, pan, canvasRef]);

  const handlePrint = () => {
    if (!hrCanvas) return;
    const imgDataUrl = hrCanvas.toDataURL("image/png");
    const w = window.open("", "_blank", "width=1400,height=1000");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head>
      <title>${mapData?.title || "Chakbandi Map"} — Print</title>
      <style>
        @page { margin: 8mm; size: A4 landscape; }
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#fff;font-family:Arial,sans-serif;}
        .header{border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end;}
        .title{font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;}
        .meta{font-size:9px;color:#444;text-align:right;}
        img{width:100%;height:auto;display:block;border:1px solid #aaa;image-rendering:crisp-edges;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        @media print { @page { size: A4 landscape; margin: 8mm; } html,body{width:100%;} }
        .footer{border-top:1px solid #aaa;margin-top:6px;padding-top:5px;display:flex;justify-content:space-between;font-size:8px;color:#555;}
        .legend-row{display:flex;gap:14px;font-size:8px;margin-top:3px;flex-wrap:wrap;}
        .legend-item{display:flex;align-items:center;gap:4px;}
        .lb{width:22px;height:3px;display:inline-block;border-radius:1px;}
      </style></head><body>
      <div class="header">
        <div>
          <div class="title">CHAKBANDI GIS — ${mapData?.title || "Cadastral Survey Map"}</div>
          <div style="font-size:9px;margin-top:2px;">
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
      <img src="${imgDataUrl}" />
      <div class="footer">
        <div>
          <div class="legend-row">
            <div class="legend-item"><span class="lb" style="background:#ef4444;"></span>Mustateel/Muraba</div>
            <div class="legend-item"><span class="lb" style="background:#999;"></span>Acre (Killa)</div>
            <div class="legend-item"><span class="lb" style="background:#2563eb;"></span>Canal</div>
            <div class="legend-item"><span class="lb" style="background:#16a34a;"></span>Chakbandi</div>
            <div class="legend-item"><span class="lb" style="background:#0891b2;"></span>Outlet</div>
          </div>
        </div>
        <div style="text-align:right;">Survey-grade Cadastral Map — Chakbandi GIS System<br/>1 Killa = 220×198 ft | Scale: Survey Grade</div>
      </div>
    </body></html>`);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1420] border border-slate-700 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[95vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Printer className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-white font-heading tracking-wider">PRINT PREVIEW — HIGH QUALITY</span>
            <span className="text-xs text-slate-500">{mapData?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white" onClick={() => setScale(s => Math.max(25, s - 10))}>
                <ZoomOut className="w-3 h-3" />
              </Button>
              <span className="text-xs text-slate-300 font-mono w-10 text-center">{scale}%</span>
              <Button variant="ghost" size="icon" className="w-6 h-6 text-slate-400 hover:text-white" onClick={() => setScale(s => Math.min(200, s + 10))}>
                <ZoomIn className="w-3 h-3" />
              </Button>
            </div>
            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-500 text-white text-xs gap-1" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-white" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex items-start justify-center">
          <div className="bg-white shadow-2xl" style={{ width: `${scale}%`, minWidth: 400 }}>
            <div style={{ padding: "10px 14px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2, color: "#000" }}>
                  CHAKBANDI GIS — {mapData?.title || "Cadastral Survey Map"}
                </div>
                <div style={{ fontSize: 9, color: "#444", marginTop: 2 }}>
                  {mapData?.village && `Village: ${mapData.village}`}
                  {mapData?.tehsil && ` | Sub Division: ${mapData.tehsil}`}
                  {mapData?.district && ` | Division: ${mapData.district}`}
                </div>
              </div>
              <div style={{ fontSize: 9, color: "#555", textAlign: "right" }}>
                <div>Status: <b>{(mapData?.status || "draft").toUpperCase()}</b></div>
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Parcels: {mapData?.total_parcels || 0}</div>
              </div>
            </div>

            {dataUrl && <img src={dataUrl} alt="Map" style={{ width: "100%", display: "block", borderBottom: "1px solid #ccc", imageRendering: "crisp-edges" }} />}

            <div style={{ padding: "6px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { label: "Mustateel/Muraba", color: "#ef4444" },
                  { label: "Acre (Killa)", color: "#999" },
                  { label: "Canal", color: "#2563eb" },
                  { label: "Chakbandi", color: "#16a34a" },
                  { label: "Outlet", color: "#0891b2" },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8, color: "#333" }}>
                    <span style={{ display: "inline-block", width: 18, height: 3, background: color, borderRadius: 1 }}></span>
                    {label}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 8, color: "#666" }}>Survey-grade Cadastral | Chakbandi GIS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}