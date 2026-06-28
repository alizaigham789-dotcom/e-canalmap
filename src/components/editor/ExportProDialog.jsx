import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Globe, Map, Table2, Image, X, Loader2 } from "lucide-react";

// ---- Helpers ----
function getObjectsBounds(objects) {
  if (!objects || objects.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of objects) {
    if (["acre", "mustateel", "muraba"].includes(o.type)) {
      minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.w); maxY = Math.max(maxY, o.y + o.h);
    } else if (o.points?.length > 0) {
      for (const p of o.points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

function getHighResCanvas(sourceCanvas, objects, zoom, pan, scale = 3) {
  if (!sourceCanvas) return null;
  const bounds = getObjectsBounds(objects);
  const pad = 60;
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

function downloadText(text, filename, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportProDialog({ open, onClose, mapData, objects, canvasRef, zoom, pan }) {
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!open) return null;

  const exportGeoJSON = () => {
    const features = objects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type)).map(o => ({
      type: "Feature",
      properties: { id: o.id, type: o.type, label: o.label || "", ownerName: o.ownerName || "" },
      geometry: { type: "Polygon", coordinates: [[[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h], [o.x, o.y]]] }
    }));
    downloadText(JSON.stringify({ type: "FeatureCollection", features }, null, 2), `${mapData?.title || "map"}.geojson`, "application/json");
    onClose();
  };

  const exportKML = () => {
    let placemarks = "";
    for (const o of objects) {
      if (["acre", "mustateel", "muraba"].includes(o.type)) {
        const coords = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h], [o.x, o.y]].map(c => `${c[0]},${c[1]},0`).join(" ");
        placemarks += `<Placemark><name>${o.label || o.type}</name><description>${o.ownerName || ""}</description><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
      }
    }
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${mapData?.title || "map"}</name>${placemarks}</Document></kml>`;
    downloadText(kml, `${mapData?.title || "map"}.kml`, "application/vnd.google-earth.kml+xml");
    onClose();
  };

  const exportPDFHighRes = async () => {
    setPdfLoading(true);
    try {
      const canvas = canvasRef?.current?.getCanvas?.();
      const hr = getHighResCanvas(canvas, objects, zoom, pan, 4);
      if (!hr) { alert("No canvas found"); return; }
      const imgData = hr.toDataURL("image/png");
      const w = window.open("", "_blank", "width=1200,height=900");
      if (!w) { alert("Popup blocked"); return; }
      w.document.write(`<!DOCTYPE html><html><head><title>${mapData?.title || "Map"} — PDF</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#fff;font-family:Arial,sans-serif;}
        .header{padding:6px 0 8px;border-bottom:2px solid #000;display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;}
        .title{font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;}
        .meta{font-size:9px;color:#444;text-align:right;}
        img{width:100%;height:auto;display:block;image-rendering:crisp-edges;}
        .footer{margin-top:6px;padding-top:5px;border-top:1px solid #ccc;display:flex;justify-content:space-between;font-size:8px;color:#555;}
      </style></head><body>
      <div class="header">
        <div>
          <div class="title">CHAKBANDI GIS — ${mapData?.title || "Cadastral Map"}</div>
          <div style="font-size:9px;margin-top:2px;">${mapData?.village ? `Village: ${mapData.village}` : ""} ${mapData?.district ? `| Division: ${mapData.district}` : ""}</div>
        </div>
        <div class="meta"><div>Status: ${(mapData?.status || "draft").toUpperCase()}</div><div>Date: ${new Date().toLocaleDateString()}</div><div>Parcels: ${mapData?.total_parcels || 0}</div></div>
      </div>
      <img src="${imgData}" />
      <div class="footer"><div>Survey-grade Cadastral Map — Chakbandi GIS System</div><div>1 Killa = 220×198 ft | Scale: Survey Grade</div></div>
      </body></html>`);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 800);
    } finally {
      setPdfLoading(false);
      onClose();
    }
  };

  const exportPNG = () => {
    const canvas = canvasRef?.current?.getCanvas?.();
    const hr = getHighResCanvas(canvas, objects, zoom, pan, 4);
    if (!hr) return;
    const a = document.createElement("a");
    a.href = hr.toDataURL("image/png");
    a.download = `${mapData?.title || "map"}_hires.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    onClose();
  };

  const EXPORTS = [
    { label: "PDF Download", desc: "High-res A4 landscape PDF", icon: Download, color: "text-blue-500", bg: "bg-blue-50", action: exportPDFHighRes, loading: pdfLoading },
    { label: "KML File", desc: "Google Earth / GIS compatible", icon: Map, color: "text-green-600", bg: "bg-green-50", action: exportKML },
    { label: "GeoJSON", desc: "Standard GIS vector format", icon: Globe, color: "text-emerald-500", bg: "bg-emerald-50", action: exportGeoJSON },
    { label: "PNG Image", desc: "High resolution raster (4×)", icon: Image, color: "text-purple-500", bg: "bg-purple-50", action: exportPNG },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-slate-800 font-heading">Extract / Export</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-2">
          {EXPORTS.map(({ label, desc, icon: Icon, color, bg, action, loading }) => (
            <button key={label} onClick={action} disabled={!!loading}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left disabled:opacity-60">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-[10px] text-slate-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}