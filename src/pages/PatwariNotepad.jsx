import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, Trash2, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

const PAGE_SIZES = {
  A4: { w: 210, h: 297, label: "A4 (210×297mm)" },
  Letter: { w: 216, h: 279, label: "Letter (216×279mm)" },
  Legal: { w: 216, h: 356, label: "Legal (216×356mm)" },
  A5: { w: 148, h: 210, label: "A5 (148×210mm)" },
};

const MARGINS = {
  none: { px: 0, label: "کوئی نہیں" },
  narrow: { px: 18, label: "تنگ" },
  normal: { px: 36, label: "نارمل" },
  wide: { px: 60, label: "چوڑا" },
};

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24];

export default function PatwariNotepad() {
  const navigate = useNavigate();
  const [pageSize, setPageSize] = useState("A4");
  const [margin, setMargin] = useState("normal");
  const [fontSize, setFontSize] = useState(13);
  const [title, setTitle] = useState("");
  const editorRef = useRef(null);

  const exec = useCallback((cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }, []);

  const handleFontSize = (size) => {
    setFontSize(size);
    // execCommand fontSize uses 1-7; instead set via span on selection
    document.execCommand("fontSize", false, "7");
    // replace the font-size=7 spans with actual px
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const spans = editorRef.current.querySelectorAll('font[size="7"]');
      spans.forEach((s) => {
        s.removeAttribute("size");
        s.style.fontSize = `${size}px`;
      });
    }
    editorRef.current?.focus();
  };

  const handleDownload = async () => {
    const editor = editorRef.current;
    if (!editor || !editor.innerText.trim()) {
      toast.error("پہلے کچھ لکھیں یا پیسٹ کریں");
      return;
    }
    const size = PAGE_SIZES[pageSize];
    const sheet = editorRef.current.closest("[data-sheet]");
    try {
      const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const doc = new jsPDF({ unit: "mm", format: [size.w, size.h], orientation: "portrait" });
      const imgW = size.w;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (imgH <= size.h) {
        doc.addImage(imgData, "PNG", 0, 0, imgW, imgH);
      } else {
        // multi-page slice
        let remaining = imgH;
        let pos = 0;
        const pageH = size.h;
        const pxPerMm = canvas.width / imgW;
        while (remaining > 0) {
          if (pos > 0) doc.addPage([size.w, size.h], "portrait");
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.min(canvas.height, Math.floor(pageH * pxPerMm));
          const sctx = sliceCanvas.getContext("2d");
          sctx.drawImage(canvas, 0, -pos * pxPerMm);
          doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, imgW, sliceCanvas.height / pxPerMm);
          remaining -= pageH;
          pos += pageH;
        }
      }
      doc.save(`${(title || "patwari-note").replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF ڈاؤن لوڈ ہو گیا");
    } catch (e) {
      toast.error("PDF بنانے میں مسئلہ");
    }
  };

  const handleClear = () => {
    if (!editorRef.current?.innerText.trim() && !title.trim()) return;
    if (confirm("سارا کاغذ صاف کر دیں؟")) {
      setTitle("");
      if (editorRef.current) editorRef.current.innerHTML = "";
    }
  };

  const ToolBtn = ({ onClick, title, children, active }) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors shrink-0 ${active ? "bg-cyan-500 text-white" : "text-white/80 hover:bg-white/15"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-300 flex flex-col">
      {/* Top toolbar */}
      <div className="sticky top-0 z-30 bg-[#1B2A3A] text-white shadow-lg">
        <div className="px-3 h-12 flex items-center gap-2">
          <button onClick={() => navigate("/canal-patwari")} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold tracking-wide">نوٹ پیج — پٹواری</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleClear} title="صاف کریں" className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-md transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={handleDownload} className="h-8 px-3 flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 rounded-md text-xs font-bold transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
        {/* Formatting toolbar */}
        <div className="px-3 h-10 flex items-center gap-1 border-t border-white/10 overflow-x-auto no-scrollbar">
          <ToolBtn onClick={() => exec("bold")} title="Bold (Ctrl+B)"><Bold className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("italic")} title="Italic (Ctrl+I)"><Italic className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("underline")} title="Underline (Ctrl+U)"><Underline className="w-4 h-4" /></ToolBtn>
          <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
          <ToolBtn onClick={() => exec("justifyLeft")} title="بائیں"><AlignLeft className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("justifyCenter")} title="درمیان"><AlignCenter className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("justifyRight")} title="دائیں"><AlignRight className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("justifyFull")} title="جسٹیفائی"><AlignJustify className="w-4 h-4" /></ToolBtn>
          <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
          <select
            value={fontSize}
            onChange={(e) => handleFontSize(parseInt(e.target.value))}
            className="appearance-none bg-white/10 text-white text-[11px] font-medium px-2 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none shrink-0"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s} className="text-slate-700">{s}px</option>
            ))}
          </select>
          <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
          <label className="text-[10px] text-white/50 shrink-0">پیج سائز</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
            className="appearance-none bg-white/10 text-white text-[11px] font-medium px-2 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none shrink-0"
          >
            {Object.entries(PAGE_SIZES).map(([k, v]) => (
              <option key={k} value={k} className="text-slate-700">{v.label}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
          <label className="text-[10px] text-white/50 shrink-0">مارجن</label>
          <select
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="appearance-none bg-white/10 text-white text-[11px] font-medium px-2 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none shrink-0"
          >
            {Object.entries(MARGINS).map(([k, v]) => (
              <option key={k} value={k} className="text-slate-700">{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hint */}
      <div className="bg-cyan-50 border-b border-cyan-200 px-4 py-1.5 text-[11px] text-cyan-700 text-center">
        وہائٹ پیج پر کلک کر کے WhatsApp سے ڈیٹا پیسٹ کریں — Bold / Alignment / مارجن لگائیں، پھر PDF ڈاؤن لوڈ کریں
      </div>

      {/* White document sheet */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center">
        <div
          data-sheet
          className="bg-white shadow-2xl w-full max-w-[760px] rounded-sm relative"
          style={{ aspectRatio: `${PAGE_SIZES[pageSize].w} / ${PAGE_SIZES[pageSize].h}` }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان (Title)…"
            className="w-full text-base font-bold text-slate-800 border-b border-slate-200 focus:outline-none placeholder:text-slate-300 text-center"
            style={{ padding: `${MARGINS[margin].px}px ${MARGINS[margin].px}px 8px` }}
            dir="auto"
          />
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            dir="auto"
            className="text-slate-700 leading-relaxed focus:outline-none overflow-y-auto"
            style={{
              padding: `${MARGINS[margin].px}px`,
              fontSize: `${fontSize}px`,
              minHeight: "400px",
              height: "calc(100% - 48px)",
              fontFamily: "inherit",
              whiteSpace: "pre-wrap",
            }}
            data-placeholder="یہاں لکھیں یا WhatsApp سے کاپی کر کے پیسٹ کریں…"
          />
        </div>
      </div>

      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #cbd5e1;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}