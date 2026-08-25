import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Globe, Map, Table2, Image, FileImage, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getMustateeelKillaGrid, getMustateelKillaCells, getMurabaKillaGrid, getParallelPolyline, CHAKBANDI_SCALE, MUSTATEEL_SCALE, getMustateelMouzaSplit, DIMENSIONS, calculateTotalGCA, calculateChakbandiGCA, buildPrintFooterHTML, buildPrintHeaderHTML, mogaNumberFont, canalNameFont, PAGE_SIZES, getOutletDimensions, effectiveKillaVisible } from "@/lib/gisEngine";
import { drawCanalNameOnCanvas, svgCanalNameOnPath, drawMogaFractionBoxOnCanvas, drawMogaInfoOnCanvas, drawCCAGCAFractionBoxOnCanvas, svgMogaFractionBox, svgCCAGCAFractionBox, getOutletLabelPos, getChakbandiLabelPos, getCCAGCAText, buildLegendSVG, drawLegendOnCanvas, svgAcreUses, acreUseHasLabel, drawAcreUsesOnCanvas } from "@/lib/printRenderHelpers";
import { drawExclusionHatchOnCanvas } from "@/components/editor/GISRenderer";
import { collectLandUses } from "@/lib/landUsePalette";
import { canvasToPdfBlob, downloadBlob, shareBlob } from "@/lib/pdfExport";


