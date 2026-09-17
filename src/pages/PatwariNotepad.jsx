import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, Trash2, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Columns2, Square,
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

const FONTS = [
  { key: "jameel", label: "Jameel Noori Nastaleeq", family: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif", dir: "rtl" },
  { key: "nastaliq", label: "Noto Nastaliq Urdu", family: "'Noto Nastaliq Urdu', serif", dir: "rtl" },
  { key: "inter", label: "Inter (English)", family: "'Inter', sans-serif", dir: "ltr" },
  { key: "serif", label: "Serif", family: "serif", dir: "ltr" },
];

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24];

export default function PatwariNotepad() {
  const navigate = useNavigate();
  const [pageSize, setPageSize] = useState("A4");
  const [margin, setMargin] = useState("normal");
  const [fontKey, setFontKey] = useState("jameel");
  const [fontSize, setFontSize] = useState(14);
  const [title, setTitle] = useState("");
  const [twoColumn, setTwoColumn] = useState(false);
  const editorRef = useRef(null);
  const urduRef = useRef(null);
  const englishRef = useRef(null);

  const activeEditor = twoColumn ? null : editorRef.current;
  const font = FONTS.find((f) => f.key === fontKey) || FONTS[0];

  const exec = useCallback((cmd, value = null) => {
    document.execCommand(cmd, false, value);
    (editorRef.current || urduRef.current || englishRef.current)?.focus();
  }, []);

  const handleFontSize = (size) => {
    setFontSize(size);
    document.execCommand("fontSize", false, "7");
    const root = editorRef.current || urduRef.current || englishRef.current;
    if (root) {
      root.querySelectorAll('font[size="7"]').forEach((s) => {
        s.removeAttribute("size");
        s.style.fontSize = `${size}px`;
      });
    }
    root?.focus();
  };

  const captureSheet = () => editorRef.current?.closest("[data-sheet]");

  const handleDownload = async () => {
    const sheet = captureSheet();
    const hasContent = twoColumn
      ? (urduRef.current?.innerText.trim() || englishRef.current?.innerText.trim())
      : editorRef.current?.innerText.trim();
    if (!sheet || !hasContent) {
      toast.error("پہلے کچھ لکھیں یا پیسٹ کریں");
      return;
    }
    const size = PAGE_SIZES[pageSize];
    try {
      const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const doc = new jsPDF({ unit: "mm", format: [size.w, size.h], orientation: "portrait" });
      const imgW = size.w;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (imgH <= size.h) {
        doc.addImage(imgData, "PNG", 0, 0, imgW, imgH);
      } else {
        const pxPerMm = canvas.width / imgW;
        const pageH = size.h;
        let pos = 0;
        let remaining = imgH;
        while (remaining > 0) {
          if (pos > 0) doc.addPage([size.w, size.h], "portrait");
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = Math.min(canvas.height, Math.floor(pageH * pxPerMm));
          const sctx = slice.getContext("2d");
          sctx.drawImage(canvas, 0, -pos * pxPerMm);
          doc.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, imgW, slice.height / pxPerMm);
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
    const any = title.trim() || editorRef.current?.innerText.trim() ||
      urduRef.current?.innerText.trim() || englishRef.current?.innerText.trim();
    if (!any) return;
    if (confirm("سارا کاغذ صاف کر دیں؟")) {
      setTitle("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      if (urduRef.current) urduRef.current.innerHTML = "";
      if (englishRef.current) englishRef.current.innerHTML = "";
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

  const editorCommon = {
    contentEditable: true,
    suppressContentEditableWarning: true,
    className: "text-slate-700 leading-loose focus:outline-none overflow-y-auto",
    style: { fontSize: `${fontSize}px`, fontFamily: font.family, minHeight: "360px", whiteSpace: "pre-wrap" },
  };

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
          <ToolBtn onClick={() => exec("bold")} title="Bold"><Bold className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("italic")} title="Italic"><Italic className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("underline")} title="Underline"><Underline className="w-4 h-4" /></ToolBtn>
          <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
          <ToolBtn onClick={() => exec("justifyLeft")} title="بائیں"><AlignLeft className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("justifyCenter")} title="درمیان"><AlignCenter className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("justifyRight")} title="دائیں"><AlignRight className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("justifyFull")} title="جسٹیفائی"><AlignJustify className="w-4 h-4" /></ToolBtn>
          <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
          <select
            value={fontKey}
            onChange={(e) => setFontKey(e.target.value)}
            className="appearance-none bg-white/10 text-white text-[11px] font-medium px-2 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none shrink-0"
            style={{ fontFamily: font.family }}
          >
            {FONTS.map((f) => (
              <option key={f.key} value={f.key} className="text-slate-700" style={{ fontFamily: f.family }}>{f.label}</option>
            ))}
          </select>
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
          <ToolBtn onClick={() => setTwoColumn(false)} title="سنگل پیج" active={!twoColumn}><Square className="w-4 h-4" /></ToolBtn>
          <ToolBtn onClick={() => setTwoColumn(true)} title="اردو + انگلش سائیڈ" active={twoColumn}><Columns2 className="w-4 h-4" /></ToolBtn>
          <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
          <label className="text-[10px] text-white/50 shrink-0">پیج</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
            className="appearance-none bg-white/10 text-white text-[11px] font-medium px-2 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none shrink-0"
          >
            {Object.entries(PAGE_SIZES).map(([k, v]) => (
              <option key={k} value={k} className="text-slate-700">{v.label}</option>
            ))}
          </select>
          <label className="text-[10px] text-white/50 shrink-0 ml-1">مارجن</label>
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
        وہائٹ پیج پر کلک کر کے WhatsApp سے ڈیٹا پیسٹ کریں — فونٹ / Bold / Alignment / مارجن لگائیں، پھر PDF ڈاؤن لوڈ کریں
      </div>

      {/* White document sheet — single shared margin */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center">
        <div
          data-sheet
          className="bg-white shadow-2xl w-full max-w-[760px] rounded-sm relative"
          style={{ aspectRatio: `${PAGE_SIZES[pageSize].w} / ${PAGE_SIZES[pageSize].h}` }}
        >
          <div style={{ padding: `${MARGINS[margin].px}px` }}>
            {/* Title — centered, shared margin */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان (Title)…"
              dir="auto"
              className="w-full text-base font-bold text-slate-800 text-center border-b border-slate-200 focus:outline-none placeholder:text-slate-300 pb-2 mb-3"
            />

            {!twoColumn ? (
              <div
                ref={editorRef}
                {...editorCommon}
                dir={font.dir}
                style={{ ...editorCommon.style, minHeight: "400px" }}
                data-placeholder="یہاں لکھیں یا WhatsApp سے کاپی کر کے پیسٹ کریں…"
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="pr-4" style={{ borderRight: "1px solid #e2e8f0" }}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">English</div>
                  <div
                    ref={englishRef}
                    {...editorCommon}
                    dir="ltr"
                    style={{ ...editorCommon.style, fontFamily: "'Inter', sans-serif", minHeight: "400px" }}
                    data-placeholder="Type in English…"
                  />
                </div>
                <div className="pl-4">
                  <div className="text-[10px] font-bold text-slate-400 mb-1" style={{ fontFamily: "'Jameel Noori Nastaleeq', serif" }}>اردو</div>
                  <div
                    ref={urduRef}
                    {...editorCommon}
                    dir="rtl"
                    style={{ ...editorCommon.style, fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif", minHeight: "400px" }}
                    data-placeholder="یہاں اردو میں لکھیں…"
                  />
                </div>
              </div>
            )}
          </div>
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