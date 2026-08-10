import { jsPDF } from "jspdf";
import { buildMapHeaderText } from "@/lib/gisEngine";

// Ensure the Urdu font is loaded so canvas text renders correctly
let fontLoaded = false;
async function ensureFont() {
  if (fontLoaded) return;
  try {
    if (document.fonts && document.fonts.load) {
      await document.fonts.load('bold 48px "Jameel Noori Nastaleeq"');
      await document.fonts.load('bold 48px "Noto Nastaliq Urdu"');
    }
    fontLoaded = true;
  } catch {}
}

// Draw the Urdu header text on a canvas (used when building PDF from canvas render)
function drawHeaderOnCanvas(ctx, mapData, canvasWidth, headerHeight) {
  const text = buildMapHeaderText(mapData);
  if (!text) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Bigger, bolder header — scales with canvas width
  let fontSize = Math.max(36, canvasWidth / 14);
  ctx.font = `bold ${fontSize}px "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif`;
  const maxWidth = canvasWidth - 80;
  while (ctx.measureText(text).width > maxWidth && fontSize > 14) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif`;
  }
  // Subtle background bar for a beautiful framed look
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, canvasWidth, headerHeight);
  ctx.fillStyle = "#000000";
  ctx.direction = "rtl";
  ctx.fillText(text, canvasWidth / 2, headerHeight / 2);
  // Bold bottom border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(canvasWidth, headerHeight);
  ctx.stroke();
  ctx.restore();
}

// Generate a PDF blob from a canvas (map render) with Urdu header on top
export async function canvasToPdfBlob(canvas, mapData, pageOrientation = "landscape", pageSize = "A4") {
  await ensureFont();

  // Cap source canvas to avoid black/blank output on large maps
  let srcCanvas = canvas;
  const MAX_W = 2400;
  if (canvas.width > MAX_W) {
    const r = MAX_W / canvas.width;
    const scaled = document.createElement("canvas");
    scaled.width = MAX_W;
    scaled.height = Math.round(canvas.height * r);
    const sctx = scaled.getContext("2d");
    sctx.fillStyle = "#ffffff";
    sctx.fillRect(0, 0, scaled.width, scaled.height);
    sctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
    srcCanvas = scaled;
  }

  // Create a new canvas with header space at top
  const headerH = Math.max(80, Math.round(srcCanvas.width * 0.09));
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = srcCanvas.width;
  fullCanvas.height = srcCanvas.height + headerH;
  const fctx = fullCanvas.getContext("2d");
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
  // Draw header text
  drawHeaderOnCanvas(fctx, mapData, fullCanvas.width, headerH);
  // Draw map below header
  fctx.drawImage(srcCanvas, 0, headerH);

  const imgData = fullCanvas.toDataURL("image/jpeg", 0.92);
  const orientation = pageOrientation === "portrait" ? "p" : "l";
  const pdf = new jsPDF(orientation, "mm", pageSize.toLowerCase());
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pw / fullCanvas.width, ph / fullCanvas.height);
  const iw = fullCanvas.width * ratio;
  const ih = fullCanvas.height * ratio;
  const ix = (pw - iw) / 2;
  const iy = 0; // top-align — no space above header
  pdf.addImage(imgData, "JPEG", ix, iy, iw, ih);
  return pdf.output("blob");
}

// Convert an SVG string to a canvas (scales up for quality, capped to avoid black/blank canvas)
export function svgToCanvas(svgString, scale = 2) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      let w = Math.max(1, Math.round(img.naturalWidth * scale));
      let h = Math.max(1, Math.round(img.naturalHeight * scale));
      // Cap output to avoid exceeding browser canvas limits (causes black/blank output)
      const MAX_W = 2400;
      if (w > MAX_W) { const r = MAX_W / w; w = MAX_W; h = Math.round(h * r); }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Fit an already-composited canvas (with header+footer already baked in) to a PDF page
// WITHOUT adding another header — use when the canvas already has header/footer
export async function canvasToPdfBlobRaw(canvas, pageOrientation = "landscape", pageSize = "A4") {
  // Cap canvas to avoid black output on very large maps
  let src = canvas;
  const MAX_W = 2400;
  if (canvas.width > MAX_W) {
    const r = MAX_W / canvas.width;
    const scaled = document.createElement("canvas");
    scaled.width = MAX_W;
    scaled.height = Math.round(canvas.height * r);
    const sctx = scaled.getContext("2d");
    sctx.fillStyle = "#ffffff";
    sctx.fillRect(0, 0, scaled.width, scaled.height);
    sctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
    src = scaled;
  }
  const imgData = src.toDataURL("image/jpeg", 0.92);
  const orientation = pageOrientation === "portrait" ? "p" : "l";
  const pdf = new jsPDF(orientation, "mm", pageSize.toLowerCase());
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pw / src.width, ph / src.height);
  const iw = src.width * ratio;
  const ih = src.height * ratio;
  const ix = (pw - iw) / 2;
  const iy = 0; // top-align — no space above
  pdf.addImage(imgData, "JPEG", ix, iy, iw, ih);
  return pdf.output("blob");
}

// Download a blob as a file
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Share a blob as a file using Web Share API
// Returns: "shared" | "unsupported" | "cancelled"
export async function shareBlob(blob, filename, title, text) {
  if (!navigator.share) return "unsupported";
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && !navigator.canShare({ files: [file] })) return "unsupported";
  try {
    await navigator.share({ files: [file], title, text });
    return "shared";
  } catch (e) {
    if (e.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}