export default function ExportDialog({ open, onClose, mapData, objects, killaVisibility = {}, colorSettings = {}, pageBorderStyle = "none" }) {
  const [loading, setLoading] = useState(null);
  const [pageOrientation, setPageOrientation] = useState("landscape");
  const [pageSize, setPageSize] = useState("A4");
  const [showLegendInExport, setShowLegendInExport] = useState(true);
  const C = colorSettings || {};
  const landUses = collectLandUses(objects);
  const previewCanvasRef = useRef(null);

  // Live preview — shows exactly how the export will look before downloading
  useEffect(() => {
    if (!open || !previewCanvasRef.current) return;
    const bbox = getBBox();
    const scale = Math.min(600 / (bbox.maxX - bbox.minX || 1), 400 / (bbox.maxY - bbox.minY || 1), 1.5);
    const src = renderToCanvas(scale, 0.5);
    const dest = previewCanvasRef.current;
    dest.width = src.width; dest.height = src.height;
    dest.getContext("2d").drawImage(src, 0, 0);
  }, [open, objects, colorSettings, killaVisibility]);

  // ---- Compute bounding box of all objects ----
  function getBBox() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const o of objects) {
      if (o.x !== undefined) {
        minX = Math.min(minX, o.x); minY = Math.min(minY, o.y);
        maxX = Math.max(maxX, o.x + (o.w || 0)); maxY = Math.max(maxY, o.y + (o.h || 0));
      }
      if (o.points) {
        for (const p of o.points) {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
      }
      if (o.start && o.end) {
        minX = Math.min(minX, o.start.x, o.end.x); minY = Math.min(minY, o.start.y, o.end.y);
        maxX = Math.max(maxX, o.start.x, o.end.x); maxY = Math.max(maxY, o.start.y, o.end.y);
      }
    }
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    const pad = 80;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  // ---- Render all objects to an offscreen canvas ----
  function renderToCanvas(scale = 1, mogaScale = 1) {
    const bbox = getBBox();
    const W = (bbox.maxX - bbox.minX) * scale;
    const H = (bbox.maxY - bbox.minY) * scale;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(W);
    canvas.height = Math.ceil(H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-bbox.minX * scale, -bbox.minY * scale);
    ctx.scale(scale, scale);

    const sorted = [...objects].sort((a, b) => {
      const order = ["mouza","muraba","mustateel","acre","road","canal","khal","chakbandi","outlet","damageMarker"];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });

    for (const o of sorted) {
      drawObj(ctx, o, scale, mogaScale);
    }

    // CCA/GCA fraction labels for chakbandis — at labelPos, in fraction boxes
    {
      const _parcels = objects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type));
      const _canals = objects.filter(o => o.type === "canal");
      const _chakbandis = objects.filter(o => o.type === "chakbandi");
      const gcaFont = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30;
      for (const ch of _chakbandis) {
        if (ch.points?.length >= 3) {
          const gca = calculateChakbandiGCA(ch, _parcels, _canals);
          if (gca > 0 || ch.centerLabel) {
            const lp = getChakbandiLabelPos(ch);
            if (!lp) continue;
            const { cca, gca: gcaTxt } = getCCAGCAText(ch, gca);
            if (cca || gcaTxt) {
              drawCCAGCAFractionBoxOnCanvas(ctx, cca, gcaTxt, lp.x, lp.y, gcaFont, "rgba(255,255,255,0.94)", C.chakbandiStroke || "#166534");
            }
          }
        }
      }
    }

    ctx.restore();
    // Legend + moga details
    if (showLegendInExport) drawLegendOnCanvas(ctx, canvas.width, canvas.height, C, scale, { minX: 80 * scale, minY: 80 * scale, maxX: canvas.width - 80 * scale, maxY: canvas.height - 80 * scale }, landUses);
    return canvas;
  }

  function drawObj(ctx, o, scale, mogaScale = 1) {
    const zoom = scale;
    if (o.type === "mustateel") {
      // No shade fill — white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      // Killa grid — fine lines, matches Print Preview (0.7 world units)
      const cellW = o.w / 2, cellH = o.h / 5;
      ctx.strokeStyle = "#000000"; ctx.lineWidth = 0.7;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(o.x + cellW, o.y); ctx.lineTo(o.x + cellW, o.y + o.h);
      for (let r = 1; r < 5; r++) { ctx.moveTo(o.x, o.y + r*cellH); ctx.lineTo(o.x + o.w, o.y + r*cellH); }
      ctx.stroke();
      // Acre land-use fills + Urdu labels (per killa) — drawn before killa numbers
      const showKMust = effectiveKillaVisible(o, killaVisibility.mustateel !== false);
      drawAcreUsesOnCanvas(ctx, o, showKMust, C.mustateelStroke || "#000", killaVisibility.acreUseLabels !== false);
      // Killa numbers — respect killaVisibility (skip cells that have a land-use label)
      if (showKMust) {
        const grid = getMustateeelKillaGrid();
        ctx.fillStyle = "rgba(0,0,0,0.70)";
        ctx.font = `bold ${Math.max(8, Math.min(cellW, cellH) * 0.28)}px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
          if (acreUseHasLabel(o, grid[r][c])) continue;
          ctx.fillText(String(grid[r][c]), o.x + c*cellW + cellW/2, o.y + r*cellH + cellH/2);
        }
      }
      // Bold outer boundary — user's colour + thickness setting, same as editor/print
      if (o.excluded) drawExclusionHatchOnCanvas(ctx, o, zoom);
      ctx.strokeStyle = C.mustateelStroke || "#000000"; ctx.lineWidth = MUSTATEEL_SCALE.boundaryWidth(o.boundaryThickness); ctx.strokeRect(o.x, o.y, o.w, o.h);
      // Label(s) — split above/below if a mouza line crosses this parcel
      const mSplit = getMustateelMouzaSplit(o, objects.filter(m => m.type === "mouza")) || (o.label2 ? { centerA: { x: o.x + o.w/2, y: o.y + o.h*0.25 }, centerB: { x: o.x + o.w/2, y: o.y + o.h*0.75 }, widthA: o.w, widthB: o.w } : null);
      ctx.fillStyle = C.labelColor || "#1e293b";
      if (mSplit) {
        const drawFit = (text, cx, cy, halfW) => {
          if (!text) return;
          let fpx = Math.min(o.w, o.h) * 0.26;
          ctx.font = `900 ${fpx}px Rajdhani, sans-serif`;
          const mw = ctx.measureText(text).width;
          const maxW = (halfW || o.w * 0.5) * 0.80;
          if (mw > maxW) { fpx = Math.max(8, fpx * (maxW / mw)); ctx.font = `900 ${fpx}px Rajdhani, sans-serif`; }
          ctx.fillText(text, cx, cy);
        };
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        drawFit(o.label, mSplit.centerA.x, mSplit.centerA.y, mSplit.widthA);
        drawFit(o.label2 || o.label, mSplit.centerB.x, mSplit.centerB.y, mSplit.widthB);
      } else {
        // No mouza split — show only label1 centered
        const cx = o.x + o.w/2, cy = o.y + o.h/2;
        let fontPx = Math.min(o.w, o.h) * 0.35;
        ctx.font = `900 ${fontPx}px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const measured = ctx.measureText(o.label || "");
        const maxW = o.w * 0.80;
        if (measured.width > maxW) { fontPx = Math.max(8, fontPx * (maxW / measured.width)); ctx.font = `900 ${fontPx}px Rajdhani, sans-serif`; }
        if (o.label) ctx.fillText(o.label, cx, cy);
      }
    } else if (o.type === "muraba") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      const cellW = o.w/5, cellH = o.h/5;
      ctx.strokeStyle = "#000000"; ctx.lineWidth = 0.7; ctx.setLineDash([]);
      ctx.beginPath();
      for (let c=1;c<5;c++){ctx.moveTo(o.x+c*cellW,o.y);ctx.lineTo(o.x+c*cellW,o.y+o.h);}
      for (let r=1;r<5;r++){ctx.moveTo(o.x,o.y+r*cellH);ctx.lineTo(o.x+o.w,o.y+r*cellH);}
      ctx.stroke();
      // Killa numbers — respect killaVisibility (eye toggle), matches editor & print
      if (killaVisibility.muraba !== false) {
        const grid = getMurabaKillaGrid();
        ctx.fillStyle = "rgba(0,0,0,0.70)";
        ctx.font = `bold ${Math.max(8, Math.min(cellW, cellH) * 0.24)}px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
          ctx.fillText(String(grid[r][c]), o.x + c*cellW + cellW/2, o.y + r*cellH + cellH/2);
        }
      }
      // Bold outer boundary (thicker than mustateel)
      if (o.excluded) drawExclusionHatchOnCanvas(ctx, o, zoom);
      ctx.strokeStyle = C.murabaStroke || "#000000"; ctx.lineWidth = 4.5; ctx.strokeRect(o.x, o.y, o.w, o.h);
      if (o.label) {
        ctx.fillStyle = C.labelColor || "#1e293b"; ctx.font = `900 ${Math.min(o.w, o.h)*0.28}px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(o.label, o.x+o.w/2, o.y+o.h/2);
      }
    } else if (o.type === "acre") {
      ctx.fillStyle = o.fillColor || C.acreFill || "rgba(234,179,8,0.08)"; ctx.fillRect(o.x,o.y,o.w,o.h);
      if (o.excluded) drawExclusionHatchOnCanvas(ctx, o, zoom);
      ctx.strokeStyle = C.acreStroke || "#eab308"; ctx.lineWidth = 1.5/zoom; ctx.strokeRect(o.x,o.y,o.w,o.h);
    } else if (o.type === "canal" && o.points?.length >= 2) {
      // Canal — 3D ribbon: rounded thick stroke + darker outline + soft halo
      const w = Math.max(2, o.width || DIMENSIONS.CANAL_WIDTH);
      const fillC = C.canalFill || "#29A9E8";
      const strokeC = C.canalStroke || "#1688C7";
      const drawCenter = () => { ctx.beginPath(); ctx.moveTo(o.points[0].x, o.points[0].y); for (const p of o.points) ctx.lineTo(p.x, p.y); };
      if (o.canalStyle === "flat") {
        const halfW = w / 2;
        const left = getParallelPolyline(o.points, -halfW);
        const right = getParallelPolyline(o.points, halfW);
        ctx.fillStyle = fillC;
        ctx.beginPath(); ctx.moveTo(left[0].x, left[0].y);
        for (const p of left) ctx.lineTo(p.x, p.y);
        ctx.lineTo(right[right.length-1].x, right[right.length-1].y);
        for (let i = right.length-1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = strokeC; ctx.lineWidth = Math.max(2, w * 0.12);
        ctx.lineCap = "butt"; ctx.lineJoin = "round";
        for (const side of [left, right]) { ctx.beginPath(); ctx.moveTo(side[0].x, side[0].y); for (const p of side) ctx.lineTo(p.x, p.y); ctx.stroke(); }
      } else {
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.strokeStyle = strokeC; ctx.globalAlpha = 0.18; ctx.lineWidth = w + 8; drawCenter(); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.strokeStyle = strokeC; ctx.lineWidth = w + 3; drawCenter(); ctx.stroke();
        ctx.strokeStyle = fillC; ctx.lineWidth = w; drawCenter(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.30)"; ctx.lineWidth = Math.max(1, w * 0.12); drawCenter(); ctx.stroke();
      }
      if (o.name) {
        const cf = canalNameFont(o.width || DIMENSIONS.CANAL_WIDTH);
        drawCanalNameOnCanvas(ctx, o.points, o.name, cf);
      }
    } else if (o.type === "khal" && o.points?.length >= 2) {
      const halfW = (o.width || 8)/2;
      const left = getParallelPolyline(o.points,-halfW); const right = getParallelPolyline(o.points,halfW);
      const kColor = C.khalStroke || "#0D47A1";
      ctx.fillStyle = o.fillColor || C.khalFill || "#1565C0"; ctx.beginPath(); ctx.moveTo(left[0].x,left[0].y);
      for(const p of left)ctx.lineTo(p.x,p.y); ctx.lineTo(right[right.length-1].x,right[right.length-1].y);
      for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=kColor; ctx.lineWidth=1.5/zoom;
      for(const s of [left,right]){ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);for(const p of s)ctx.lineTo(p.x,p.y);ctx.stroke();}
      // Flow arrow at end — 5× size, head at end point, tail behind
      // Use last segment with meaningful length to avoid double-click noise
      const last=o.points[o.points.length-1];
      let prev=o.points[0];
      for(let i=o.points.length-2;i>=0;i--){const p=o.points[i];if(Math.hypot(last.x-p.x,last.y-p.y)>halfW*2){prev=p;break;}}
      const fA=Math.atan2(last.y-prev.y,last.x-prev.x);
      const aLen = halfW * 12.5;   // 5× original
      const aW = halfW * 5;        // 5× tail width
      ctx.save(); ctx.translate(last.x,last.y); ctx.rotate(fA);
      ctx.fillStyle=kColor; ctx.beginPath();
      ctx.moveTo(0,0); ctx.lineTo(-aLen,-aW); ctx.lineTo(-aLen,aW); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (o.type === "road" && o.points?.length >= 2) {
      const halfW = (o.width||28)/2;
      const left=getParallelPolyline(o.points,-halfW); const right=getParallelPolyline(o.points,halfW);
      ctx.fillStyle="#3a3a3a"; ctx.beginPath(); ctx.moveTo(left[0].x,left[0].y);
      for(const p of left)ctx.lineTo(p.x,p.y); ctx.lineTo(right[right.length-1].x,right[right.length-1].y);
      for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=C.roadStroke || "#b45309"; ctx.lineWidth=2/zoom;
      for(const s of [left,right]){ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);for(const p of s)ctx.lineTo(p.x,p.y);ctx.stroke();}
    } else if (o.type === "chakbandi" && o.points?.length >= 2) {
      // Bold line + X crosses — colour & thickness match editor/print exactly
      const chColor = C.chakbandiStroke || "#000000";
      const lineW = CHAKBANDI_SCALE.lineWidth(o.lineThickness);
      ctx.strokeStyle=chColor; ctx.lineWidth=lineW;
      ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.beginPath(); ctx.moveTo(o.points[0].x,o.points[0].y);
      for(const p of o.points) ctx.lineTo(p.x,p.y); ctx.stroke();
      // Draw X crosses along each segment
      const crossSize = CHAKBANDI_SCALE.crossSize(o.crossSize), spacing = CHAKBANDI_SCALE.crossSpacing(o.crossSpacing);
      ctx.strokeStyle=chColor; ctx.lineWidth=lineW*0.6; ctx.lineCap="round";
      for (let i = 0; i < o.points.length - 1; i++) {
        const a = o.points[i], b = o.points[i+1];
        const segLen = Math.hypot(b.x-a.x, b.y-a.y);
        const angle = Math.atan2(b.y-a.y, b.x-a.x);
        const steps = Math.max(1, Math.floor(segLen / spacing));
        for (let s = 0; s <= steps; s++) {
          const t = s/steps;
          const cx = a.x+(b.x-a.x)*t, cy = a.y+(b.y-a.y)*t;
          const cos = Math.cos(angle), sin = Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(cx+(-crossSize*cos- -crossSize*sin), cy+(-crossSize*sin+ -crossSize*cos));
          ctx.lineTo(cx+(crossSize*cos-crossSize*sin), cy+(crossSize*sin+crossSize*cos));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx+(crossSize*cos- -crossSize*sin), cy+(crossSize*sin+ -crossSize*cos));
          ctx.lineTo(cx+(-crossSize*cos-crossSize*sin), cy+(-crossSize*sin+crossSize*cos));
          ctx.stroke();
        }
      }
    } else if (o.type === "mouza" && o.points?.length >= 2) {
      ctx.strokeStyle=C.mouzaStroke || "#000"; ctx.lineWidth=(CHAKBANDI_SCALE.lineWidth()*5)/3; ctx.lineCap="round"; ctx.setLineDash([25,12]);
      ctx.beginPath(); ctx.moveTo(o.points[0].x,o.points[0].y);
      for(const p of o.points) ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.setLineDash([]);
    }
    if (o.type === "outlet" && o.start && o.end) {
      // Moga — shared dimensions (identical to editor & print preview)
      const color = o.outletColor || C.outletStroke || "#06b6d4";
      const { size, shaftWidth, headLen, headW, radius } = getOutletDimensions(o);
      const half = size / 2;
      const { x: sx, y: sy } = o.start;
      const { x: ex, y: ey } = o.end;
      const ang = Math.atan2(ey - sy, ex - sx);
      ctx.fillStyle = color; ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(sx - half, sy - half, size, size, radius); }
      else { ctx.rect(sx - half, sy - half, size, size); }
      ctx.fill();
      ctx.strokeStyle = "#0e7490"; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = shaftWidth; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(ang) - headW * Math.sin(ang), ey - headLen * Math.sin(ang) + headW * Math.cos(ang));
      ctx.lineTo(ex - headLen * Math.cos(ang) + headW * Math.sin(ang), ey - headLen * Math.sin(ang) - headW * Math.cos(ang));
      ctx.closePath(); ctx.fill();
      // Moga number — rendered INSIDE the canal (along the canal direction), matching
      // the canal name's colour and upright rotation. The external label box is no
      // longer drawn; labelPos is kept on the object for backward compatibility.
      if (o.mogha_number || o.mogha_side) {
        const mogaText = [o.mogha_number, o.mogha_side].filter(Boolean).join("/");
        // Canal direction = perpendicular to the outlet shaft; keep upright like canal name text.
        let canalAng = ang + Math.PI / 2;
        if (canalAng > Math.PI / 2 || canalAng < -Math.PI / 2) canalAng += Math.PI;
        const cf = canalNameFont(o.canalWidth || DIMENSIONS.CANAL_WIDTH);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(canalAng);
        ctx.font = `bold ${cf}px Rajdhani, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = Math.max(2, cf * 0.18);
        ctx.lineJoin = "round";
        ctx.strokeText(mogaText, 0, 0);
        ctx.fillStyle = "#FFD700";
        ctx.fillText(mogaText, 0, 0);
        ctx.restore();
      }
      drawMogaInfoOnCanvas(ctx, o, size * 1.2);
    }
  }

  // ---- Export as JPG ----
  const exportJPG = async () => {
    setLoading("jpg");
    const canvas = renderToCanvas(2);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${mapData?.title || "map"}.jpg`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      setLoading(null);
    }, "image/jpeg", 0.95);
  };

  // ---- Export as PDF file (jsPDF — saves to storage on mobile) ----
  const exportPDF = async () => {
    setLoading("pdf");
    try {
      const canvas = renderToCanvas(2);
      const blob = await canvasToPdfBlob(canvas, mapData, pageOrientation, pageSize);
      downloadBlob(blob, `${mapData?.title || "map"}.pdf`);
      toast.success("PDF محفوظ ہو گیا");
    } catch (e) {
      toast.error("PDF بنانے میں مسئلہ");
    }
    setLoading(null);
  };

  // ---- Share PDF via Web Share API (WhatsApp etc.) ----
  const sharePDF = async () => {
    setLoading("pdf-share");
    try {
      const canvas = renderToCanvas(2);
      const blob = await canvasToPdfBlob(canvas, mapData, pageOrientation, pageSize);
      const fname = `${mapData?.title || "map"}.pdf`;
      const result = await shareBlob(blob, fname, mapData?.title || "Map", "Chakbandi GIS Map");
      if (result === "unsupported") {
        downloadBlob(blob, fname);
        toast.info("شیئرنگ سپورٹڈ نہیں — PDF ڈاؤن لوڈ ہو گیا");
      }
    } catch (e) {
      toast.error("شیئر کرنے میں مسئلہ");
    }
    setLoading(null);
  };

  // ---- Share JPG via Web Share API ----
  const shareJPG = async () => {
    setLoading("jpg-share");
    try {
      const canvas = renderToCanvas(2);
      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.95));
      const fname = `${mapData?.title || "map"}.jpg`;
      const result = await shareBlob(blob, fname, mapData?.title || "Map", "Chakbandi GIS Map");
      if (result === "unsupported") {
        downloadBlob(blob, fname);
        toast.info("شیئرنگ سپورٹڈ نہیں — تصویر ڈاؤن لوڈ ہو گیا");
      }
    } catch (e) {
      toast.error("شیئر کرنے میں مسئلہ");
    }
    setLoading(null);
  };

  // ---- Export as Vector PDF (SVG in print window) ----
  const exportVectorPDF = async () => {
    setLoading("vpdf");
    const bbox = getBBox();
    const W = bbox.maxX - bbox.minX;
    const H = bbox.maxY - bbox.minY;
    const totalGCA = calculateTotalGCA(objects);
    const headerHTML = buildPrintHeaderHTML(mapData);
    const footerHTML = buildPrintFooterHTML(mapData);

    // CCA/GCA fraction labels for chakbandis — at labelPos, in fraction boxes
    const parcels = objects.filter(o => ["acre", "mustateel", "muraba"].includes(o.type));
    const canals = objects.filter(o => o.type === "canal");
    const chakbandis = objects.filter(o => o.type === "chakbandi");
    const lblFont = Math.min(DIMENSIONS.MUSTATEEL.width, DIMENSIONS.MUSTATEEL.height) * 0.30;
    let gcaLabels = "";
    for (const ch of chakbandis) {
      if (ch.points?.length >= 3) {
        const gca = calculateChakbandiGCA(ch, parcels, canals);
        if (gca > 0 || ch.centerLabel) {
          const lp = getChakbandiLabelPos(ch);
          if (!lp) continue;
          const { cca, gca: gcaTxt } = getCCAGCAText(ch, gca);
          if (cca || gcaTxt) {
            gcaLabels += svgCCAGCAFractionBox(cca, gcaTxt, lp.x, lp.y, lblFont, "rgba(255,255,255,0.94)", C.chakbandiStroke || "#166534");
          }
        }
      }
    }

    const svgObjs = [...objects].sort((a,b)=>{
      const order=["mouza","muraba","mustateel","acre","road","canal","khal","chakbandi","outlet","damageMarker"];
      return order.indexOf(a.type)-order.indexOf(b.type);
    }).map(o => objToSVG(o, bbox)).filter(Boolean).join("\n");

    const legendSvg = showLegendInExport ? buildLegendSVG(bbox.minX, bbox.minY, W, H, C, { minX: bbox.minX + 80, minY: bbox.minY + 80, maxX: bbox.maxX - 80, maxY: bbox.maxY - 80 }, null, landUses) : "";
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="white"/>
      <g transform="translate(${-bbox.minX},${-bbox.minY})">
        ${svgObjs}
        ${gcaLabels}
        ${legendSvg}
      </g>
    </svg>`;

    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup blocked — allow popups for this site"); setLoading(null); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Khaka Dasti</title>
    <style>
      @font-face { font-family: 'Jameel Noori Nastaleeq'; src: url('https://cdn.jsdelivr.net/gh/tariq-abdullah/urdu-web-font-CDN/JameelNooriNastaleeq.woff') format('woff'); font-display: swap; }
      @page { size: ${pageSize} ${pageOrientation}; margin: 6mm; }
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { width:100%; height:100%; overflow:hidden; background:white; font-family:Rajdhani,Arial,sans-serif; }
      body { display: flex; flex-direction: column;${pageBorderStyle !== "none" && pageBorderStyle ? ` border:2px ${pageBorderStyle} #3b82f6;` : ""} }
      .map-wrap { flex: 1; min-height: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .map-wrap svg { max-width:100%; max-height:100%; width:auto; height:auto; display:block; }
      @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>
    ${headerHTML}
    <div class="map-wrap">${svgContent}</div>
    ${footerHTML}
    </body></html>`);
    win.document.close();
    win.onload = () => { setTimeout(() => { win.print(); setLoading(null); }, 500); };
  };

  function objToSVG(o, bbox) {
    if (o.type === "mustateel") {
      const cellW = o.w/2, cellH = o.h/5;
      const grid = getMustateeelKillaGrid();
      const killaFontSize = Math.max(6, Math.min(cellW, cellH) * 0.28);
      const showKSvg = o.excluded || killaVisibility.mustateel !== false;
      const killaLabels = showKSvg ? grid.flatMap((row,r) =>
        row.map((n,c) => acreUseHasLabel(o, n) ? "" : `<text x="${o.x+c*cellW+cellW/2}" y="${o.y+r*cellH+cellH/2}" font-family="Rajdhani,Arial,sans-serif" font-size="${killaFontSize}" font-weight="bold" fill="rgba(0,0,0,0.70)" text-anchor="middle" dominant-baseline="middle">${n}</text>`)
      ).join("") : "";
      const gridLines = [`<line x1="${o.x+cellW}" y1="${o.y}" x2="${o.x+cellW}" y2="${o.y+o.h}" stroke="#000" stroke-width="0.7"/>`];
      for (let r=1;r<5;r++) gridLines.push(`<line x1="${o.x}" y1="${o.y+r*cellH}" x2="${o.x+o.w}" y2="${o.y+r*cellH}" stroke="#000" stroke-width="0.7"/>`);
      const strokeColor = C.mustateelStroke || "#000";
      const mSplit = getMustateelMouzaSplit(o, objects.filter(m => m.type === "mouza")) || (o.label2 ? { centerA: { x: o.x + o.w/2, y: o.y + o.h*0.25 }, centerB: { x: o.x + o.w/2, y: o.y + o.h*0.75 }, widthA: o.w, widthB: o.w } : null);
      let lbl;
      if (mSplit && o.label2) {
        const lbl2Val = o.label2;
        const fitFontSvg = (text, halfW) => {
          let fpx = Math.min(o.w, o.h) * 0.26;
          const estW = text.length * fpx * 0.6;
          const maxW = (halfW || o.w * 0.5) * 0.80;
          if (estW > maxW) fpx = Math.max(8, maxW / (text.length * 0.6));
          return fpx;
        };
        const f1 = fitFontSvg(o.label || "", mSplit.widthA);
        const f2 = fitFontSvg(lbl2Val, mSplit.widthB);
        lbl = `${o.label ? `<text x="${mSplit.centerA.x}" y="${mSplit.centerA.y}" font-family="Rajdhani,Arial,sans-serif" font-size="${f1}" font-weight="900" fill="${C.labelColor || '#1e293b'}" text-anchor="middle" dominant-baseline="middle">${o.label}</text>` : ""}${lbl2Val ? `<text x="${mSplit.centerB.x}" y="${mSplit.centerB.y}" font-family="Rajdhani,Arial,sans-serif" font-size="${f2}" font-weight="900" fill="${C.labelColor || '#1e293b'}" text-anchor="middle" dominant-baseline="middle">${lbl2Val}</text>` : ""}`;
      } else {
        // No mouza split — show only label1 centered
        const cx = o.x+o.w/2, cy = o.y+o.h/2;
        let fontPx = Math.min(o.w,o.h) * 0.35;
        lbl = `${o.label ? `<text x="${cx}" y="${cy}" font-family="Rajdhani,Arial,sans-serif" font-size="${fontPx}" font-weight="900" fill="${C.labelColor || '#1e293b'}" text-anchor="middle" dominant-baseline="middle">${o.label}</text>` : ""}`;
      }
      const hatch = o.excluded ? svgExclusionHatchSVG(o, "must") : "";
      return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="white"/>${gridLines.join("")}${svgAcreUses(o, showKSvg, strokeColor, killaVisibility.acreUseLabels !== false)}${killaLabels}${hatch}<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="${strokeColor}" stroke-width="${MUSTATEEL_SCALE.boundaryWidth(o.boundaryThickness)}" stroke-linejoin="miter"/>${lbl}`;
    }
    if (o.type === "muraba") {
      const cellW=o.w/5, cellH=o.h/5;
      const grid = getMurabaKillaGrid();
      const killaFontSize = Math.max(5, Math.min(cellW, cellH) * 0.24);
      const killaLabels = killaVisibility.muraba !== false ? grid.flatMap((row,r) =>
        row.map((n,c) => `<text x="${o.x+c*cellW+cellW/2}" y="${o.y+r*cellH+cellH/2}" font-family="Rajdhani,Arial,sans-serif" font-size="${killaFontSize}" font-weight="bold" fill="rgba(0,0,0,0.65)" text-anchor="middle" dominant-baseline="middle">${n}</text>`)
      ).join("") : "";
      const gridLines=[];
      for(let c=1;c<5;c++) gridLines.push(`<line x1="${o.x+c*cellW}" y1="${o.y}" x2="${o.x+c*cellW}" y2="${o.y+o.h}" stroke="#000" stroke-width="0.7"/>`);
      for(let r=1;r<5;r++) gridLines.push(`<line x1="${o.x}" y1="${o.y+r*cellH}" x2="${o.x+o.w}" y2="${o.y+r*cellH}" stroke="#000" stroke-width="0.7"/>`);
      const lbl = o.label ? `<text x="${o.x+o.w/2}" y="${o.y+o.h/2}" font-family="Rajdhani,Arial,sans-serif" font-size="${Math.min(o.w,o.h)*0.28}" font-weight="900" fill="#1e293b" text-anchor="middle" dominant-baseline="middle">${o.label}</text>` : "";
      const hatch = o.excluded ? svgExclusionHatchSVG(o, "murb") : "";
      return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="white"/>${gridLines.join("")}${killaLabels}${hatch}<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="#000" stroke-width="4.5" stroke-linejoin="miter"/>${lbl}`;
    }
    if (o.type === "acre") {
      const hatch = o.excluded ? svgExclusionHatchSVG(o, "acre") : "";
      return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="${C.acreStroke || "#555"}" stroke-width="1"/>${hatch}`;
    }
    if (o.type === "canal" && o.points?.length >= 2) {
      // Canal — smooth 3D ribbon: rounded thick stroke + darker outline + soft halo
      const w = Math.max(2, o.width || DIMENSIONS.CANAL_WIDTH);
      const fillColor = C.canalFill || "rgba(163,218,244,0.70)";
      const strokeColor = C.canalStroke || "#2B7AB8";
      const centerPts = o.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      let nameSvg = "";
      if (o.name) {
        const cf = canalNameFont(o.width || DIMENSIONS.CANAL_WIDTH);
        nameSvg = svgCanalNameOnPath(o.points, o.name, cf);
      }
      if (o.canalStyle === "flat") {
        const halfW = w / 2;
        const left = getParallelPolyline(o.points, -halfW);
        const right = getParallelPolyline(o.points, halfW);
        const fillPts = [...left, ...[...right].reverse()].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        const leftPts = left.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        const rightPts = right.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        return `<g><polygon points="${fillPts}" fill="${fillColor}"/><polyline points="${leftPts}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="round"/><polyline points="${rightPts}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="round"/>${nameSvg}</g>`;
      }
      return `<g><polyline points="${centerPts}" fill="none" stroke="${strokeColor}" stroke-width="${w + 8}" stroke-linecap="round" stroke-linejoin="round" opacity="0.18"/><polyline points="${centerPts}" fill="none" stroke="${strokeColor}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${centerPts}" fill="none" stroke="${fillColor}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${centerPts}" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="${Math.max(1, w * 0.12).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>${nameSvg}</g>`;
    }
    if (o.type === "khal" && o.points?.length >= 2) {
      // Khal — bilateral buffer + flow arrow at end
      const halfW = (o.width || DIMENSIONS.KHAL_WIDTH) / 2;
      const left = getParallelPolyline(o.points, -halfW);
      const right = getParallelPolyline(o.points, halfW);
      const color = C.khalStroke || "#2563eb";
      const fillPts = [...left, ...[...right].reverse()].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const leftPts = left.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const rightPts = right.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const last = o.points[o.points.length-1];
      let prev = o.points[0];
      for(let i=o.points.length-2;i>=0;i--){const p=o.points[i];if(Math.hypot(last.x-p.x,last.y-p.y)>halfW*2){prev=p;break;}}
      const ang = Math.atan2(last.y-prev.y, last.x-prev.x);
      const aLen = halfW * 12.5, aW = halfW * 5;
      const p1x=(last.x - aLen*Math.cos(ang) - aW*Math.sin(ang)).toFixed(1);
      const p1y=(last.y - aLen*Math.sin(ang) + aW*Math.cos(ang)).toFixed(1);
      const p2x=(last.x - aLen*Math.cos(ang) + aW*Math.sin(ang)).toFixed(1);
      const p2y=(last.y - aLen*Math.sin(ang) - aW*Math.cos(ang)).toFixed(1);
      return `<g><polygon points="${fillPts}" fill="${color}22"/><polyline points="${leftPts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${rightPts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polygon points="${last.x.toFixed(1)},${last.y.toFixed(1)} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}"/></g>`;
    }
    if (o.type === "road" && o.points?.length >= 2) {
      // Road — bilateral buffer + center dash
      const halfW = (o.width || DIMENSIONS.ROAD_WIDTH) / 2;
      const left = getParallelPolyline(o.points, -halfW);
      const right = getParallelPolyline(o.points, halfW);
      const color = C.roadStroke || "#b45309";
      const fillPts = [...left, ...[...right].reverse()].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const leftPts = left.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const rightPts = right.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const centerPts = o.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      return `<g><polygon points="${fillPts}" fill="#3a3a3a"/><polyline points="${leftPts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${rightPts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${centerPts}" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="10,6" stroke-linecap="round"/></g>`;
    }
    if (o.type==="chakbandi" && o.points?.length>=2) {
      // Bold line + X crosses — colour & thickness match editor/print exactly
      const chColor = C.chakbandiStroke || "#000";
      const lineW = CHAKBANDI_SCALE.lineWidth(o.lineThickness);
      const crossW = lineW * 0.6;
      let crossSVG = "";
      const crossSize = CHAKBANDI_SCALE.crossSize(o.crossSize), spacing = CHAKBANDI_SCALE.crossSpacing(o.crossSpacing);
      for (let i = 0; i < o.points.length - 1; i++) {
        const a = o.points[i], b = o.points[i+1];
        const segLen = Math.hypot(b.x-a.x, b.y-a.y);
        const angle = Math.atan2(b.y-a.y, b.x-a.x);
        const steps = Math.max(1, Math.floor(segLen / spacing));
        for (let s = 0; s <= steps; s++) {
          const t = s/steps;
          const cx = a.x+(b.x-a.x)*t, cy = a.y+(b.y-a.y)*t;
          const cos = Math.cos(angle), sin = Math.sin(angle);
          const x1=(cx+(-crossSize*cos- -crossSize*sin)).toFixed(1), y1=(cy+(-crossSize*sin+ -crossSize*cos)).toFixed(1);
          const x2=(cx+(crossSize*cos-crossSize*sin)).toFixed(1), y2=(cy+(crossSize*sin+crossSize*cos)).toFixed(1);
          const x3=(cx+(crossSize*cos- -crossSize*sin)).toFixed(1), y3=(cy+(crossSize*sin+ -crossSize*cos)).toFixed(1);
          const x4=(cx+(-crossSize*cos-crossSize*sin)).toFixed(1), y4=(cy+(-crossSize*sin+crossSize*cos)).toFixed(1);
          crossSVG += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${chColor}" stroke-width="${crossW}" stroke-linecap="round"/>`;
          crossSVG += `<line x1="${x3}" y1="${y3}" x2="${x4}" y2="${y4}" stroke="${chColor}" stroke-width="${crossW}" stroke-linecap="round"/>`;
        }
      }
      const pts=o.points.map(p=>`${p.x},${p.y}`).join(" ");
      return `<polyline points="${pts}" fill="none" stroke="${chColor}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="round"/>${crossSVG}`;
    }
    if (o.type==="mouza" && o.points?.length>=2) {
      const pts=o.points.map(p=>`${p.x},${p.y}`).join(" ");
      return `<polyline points="${pts}" fill="none" stroke="${C.mouzaStroke || "#000"}" stroke-width="${(CHAKBANDI_SCALE.lineWidth()*5)/3}" stroke-linecap="round" stroke-dasharray="25,12"/>`;
    }
    if (o.type==="outlet" && o.start && o.end) {
      const color = o.outletColor || C.outletStroke || "#06b6d4";
      const { size, shaftWidth, headLen, headW, radius } = getOutletDimensions(o);
      const half = size / 2;
      const { x: sx, y: sy } = o.start;
      const { x: ex, y: ey } = o.end;
      const ang = Math.atan2(ey - sy, ex - sx);
      const h1x=(ex - headLen*Math.cos(ang) - headW*Math.sin(ang)).toFixed(1);
      const h1y=(ey - headLen*Math.sin(ang) + headW*Math.cos(ang)).toFixed(1);
      const h2x=(ex - headLen*Math.cos(ang) + headW*Math.sin(ang)).toFixed(1);
      const h2y=(ey - headLen*Math.sin(ang) - headW*Math.cos(ang)).toFixed(1);
      // Moga number INSIDE the canal — along the canal direction (perpendicular to the
      // outlet shaft), kept upright like the canal name. Same colours as the canal name.
      let mogaInside = "";
      if (o.mogha_number || o.mogha_side) {
        const mogaText = [o.mogha_number, o.mogha_side].filter(Boolean).join("/");
        let canalAng = ang + Math.PI / 2;
        if (canalAng > Math.PI / 2 || canalAng < -Math.PI / 2) canalAng += Math.PI;
        const canalAngDeg = canalAng * 180 / Math.PI;
        const cf = canalNameFont(o.canalWidth || DIMENSIONS.CANAL_WIDTH);
        mogaInside = `<text transform="translate(${sx.toFixed(1)},${sy.toFixed(1)}) rotate(${canalAngDeg.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="${cf.toFixed(1)}" paint-order="stroke" stroke="rgba(0,0,0,0.85)" stroke-width="${Math.max(2, cf * 0.18).toFixed(1)}" stroke-linejoin="round" fill="#FFD700">${mogaText}</text>`;
      }
      return `<g>
        <rect x="${(sx-half).toFixed(1)}" y="${(sy-half).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${radius.toFixed(1)}" fill="${color}" stroke="#0e7490" stroke-width="1"/>
        <line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${color}" stroke-width="${shaftWidth.toFixed(1)}" stroke-linecap="round"/>
        <polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${h1x},${h1y} ${h2x},${h2y}" fill="${color}"/>
        ${mogaInside}
      </g>`;
    }
    return null;
  }

  // ---- Export as Offline HTML Map Viewer (scrollable, zoomable) ----
  const exportOfflineHTML = async () => {
    setLoading("html");
    const canvas = renderToCanvas(1.5);
    const imgData = canvas.toDataURL("image/png");
    const bbox = getBBox();
    const W = canvas.width;
    const H = canvas.height;
    const title = mapData?.title || "Chakbandi Map";

    const html = `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a2e; font-family: sans-serif; color: white; user-select: none; }
    #header { background: #16213e; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #0f3460; position: sticky; top: 0; z-index: 10; }
    #header h1 { font-size: 16px; font-weight: bold; color: #e2e8f0; }
    #header .info { font-size: 11px; color: #64748b; }
    #toolbar { background: #16213e; padding: 8px 16px; display: flex; gap: 8px; align-items: center; border-bottom: 1px solid #0f3460; flex-wrap: wrap; }
    .btn { background: #0f3460; border: 1px solid #1e40af; color: #93c5fd; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: background 0.15s; }
    .btn:hover { background: #1e40af; }
    .btn.active { background: #2563eb; color: white; }
    #zoom-display { font-size: 12px; color: #64748b; min-width: 50px; text-align: center; }
    #viewport { overflow: auto; width: 100vw; height: calc(100vh - 90px); cursor: grab; background: #f8fafc; }
    #viewport.dragging { cursor: grabbing; }
    #map-container { position: relative; display: inline-block; padding: 40px; min-width: fit-content;${pageBorderStyle !== "none" && pageBorderStyle ? ` border: 2px ${pageBorderStyle} #3b82f6;` : ""} }
    #map-img { display: block; transform-origin: top left; image-rendering: pixelated; transition: transform 0.1s; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    #info-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #16213e; padding: 4px 16px; font-size: 11px; color: #64748b; display: flex; gap: 16px; border-top: 1px solid #0f3460; }
  </style>
</head>
<body>
  <div id="header">
    <div>
      <h1>🗺️ ${title}</h1>
      <div class="info">${new Date().toLocaleDateString('ur-PK')} — ${objects.filter(o=>o.type==='mustateel').length} Mustateel, ${objects.filter(o=>o.type==='muraba').length} Muraba</div>
    </div>
    <div class="info">Chakbandi GIS — Offline Viewer</div>
  </div>
  <div id="toolbar">
    <button class="btn" onclick="setZoom(zoomLevel * 1.25)">+ Zoom In</button>
    <button class="btn" onclick="setZoom(zoomLevel / 1.25)">- Zoom Out</button>
    <button class="btn" onclick="setZoom(1)">Reset View</button>
    <button class="btn" onclick="fitToScreen()">Fit Screen</button>
    <span id="zoom-display">100%</span>
    <button class="btn" onclick="window.print()">🖨️ Print</button>
  </div>
  <div id="viewport">
    <div id="map-container">
      <img id="map-img" src="${imgData}" width="${W}" height="${H}" draggable="false" />
    </div>
  </div>
  <div id="info-bar">
    <span>📐 Map Size: ${Math.round(bbox.maxX - bbox.minX)} × ${Math.round(bbox.maxY - bbox.minY)} ft</span>
    <span>🏘️ Objects: ${objects.length}</span>
    <span>⌨️ Scroll to zoom • Drag to pan</span>
  </div>
  <script>
    let zoomLevel = 1;
    const img = document.getElementById('map-img');
    const viewport = document.getElementById('viewport');
    const zDisp = document.getElementById('zoom-display');

    function setZoom(z) {
      zoomLevel = Math.max(0.1, Math.min(10, z));
      img.style.width = (${W} * zoomLevel) + 'px';
      img.style.height = (${H} * zoomLevel) + 'px';
      zDisp.textContent = Math.round(zoomLevel * 100) + '%';
    }

    function fitToScreen() {
      const vw = viewport.clientWidth - 80;
      const vh = viewport.clientHeight - 80;
      const scale = Math.min(vw / ${W}, vh / ${H});
      setZoom(scale);
      // Center after fit
      setTimeout(() => {
        const iw = ${W} * zoomLevel, ih = ${H} * zoomLevel;
        viewport.scrollLeft = (iw - vw) / 2;
        viewport.scrollTop = (ih - vh) / 2;
      }, 50);
    }

    // Ctrl+wheel zoom
    viewport.addEventListener('wheel', function(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const mx = e.clientX - rect.left + viewport.scrollLeft;
        const my = e.clientY - rect.top + viewport.scrollTop;
        const oldZoom = zoomLevel;
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setZoom(zoomLevel * factor);
        viewport.scrollLeft = mx * (zoomLevel / oldZoom) - (e.clientX - rect.left);
        viewport.scrollTop = my * (zoomLevel / oldZoom) - (e.clientY - rect.top);
      }
    }, { passive: false });

    // Mouse drag pan
    let isDragging = false, startX, startY, startSL, startST;
    viewport.addEventListener('mousedown', e => {
      isDragging = true; startX = e.clientX; startY = e.clientY;
      startSL = viewport.scrollLeft; startST = viewport.scrollTop;
      viewport.classList.add('dragging');
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      viewport.scrollLeft = startSL - (e.clientX - startX);
      viewport.scrollTop = startST - (e.clientY - startY);
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      viewport.classList.remove('dragging');
    });

    // Touch pan/pinch
    let lastTouchDist = null;
    viewport.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (lastTouchDist) setZoom(zoomLevel * (d / lastTouchDist));
        lastTouchDist = d;
      }
    }, { passive: false });
    viewport.addEventListener('touchend', () => { lastTouchDist = null; });

    // Start with fit to screen
    window.addEventListener('load', fitToScreen);
  </script>
  <style>@media print { #toolbar, #info-bar, #header { display: none; } #viewport { height: auto; overflow: visible; } }</style>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/\s+/g,"_")}_offline_map.html`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLoading(null);
  };

  // ---- GeoJSON, CSV, KML, JSON (original) ----
  const exportGeoJSON = () => {
    const features = objects.filter(o=>["acre","mustateel","muraba"].includes(o.type)).map(o=>({
      type:"Feature", properties:{id:o.id,type:o.type,label:o.label||"",ownerName:o.ownerName||""},
      geometry:{type:"Polygon",coordinates:[[[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h],[o.x,o.y]]]}
    }));
    downloadText(JSON.stringify({type:"FeatureCollection",features},null,2),`${mapData?.title||"map"}.geojson`,"application/json");
  };
  const exportCSV = () => {
    const rows=[["id","type","x_ft","y_ft","width_ft","height_ft","label","owner"]];
    for(const o of objects) if(["acre","mustateel","muraba"].includes(o.type)) rows.push([o.id,o.type,Math.round(o.x),Math.round(o.y),o.w,o.h,o.label||"",o.ownerName||""]);
    downloadText(rows.map(r=>r.join(",")).join("\n"),`${mapData?.title||"map"}.csv`,"text/csv");
  };
  const exportJSON = () => downloadText(JSON.stringify({map:mapData,objects},null,2),`${mapData?.title||"map"}_raw.json`,"application/json");

  const EXPORTS = [
    { label: "PDF File", desc: "محفوظ PDF فائل (موبائل پر بھی)", icon: FileImage, color: "text-red-400", action: exportPDF, key: "pdf" },
    { label: "Share PDF", desc: "WhatsApp یا کہیں بھی شیئر کریں", icon: Share2, color: "text-emerald-400", action: sharePDF, key: "pdf-share" },
    { label: "JPG Image", desc: "High-res raster image (2×)", icon: Image, color: "text-amber-400", action: exportJPG, key: "jpg" },
    { label: "Share JPG", desc: "تصویر WhatsApp یا کہیں بھی شیئر کریں", icon: Share2, color: "text-teal-400", action: shareJPG, key: "jpg-share" },
    { label: "Vector PDF", desc: "SVG-based crisp vector PDF (print)", icon: FileText, color: "text-purple-400", action: exportVectorPDF, key: "vpdf" },
    { label: "Offline HTML Map", desc: "Scrollable viewer, 1000+ objects", icon: Globe, color: "text-emerald-400", action: exportOfflineHTML, key: "html" },
    { label: "GeoJSON", desc: "Standard GIS vector format", icon: Map, color: "text-blue-400", action: exportGeoJSON, key: "geo" },
    { label: "CSV", desc: "Spreadsheet / tabular data", icon: Table2, color: "text-cyan-400", action: exportCSV, key: "csv" },
    { label: "JSON Backup", desc: "Raw drawing data backup", icon: FileText, color: "text-slate-400", action: exportJSON, key: "json" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-slate-800">Export / Download Map</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center p-1">
          <canvas ref={previewCanvasRef} className="max-w-full max-h-48 object-contain" />
        </div>
        <p className="text-[10px] text-slate-400 text-center -mt-1">Live preview — this is exactly how your export will look</p>
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <span className="text-[10px] text-slate-500">Page:</span>
          <select
            value={pageSize}
            onChange={e => setPageSize(e.target.value)}
            className="text-[10px] bg-white border border-slate-300 text-slate-700 rounded px-1 py-0.5 cursor-pointer"
            title="Page Size"
          >
            {["A4", "A3", "A2", "A1", "A0"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setPageOrientation("landscape")} className={`text-[10px] px-2 py-0.5 rounded ${pageOrientation === "landscape" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>Landscape</button>
          <button onClick={() => setPageOrientation("portrait")} className={`text-[10px] px-2 py-0.5 rounded ${pageOrientation === "portrait" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>Portrait</button>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showLegendInExport} onChange={e => setShowLegendInExport(e.target.checked)} className="w-3 h-3 accent-blue-500" />
            <span className="text-[10px] text-slate-600" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>علامات</span>
          </label>
        </div>
        <div className="space-y-2 py-2 max-h-[70vh] overflow-y-auto">
          {EXPORTS.map(({ label, desc, icon: Icon, color, action, key }) => (
            <button key={key} onClick={() => action()}
              disabled={loading === key}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left disabled:opacity-60">
              <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              {loading === key
                ? <span className="ml-auto text-xs text-blue-500 animate-pulse">...</span>
                : <Download className="w-4 h-4 text-slate-400 ml-auto" />
              }
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function svgExclusionHatchSVG(obj, prefix = "excl") {
  const spacing = obj.exclusionSpacing || 60;
  const color = obj.exclusionColor || "#000000";
  // Print: line width = 25% less than the parcel's own boundary width
  let width;
  if (obj.type === "mustateel") width = MUSTATEEL_SCALE.boundaryWidth(obj.boundaryThickness) * 0.75;
  else if (obj.type === "muraba") width = 6.5 * 0.75;
  else width = 1 * 0.75;

  let rects;
  if (obj.excludedAcres && obj.type === "mustateel") {
    rects = getMustateelKillaCells(obj)
      .filter(cell => obj.excludedAcres[cell.killa - 1])
      .map(cell => ({ x: cell.x, y: cell.y, w: cell.w, h: cell.h }));
  } else {
    rects = [{ x: obj.x, y: obj.y, w: obj.w, h: obj.h }];
  }
  if (rects.length === 0) return "";

  let result = "";
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    const id = `${prefix}_${i}_${rect.x}_${rect.y}`;
    let lines = "";
    for (let d = -rect.h; d < rect.w; d += spacing) {
      lines += `<line x1="${(rect.x + d).toFixed(1)}" y1="${rect.y.toFixed(1)}" x2="${(rect.x + d + rect.h).toFixed(1)}" y2="${(rect.y + rect.h).toFixed(1)}" stroke="${color}" stroke-width="${width}"/>`;
    }
    result += `<clipPath id="${id}"><rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"/></clipPath><g clip-path="url(#${id})">${lines}</g>`;
  }
  return result;
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