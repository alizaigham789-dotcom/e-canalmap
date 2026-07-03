import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Globe, Map, Table2, Image, FileImage, Film } from "lucide-react";
import { getMustateeelKillaGrid, getMurabaKillaGrid, getParallelPolyline, CHAKBANDI_SCALE, MUSTATEEL_SCALE, getMustateelMouzaSplit, DIMENSIONS } from "@/lib/gisEngine";


export default function ExportDialog({ open, onClose, mapData, objects, killaVisibility = {}, colorSettings = {} }) {
  const [loading, setLoading] = useState(null);
  const C = colorSettings || {};
  const previewCanvasRef = useRef(null);

  // Live preview — shows exactly how the export will look before downloading
  useEffect(() => {
    if (!open || !previewCanvasRef.current) return;
    const bbox = getBBox();
    const scale = Math.min(600 / (bbox.maxX - bbox.minX || 1), 400 / (bbox.maxY - bbox.minY || 1), 1.5);
    const src = renderToCanvas(scale);
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
  function renderToCanvas(scale = 1) {
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
      drawObj(ctx, o, scale);
    }
    ctx.restore();
    return canvas;
  }

  function drawObj(ctx, o, scale) {
    const zoom = scale;
    if (o.type === "mustateel") {
      // No shade fill — white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      // Killa grid — solid lines, slightly thinner than boundary
      const cellW = o.w / 2, cellH = o.h / 5;
      ctx.strokeStyle = "#000000"; ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(o.x + cellW, o.y); ctx.lineTo(o.x + cellW, o.y + o.h);
      for (let r = 1; r < 5; r++) { ctx.moveTo(o.x, o.y + r*cellH); ctx.lineTo(o.x + o.w, o.y + r*cellH); }
      ctx.stroke();
      // Killa numbers — respect killaVisibility
      if (killaVisibility.mustateel !== false) {
        const grid = getMustateeelKillaGrid();
        ctx.fillStyle = "rgba(0,0,0,0.70)";
        ctx.font = `bold ${Math.max(8, Math.min(cellW, cellH) * 0.28)}px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
          ctx.fillText(String(grid[r][c]), o.x + c*cellW + cellW/2, o.y + r*cellH + cellH/2);
        }
      }
      // Bold outer boundary — user's colour + thickness setting, same as editor/print
      ctx.strokeStyle = C.mustateelStroke || "#000000"; ctx.lineWidth = MUSTATEEL_SCALE.boundaryWidth(o.boundaryThickness); ctx.strokeRect(o.x, o.y, o.w, o.h);
      // Label(s) — split above/below if a mouza line crosses this parcel
      const mSplit = getMustateelMouzaSplit(o, objects.filter(m => m.type === "mouza"));
      ctx.fillStyle = C.labelColor || "#1e293b";
      if (mSplit) {
        const splitFont = Math.min(o.w, o.h) * 0.26;
        ctx.font = `900 ${splitFont}px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (o.label) ctx.fillText(o.label, mSplit.topCenter.x, mSplit.topCenter.y);
        if (o.label2) ctx.fillText(o.label2, mSplit.bottomCenter.x, mSplit.bottomCenter.y);
      } else if (o.label) {
        ctx.font = `900 ${Math.min(o.w, o.h) * 0.35}px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(o.label, o.x + o.w/2, o.y + o.h/2);
      }
    } else if (o.type === "muraba") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      const cellW = o.w/5, cellH = o.h/5;
      ctx.strokeStyle = "#000000"; ctx.lineWidth = 1.2; ctx.setLineDash([]);
      ctx.beginPath();
      for (let c=1;c<5;c++){ctx.moveTo(o.x+c*cellW,o.y);ctx.lineTo(o.x+c*cellW,o.y+o.h);}
      for (let r=1;r<5;r++){ctx.moveTo(o.x,o.y+r*cellH);ctx.lineTo(o.x+o.w,o.y+r*cellH);}
      ctx.stroke();
      // Bold outer boundary (thicker than mustateel)
      ctx.strokeStyle = C.murabaStroke || "#000000"; ctx.lineWidth = 4.5; ctx.strokeRect(o.x, o.y, o.w, o.h);
      if (o.label) {
        ctx.fillStyle = C.labelColor || "#1e293b"; ctx.font = `900 ${Math.min(o.w, o.h)*0.28}px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(o.label, o.x+o.w/2, o.y+o.h/2);
      }
    } else if (o.type === "acre") {
      ctx.fillStyle = o.fillColor || C.acreFill || "rgba(234,179,8,0.08)"; ctx.fillRect(o.x,o.y,o.w,o.h);
      ctx.strokeStyle = C.acreStroke || "#eab308"; ctx.lineWidth = 1.5/zoom; ctx.strokeRect(o.x,o.y,o.w,o.h);
    } else if (o.type === "canal" && o.points?.length >= 2) {
      const halfW = (o.width || 14)/2;
      const left = getParallelPolyline(o.points, -halfW);
      const right = getParallelPolyline(o.points, halfW);
      ctx.fillStyle = C.canalFill || "rgba(30,144,255,0.25)";
      ctx.beginPath(); ctx.moveTo(left[0].x,left[0].y);
      for (const p of left) ctx.lineTo(p.x,p.y);
      ctx.lineTo(right[right.length-1].x,right[right.length-1].y);
      for (let i=right.length-1;i>=0;i--) ctx.lineTo(right[i].x,right[i].y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=C.canalStroke || "#0284c7"; ctx.lineWidth=2/zoom;
      for (const side of [left,right]){ctx.beginPath();ctx.moveTo(side[0].x,side[0].y);for(const p of side)ctx.lineTo(p.x,p.y);ctx.stroke();}
    } else if (o.type === "khal" && o.points?.length >= 2) {
      const halfW = (o.width || 8)/2;
      const left = getParallelPolyline(o.points,-halfW); const right = getParallelPolyline(o.points,halfW);
      const kColor = C.khalStroke || "#2563eb";
      ctx.fillStyle="rgba(37,99,235,0.2)"; ctx.beginPath(); ctx.moveTo(left[0].x,left[0].y);
      for(const p of left)ctx.lineTo(p.x,p.y); ctx.lineTo(right[right.length-1].x,right[right.length-1].y);
      for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=kColor; ctx.lineWidth=1.5/zoom;
      for(const s of [left,right]){ctx.beginPath();ctx.moveTo(s[0].x,s[0].y);for(const p of s)ctx.lineTo(p.x,p.y);ctx.stroke();}
      // Flow arrow at end — 5× size, head at end point, tail behind
      const last=o.points[o.points.length-1], prev=o.points[o.points.length-2];
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
      ctx.strokeStyle=C.mouzaStroke || "#000"; ctx.lineWidth=(CHAKBANDI_SCALE.lineWidth()*5)/3; ctx.lineCap="round"; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(o.points[0].x,o.points[0].y);
      for(const p of o.points) ctx.lineTo(p.x,p.y); ctx.stroke();
    } else if (o.type === "outlet" && o.start && o.end) {
      // Moga — size 10× canal width for print/export legibility
      const color = o.outletColor || C.outletStroke || "#06b6d4";
      const size = DIMENSIONS.CANAL_WIDTH * 10;
      const half = size / 2;
      const { x: sx, y: sy } = o.start;
      const { x: ex, y: ey } = o.end;
      const ang = Math.atan2(ey - sy, ex - sx);
      const headLen = size * 1.6, headW = size;
      ctx.fillStyle = color; ctx.fillRect(sx - half, sy - half, size, size);
      ctx.strokeStyle = "#0e7490"; ctx.lineWidth = 1; ctx.strokeRect(sx - half, sy - half, size, size);
      ctx.strokeStyle = color; ctx.lineWidth = size * 0.25; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(ang) - headW * Math.sin(ang), ey - headLen * Math.sin(ang) + headW * Math.cos(ang));
      ctx.lineTo(ex - headLen * Math.cos(ang) + headW * Math.sin(ang), ey - headLen * Math.sin(ang) - headW * Math.cos(ang));
      ctx.closePath(); ctx.fill();
      // Moga number ABOVE block — blue, 2× font size
      const num = [o.mogha_number, o.mogha_side].filter(Boolean).join("/");
      if (num) {
        ctx.fillStyle = "#2563eb"; ctx.font = `bold 22px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(num, sx, sy - half - 3);
      }
      if (o.mogha_name) {
        ctx.fillStyle = "#0e7490"; ctx.font = `bold 11px Rajdhani, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(o.mogha_name, sx, sy + half + 3);
      }
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

  // ---- Export as PDF (raster) ----
  const exportPDF = async () => {
    setLoading("pdf");
    const canvas = renderToCanvas(2);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    // A3 landscape: 420mm x 297mm at 96dpi
    const pw = 1191, ph = 842; // A3 landscape px at 96dpi
    const ratio = Math.min(pw / canvas.width, ph / canvas.height);
    const iw = canvas.width * ratio, ih = canvas.height * ratio;
    const ix = (pw - iw) / 2, iy = (ph - ih) / 2;

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${mapData?.title || "Map"}</title>
    <style>
      @page { size: A3 landscape; margin: 0; }
      body { margin: 0; background: white; }
      img { width: ${iw}px; height: ${ih}px; margin: ${iy}px ${ix}px; display: block; }
      @media print { body { margin: 0; } }
    </style></head><body><img src="${imgData}" /></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); setLoading(null); }, 800);
  };

  // ---- Export as Vector PDF (SVG in print window) ----
  const exportVectorPDF = async () => {
    setLoading("vpdf");
    const bbox = getBBox();
    const W = bbox.maxX - bbox.minX;
    const H = bbox.maxY - bbox.minY;
    let svgParts = [];

    for (const o of objects) {
      const sorted = [...objects].sort((a,b)=>{
        const order=["mouza","muraba","mustateel","acre","road","canal","khal","chakbandi","outlet","damageMarker"];
        return order.indexOf(a.type)-order.indexOf(b.type);
      });
      // done below
    }

    const svgObjs = [...objects].sort((a,b)=>{
      const order=["mouza","muraba","mustateel","acre","road","canal","khal","chakbandi","outlet","damageMarker"];
      return order.indexOf(a.type)-order.indexOf(b.type);
    }).map(o => objToSVG(o, bbox)).filter(Boolean).join("\n");

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="white"/>
      <g transform="translate(${-bbox.minX},${-bbox.minY})">
        ${svgObjs}
      </g>
    </svg>`;

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${mapData?.title||"Map"} — Vector</title>
    <style>
      @page { size: A3 landscape; margin: 0; }
      body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: white; }
      svg { max-width: 100vw; max-height: 100vh; }
    </style></head><body>${svgContent}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); setLoading(null); }, 800);
  };

  function objToSVG(o, bbox) {
    if (o.type === "mustateel") {
      const cellW = o.w/2, cellH = o.h/5;
      const grid = getMustateeelKillaGrid();
      const killaFontSize = Math.max(6, Math.min(cellW, cellH) * 0.28);
      const killaLabels = killaVisibility.mustateel !== false ? grid.flatMap((row,r) =>
        row.map((n,c) => `<text x="${o.x+c*cellW+cellW/2}" y="${o.y+r*cellH+cellH/2}" font-family="Rajdhani,Arial,sans-serif" font-size="${killaFontSize}" font-weight="bold" fill="rgba(0,0,0,0.70)" text-anchor="middle" dominant-baseline="middle">${n}</text>`)
      ).join("") : "";
      const gridLines = [`<line x1="${o.x+cellW}" y1="${o.y}" x2="${o.x+cellW}" y2="${o.y+o.h}" stroke="#000" stroke-width="1.2"/>`];
      for (let r=1;r<5;r++) gridLines.push(`<line x1="${o.x}" y1="${o.y+r*cellH}" x2="${o.x+o.w}" y2="${o.y+r*cellH}" stroke="#000" stroke-width="1.2"/>`);
      const strokeColor = C.mustateelStroke || "#000";
      const mSplit = getMustateelMouzaSplit(o, objects.filter(m => m.type === "mouza"));
      let lbl;
      if (mSplit) {
        const splitFont = Math.min(o.w, o.h) * 0.26;
        lbl = `${o.label ? `<text x="${mSplit.topCenter.x}" y="${mSplit.topCenter.y}" font-family="Rajdhani,Arial,sans-serif" font-size="${splitFont}" font-weight="900" fill="${C.labelColor || '#1e293b'}" text-anchor="middle" dominant-baseline="middle">${o.label}</text>` : ""}${o.label2 ? `<text x="${mSplit.bottomCenter.x}" y="${mSplit.bottomCenter.y}" font-family="Rajdhani,Arial,sans-serif" font-size="${splitFont}" font-weight="900" fill="${C.labelColor || '#1e293b'}" text-anchor="middle" dominant-baseline="middle">${o.label2}</text>` : ""}`;
      } else {
        lbl = o.label ? `<text x="${o.x+o.w/2}" y="${o.y+o.h/2}" font-family="Rajdhani,Arial,sans-serif" font-size="${Math.min(o.w,o.h)*0.35}" font-weight="900" fill="${C.labelColor || '#1e293b'}" text-anchor="middle" dominant-baseline="middle">${o.label}</text>` : "";
      }
      return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="white"/>${gridLines.join("")}${killaLabels}<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="${strokeColor}" stroke-width="${MUSTATEEL_SCALE.boundaryWidth(o.boundaryThickness)}" stroke-linejoin="miter"/>${lbl}`;
    }
    if (o.type === "muraba") {
      const cellW=o.w/5, cellH=o.h/5;
      const grid = getMurabaKillaGrid();
      const killaFontSize = Math.max(5, Math.min(cellW, cellH) * 0.24);
      const killaLabels = killaVisibility.muraba !== false ? grid.flatMap((row,r) =>
        row.map((n,c) => `<text x="${o.x+c*cellW+cellW/2}" y="${o.y+r*cellH+cellH/2}" font-family="Rajdhani,Arial,sans-serif" font-size="${killaFontSize}" font-weight="bold" fill="rgba(0,0,0,0.65)" text-anchor="middle" dominant-baseline="middle">${n}</text>`)
      ).join("") : "";
      const gridLines=[];
      for(let c=1;c<5;c++) gridLines.push(`<line x1="${o.x+c*cellW}" y1="${o.y}" x2="${o.x+c*cellW}" y2="${o.y+o.h}" stroke="#000" stroke-width="1.2"/>`);
      for(let r=1;r<5;r++) gridLines.push(`<line x1="${o.x}" y1="${o.y+r*cellH}" x2="${o.x+o.w}" y2="${o.y+r*cellH}" stroke="#000" stroke-width="1.2"/>`);
      const lbl = o.label ? `<text x="${o.x+o.w/2}" y="${o.y+o.h/2}" font-family="Rajdhani,Arial,sans-serif" font-size="${Math.min(o.w,o.h)*0.28}" font-weight="900" fill="#1e293b" text-anchor="middle" dominant-baseline="middle">${o.label}</text>` : "";
      return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="white"/>${gridLines.join("")}${killaLabels}<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="#000" stroke-width="4.5" stroke-linejoin="miter"/>${lbl}`;
    }
    if (o.type === "acre") {
      return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="none" stroke="${C.acreStroke || "#555"}" stroke-width="1"/>`;
    }
    if ((o.type==="canal"||o.type==="khal"||o.type==="road") && o.points?.length>=2) {
      const pts = o.points.map(p=>`${p.x},${p.y}`).join(" ");
      const color = o.type==="canal"?(C.canalStroke||"#0284c7"):o.type==="khal"?(C.khalStroke||"#2563eb"):(C.roadStroke||"#b45309");
      const w = o.type==="canal"?2:o.type==="khal"?1.5:2;
      let arrow = "";
      if (o.type === "khal") {
        const khHalfW = (o.width || DIMENSIONS.KHAL_WIDTH) / 2;
        const last = o.points[o.points.length-1], prev = o.points[o.points.length-2];
        const ang = Math.atan2(last.y-prev.y, last.x-prev.x);
        const aLen = khHalfW * 12.5; // 5× original
        const aW = khHalfW * 5;      // 5× tail width
        const p1x=(last.x - aLen*Math.cos(ang) - aW*Math.sin(ang)).toFixed(1);
        const p1y=(last.y - aLen*Math.sin(ang) + aW*Math.cos(ang)).toFixed(1);
        const p2x=(last.x - aLen*Math.cos(ang) + aW*Math.sin(ang)).toFixed(1);
        const p2y=(last.y - aLen*Math.sin(ang) - aW*Math.cos(ang)).toFixed(1);
        arrow = `<polygon points="${last.x.toFixed(1)},${last.y.toFixed(1)} ${p1x},${p1y} ${p2x},${p2y}" fill="${color}"/>`;
      }
      return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${w}"/>${arrow}`;
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
      return `<polyline points="${pts}" fill="none" stroke="${C.mouzaStroke || "#000"}" stroke-width="${(CHAKBANDI_SCALE.lineWidth()*5)/3}" stroke-linecap="round"/>`;
    }
    if (o.type==="outlet" && o.start && o.end) {
      const color = o.outletColor || C.outletStroke || "#06b6d4";
      const size = DIMENSIONS.CANAL_WIDTH * 10;
      const half = size / 2;
      const { x: sx, y: sy } = o.start;
      const { x: ex, y: ey } = o.end;
      const ang = Math.atan2(ey - sy, ex - sx);
      const headLen = size * 1.6, headW = size;
      const h1x=(ex - headLen*Math.cos(ang) - headW*Math.sin(ang)).toFixed(1);
      const h1y=(ey - headLen*Math.sin(ang) + headW*Math.cos(ang)).toFixed(1);
      const h2x=(ex - headLen*Math.cos(ang) + headW*Math.sin(ang)).toFixed(1);
      const h2y=(ey - headLen*Math.sin(ang) - headW*Math.cos(ang)).toFixed(1);
      const num = [o.mogha_number, o.mogha_side].filter(Boolean).join("/");
      const numLbl = num ? `<text x="${sx.toFixed(1)}" y="${(sy-half-3).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="22" fill="#2563eb">${num}</text>` : "";
      const nameLbl = o.mogha_name ? `<text x="${sx.toFixed(1)}" y="${(sy+half+14).toFixed(1)}" text-anchor="middle" font-family="Rajdhani,Arial,sans-serif" font-weight="bold" font-size="11" fill="#0e7490">${o.mogha_name}</text>` : "";
      return `<g>
        <rect x="${(sx-half).toFixed(1)}" y="${(sy-half).toFixed(1)}" width="${size}" height="${size}" fill="${color}" stroke="#0e7490" stroke-width="1"/>
        <line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${color}" stroke-width="${(size*0.25).toFixed(1)}" stroke-linecap="round"/>
        <polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${h1x},${h1y} ${h2x},${h2y}" fill="${color}"/>
        ${numLbl}${nameLbl}
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
    #map-container { position: relative; display: inline-block; padding: 40px; min-width: fit-content; }
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
    { label: "JPG Image", desc: "High-res raster image (2×)", icon: Image, color: "text-amber-400", action: exportJPG, key: "jpg" },
    { label: "PDF (Print)", desc: "Raster PDF, A3 landscape", icon: FileImage, color: "text-red-400", action: exportPDF, key: "pdf" },
    { label: "Vector PDF", desc: "SVG-based crisp vector PDF", icon: FileText, color: "text-purple-400", action: exportVectorPDF, key: "vpdf" },
    { label: "Offline HTML Map", desc: "Scrollable viewer, 1000+ objects", icon: Globe, color: "text-emerald-400", action: exportOfflineHTML, key: "html" },
    { label: "GeoJSON", desc: "Standard GIS vector format", icon: Map, color: "text-blue-400", action: exportGeoJSON, key: "geo" },
    { label: "CSV", desc: "Spreadsheet / tabular data", icon: Table2, color: "text-cyan-400", action: exportCSV, key: "csv" },
    { label: "JSON Backup", desc: "Raw drawing data backup", icon: FileText, color: "text-slate-400", action: exportJSON, key: "json" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-white">Export / Download Map</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg overflow-hidden border border-slate-700 bg-white flex items-center justify-center p-1">
          <canvas ref={previewCanvasRef} className="max-w-full max-h-48 object-contain" />
        </div>
        <p className="text-[10px] text-slate-500 text-center -mt-1">Live preview — this is exactly how your export will look</p>
        <div className="space-y-2 py-2 max-h-[70vh] overflow-y-auto">
          {EXPORTS.map(({ label, desc, icon: Icon, color, action, key }) => (
            <button key={key} onClick={() => action()}
              disabled={loading === key}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-left disabled:opacity-60">
              <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              {loading === key
                ? <span className="ml-auto text-xs text-blue-400 animate-pulse">...</span>
                : <Download className="w-4 h-4 text-slate-600 ml-auto" />
              }
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
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