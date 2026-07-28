import React, { useState, useMemo, useRef, useCallback } from "react";
import { X, Download, FileImage, FileText, FileType2, Loader2 } from "lucide-react";
import { buildSVG } from "@/lib/svgMapBuilder";

// ─── SVG → Canvas renderer (for PNG / PDF) ─────────────────────────
function renderSVGtoCanvas(svgString, width, height) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

const PAGE_SIZES = {
  a4: { w: 595, h: 842 },
  a3: { w: 842, h: 1191 },
  legal: { w: 612, h: 1008 },
  letter: { w: 612, h: 792 },
};

export default function GeoMapExportDialog({
  open,
  onClose,
  mapData,
  objects,
  colorSettings,
  selectedMoga,
  killaVisibility,
  overlayReady,
  onCaptureSatellite,
}) {
  const [format, setFormat] = useState("png");
  const [bwMode, setBwMode] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [showKilla, setShowKilla] = useState(true);
  const [mogaFilter, setMogaFilter] = useState(selectedMoga || "");
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("landscape");
  const [exporting, setExporting] = useState(false);

  // Available mogas from objects
  const availableMogas = useMemo(() => {
    const s = new Set();
    for (const o of objects || []) {
      if ((o.type === "chakbandi" || o.type === "mustateel") && o.mogaNumber) s.add(o.mogaNumber);
    }
    return [...s].sort((a, b) => parseInt(a) - parseInt(b));
  }, [objects]);

  // B&W color override
  const effectiveColors = useMemo(() => {
    if (!bwMode) return colorSettings || {};
    return {
      mustateelStroke: "#000000", mustateelFill: "none",
      murabaStroke: "#000000", murabaFill: "none",
      acreStroke: "#555555", acreFill: "none",
      canalStroke: "#333333", canalFill: "rgba(0,0,0,0.08)",
      khalStroke: "#444444",
      watercourseStroke: "#444444",
      roadStroke: "#222222",
      chakbandiStroke: "#000000",
      mouzaStroke: "#000000",
      labelColor: "#000000",
      outletStroke: "#333333",
    };
  }, [bwMode, colorSettings]);

  const kv = { mustateel: showKilla, muraba: showKilla, ...killaVisibility };

  const svgData = useMemo(() => {
    if (!objects || objects.length === 0) return null;
    return buildSVG(objects, effectiveColors, mogaFilter || null, kv);
  }, [objects, effectiveColors, mogaFilter, showKilla]);

  const svgString = useMemo(() => {
    if (!svgData) return null;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}"
     width="${svgData.viewW}" height="${svgData.viewH}">
  <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
  ${svgData.svgBody}
</svg>`;
  }, [svgData]);

  const baseName = (mapData?.title || "geomap").replace(/[^a-zA-Z0-9_-]/g, "_");

  // ─── Download handlers ──────────────────────────────────────────
  const handleDownloadSVG = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}${mogaFilter ? `_moga_${mogaFilter}` : ""}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    setExporting(true);
    try {
      let canvas;
      if (satellite && overlayReady && onCaptureSatellite) {
        canvas = await onCaptureSatellite({ bw: bwMode });
      } else {
        if (!svgData) { setExporting(false); return; }
        const targetW = 2400;
        const scale = targetW / svgData.viewW;
        const w = Math.round(svgData.viewW * scale);
        const h = Math.round(svgData.viewH * scale);
        canvas = await renderSVGtoCanvas(svgString, w, h);
      }
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}${mogaFilter ? `_moga_${mogaFilter}` : ""}${satellite ? "_satellite" : ""}.png`;
      a.click();
    } catch (e) {
      alert("PNG export failed: " + (e.message || "unknown error"));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const page = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
      const isLandscape = orientation === "landscape";
      const pageW = isLandscape ? page.h : page.w;
      const pageH = isLandscape ? page.w : page.h;
      const margin = 24;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2 - 40; // space for title

      let canvas;
      let drawW, drawH;
      if (satellite && overlayReady && onCaptureSatellite) {
        canvas = await onCaptureSatellite({ bw: bwMode });
        const aspect = canvas.width / canvas.height;
        drawW = availW; drawH = availW / aspect;
        if (drawH > availH) { drawH = availH; drawW = availH * aspect; }
      } else {
        if (!svgData) { setExporting(false); return; }
        const aspect = svgData.viewW / svgData.viewH;
        drawW = availW; drawH = availW / aspect;
        if (drawH > availH) { drawH = availH; drawW = availH * aspect; }
        const renderW = Math.round(drawW * 3);
        const renderH = Math.round(drawH * 3);
        canvas = await renderSVGtoCanvas(svgString, renderW, renderH);
      }
      const imgData = canvas.toDataURL("image/png");

      const doc = new jsPDF({ orientation, unit: "pt", format: pageSize });
      const x = (pageW - drawW) / 2;
      const y = 30;
      // Title
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text(mapData?.title || "GeoMap Export", pageW / 2, 18, { align: "center" });
      // Village / moga info
      if (mapData?.village || mogaFilter) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        const info = [mapData?.village, mogaFilter ? `Moga ${mogaFilter}` : ""].filter(Boolean).join(" · ");
        doc.text(info, pageW / 2, 28, { align: "center" });
      }
      doc.addImage(imgData, "PNG", x, y, drawW, drawH);
      doc.save(`${baseName}${mogaFilter ? `_moga_${mogaFilter}` : ""}${satellite ? "_satellite" : ""}.pdf`);
    } catch (e) {
      alert("PDF export failed: " + (e.message || "unknown error"));
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (format === "svg") handleDownloadSVG();
    else if (format === "png") handleDownloadPNG();
    else if (format === "pdf") handleDownloadPDF();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full h-full sm:w-auto sm:max-w-4xl sm:max-h-[95vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 h-12 bg-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white tracking-wide">GeoMap Export</span>
            <span className="text-xs text-slate-400 hidden sm:inline ml-2">{mapData?.title}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left: Preview */}
          <div className="flex-1 min-h-0 bg-slate-100 overflow-auto p-3 sm:p-4 max-h-[40vh] sm:max-h-none">
            {svgData ? (
              <div className="flex items-center justify-center min-h-full">
                <div
                  className="bg-white shadow-lg border border-slate-200"
                  dangerouslySetInnerHTML={{
                    __html: `<svg xmlns="http://www.w3.org/2000/svg"
                      viewBox="${svgData.viewX} ${svgData.viewY} ${svgData.viewW} ${svgData.viewH}"
                      style="max-width:100%;max-height:60vh;width:auto;height:auto;display:block;">
                      <rect x="${svgData.viewX}" y="${svgData.viewY}" width="${svgData.viewW}" height="${svgData.viewH}" fill="white"/>
                      ${svgData.svgBody}
                    </svg>`,
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No map data to preview
              </div>
            )}
          </div>

          {/* Right: Options */}
          <div className="sm:w-64 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 p-3 sm:p-4 space-y-3 overflow-y-auto bg-white">
            {/* Format */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Download Format</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => setFormat("png")} className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all ${format === "png" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <FileImage className="w-5 h-5 text-blue-500" />
                  <span className="text-[10px] font-bold text-slate-600">PNG</span>
                </button>
                <button onClick={() => setFormat("pdf")} className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all ${format === "pdf" ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <FileText className="w-5 h-5 text-red-500" />
                  <span className="text-[10px] font-bold text-slate-600">PDF</span>
                </button>
                <button onClick={() => setFormat("svg")} className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all ${format === "svg" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <FileType2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-600">SVG</span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showKilla} onChange={(e) => setShowKilla(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                <span className="text-xs text-slate-600 font-medium">Killa Numbers & Grid</span>
              </label>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Colour Mode</label>
                <div className="flex gap-1.5">
                  <button onClick={() => setBwMode(false)} className={`flex-1 h-8 text-xs rounded-lg border ${!bwMode ? "border-blue-500 bg-blue-50 text-blue-600 font-bold" : "border-slate-200 text-slate-500"}`}>Colour</button>
                  <button onClick={() => setBwMode(true)} className={`flex-1 h-8 text-xs rounded-lg border ${bwMode ? "border-slate-500 bg-slate-100 text-slate-700 font-bold" : "border-slate-200 text-slate-500"}`}>Black & White</button>
                </div>
              </div>
              {overlayReady && onCaptureSatellite && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={satellite} onChange={(e) => setSatellite(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                  <span className="text-xs text-slate-600 font-medium">Satellite / Earth background</span>
                </label>
              )}
            </div>

            {/* Moga filter */}
            {availableMogas.length > 0 && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Moga Filter</label>
                <select
                  value={mogaFilter}
                  onChange={(e) => setMogaFilter(e.target.value)}
                  className="w-full h-8 text-xs border border-slate-300 rounded-lg px-2 bg-white"
                >
                  <option value="">All Mogas</option>
                  {availableMogas.map(m => <option key={m} value={m}>Moga {m}</option>)}
                </select>
              </div>
            )}

            {/* Page size (PDF only) */}
            {format === "pdf" && (
              <>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Page Size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    className="w-full h-8 text-xs border border-slate-300 rounded-lg px-2 bg-white"
                  >
                    <option value="a4">A4</option>
                    <option value="a3">A3</option>
                    <option value="legal">Legal</option>
                    <option value="letter">Letter</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Orientation</label>
                  <div className="flex gap-1.5">
                    <button onClick={() => setOrientation("landscape")} className={`flex-1 h-8 text-xs rounded-lg border ${orientation === "landscape" ? "border-blue-500 bg-blue-50 text-blue-600 font-bold" : "border-slate-200 text-slate-500"}`}>Landscape</button>
                    <button onClick={() => setOrientation("portrait")} className={`flex-1 h-8 text-xs rounded-lg border ${orientation === "portrait" ? "border-blue-500 bg-blue-50 text-blue-600 font-bold" : "border-slate-200 text-slate-500"}`}>Portrait</button>
                  </div>
                </div>
              </>
            )}

            {/* Info */}
            <div className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
              Includes: mustateel/muraba boundaries, killa grid & numbers, canals, watercourse, moga outlets, chakbandi lines, mouza boundaries, roads.
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={exporting || !svgData}
              className={`w-full h-10 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${exporting ? "bg-slate-300" : "bg-blue-600 hover:bg-blue-700"} text-white`}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "Generating…" : `Download ${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}