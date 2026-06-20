import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, ZoomIn, ZoomOut } from "lucide-react";

export default function PrintPreview({ mapData, canvasRef, onClose }) {
  const [scale, setScale] = useState(100);

  const handlePrint = () => {
    const canvas = canvasRef?.current?.getCanvas?.();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
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
            .map-img { width: 100%; height: auto; border: 1px solid #999; display: block; }
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
                ${mapData?.tehsil ? ` | Tehsil: <b>${mapData.tehsil}</b>` : ""}
                ${mapData?.district ? ` | District: <b>${mapData.district}</b>` : ""}
              </div>
            </div>
            <div class="meta">
              <div>Status: <b>${(mapData?.status || "draft").toUpperCase()}</b></div>
              <div>Printed: ${new Date().toLocaleDateString()}</div>
              <div>Parcels: ${mapData?.total_parcels || 0}</div>
            </div>
          </div>
          <img class="map-img" src="${dataUrl}" />
          <div class="footer">
            <div>
              <div class="legend-row">
                <div class="legend-item"><span class="legend-box" style="background:#ef4444;height:3px;"></span>Mustateel/Muraba (Red)</div>
                <div class="legend-item"><span class="legend-box" style="background:#eab308;height:2px;"></span>Acre (Yellow)</div>
                <div class="legend-item"><span class="legend-box" style="background:#3b82f6;height:2px;"></span>Canal (Blue)</div>
                <div class="legend-item"><span class="legend-box" style="background:#22c55e;height:3px;"></span>Chakbandi (Green)</div>
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

  const canvas = canvasRef?.current?.getCanvas?.();
  const dataUrl = canvas ? canvas.toDataURL("image/png") : null;

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
            {/* Scale control */}
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

        {/* Preview area */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6">
          <div className="mx-auto bg-white shadow-2xl"
            style={{ width: `${scale}%`, minWidth: 400 }}>
            {/* Paper header */}
            <div style={{ padding: "12px 16px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: "bold", fontFamily: "serif", textTransform: "uppercase", letterSpacing: 2, color: "#000" }}>
                  CHAKBANDI GIS — {mapData?.title || "Cadastral Survey Map"}
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                  {mapData?.village && `Village: ${mapData.village}`}
                  {mapData?.tehsil && ` | Tehsil: ${mapData.tehsil}`}
                  {mapData?.district && ` | District: ${mapData.district}`}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#555", textAlign: "right" }}>
                <div>Status: <b>{(mapData?.status || "draft").toUpperCase()}</b></div>
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>Parcels: {mapData?.total_parcels || 0}</div>
              </div>
            </div>

            {/* Map image */}
            {dataUrl && (
              <img src={dataUrl} alt="Map" style={{ width: "100%", display: "block", borderBottom: "1px solid #ccc" }} />
            )}

            {/* Footer with legend */}
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