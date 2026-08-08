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
  ctx.textBaseline = "top";
  let fontSize = Math.min(48, canvasWidth / 20);
  ctx.font = `bold ${fontSize}px "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif`;
  const maxWidth = canvasWidth - 40;
  while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif`;
  }
  ctx.fillStyle = "#000000";
  // RTL text — canvas doesn't fully support RTL shaping, but the font handles it
  ctx.direction = "rtl";
  ctx.fillText(text, canvasWidth / 2, 8);
  ctx.restore();
}

// Generate a PDF blob from a canvas (map render) with Urdu header on top
export async function canvasToPdfBlob(canvas, mapData, pageOrientation = "landscape", pageSize = "A4") {
  await ensureFont();

  // Create a new canvas with header space at top
  const headerH = Math.max(60, Math.round(canvas.width * 0.06));
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = canvas.width;
  fullCanvas.height = canvas.height + headerH;
  const fctx = fullCanvas.getContext("2d");
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
  // Draw header text
  drawHeaderOnCanvas(fctx, mapData, fullCanvas.width, headerH);
  // Draw map below header
  fctx.drawImage(canvas, 0, headerH);

  const imgData = fullCanvas.toDataURL("image/jpeg", 0.92);
  const orientation = pageOrientation === "portrait" ? "p" : "l";
  const pdf = new jsPDF(orientation, "mm", pageSize.toLowerCase());
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pw / fullCanvas.width, ph / fullCanvas.height);
  const iw = fullCanvas.width * ratio;
  const ih = fullCanvas.height * ratio;
  const ix = (pw - iw) / 2;
  const iy = (ph - ih) / 2;
  pdf.addImage(imgData, "JPEG", ix, iy, iw, ih);
  return pdf.output("blob");
}

// Convert an SVG string to a canvas (scales up for quality)
export function svgToCanvas(svgString, scale = 2) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
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