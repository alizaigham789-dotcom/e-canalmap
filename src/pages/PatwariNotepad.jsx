import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Trash2, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const PAGE_SIZES = {
  A4: { w: 210, h: 297, label: "A4 (210×297mm)" },
  Letter: { w: 216, h: 279, label: "Letter (216×279mm)" },
  Legal: { w: 216, h: 356, label: "Legal (216×356mm)" },
  A5: { w: 148, h: 210, label: "A5 (148×210mm)" },
};

export default function PatwariNotepad() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [pageSize, setPageSize] = useState("A4");
  const [title, setTitle] = useState("");
  const sheetRef = useRef(null);

  const handleDownload = () => {
    if (!text.trim()) {
      toast.error("پہلے کچھ لکھیں یا پیسٹ کریں");
      return;
    }
    const size = PAGE_SIZES[pageSize];
    const doc = new jsPDF({ unit: "mm", format: [size.w, size.h], orientation: "portrait" });
    const margin = 15;
    const maxWidth = size.w - margin * 2;
    const lineHeight = 6;

    // Title
    let y = margin;
    if (title.trim()) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(title, margin, y);
      y += 8;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = text.split("\n");
    for (const raw of lines) {
      if (y > size.h - margin) {
        doc.addPage([size.w, size.h], "portrait");
        y = margin;
      }
      const wrapped = doc.splitTextToSize(raw || " ", maxWidth);
      for (const ln of wrapped) {
        if (y > size.h - margin) {
          doc.addPage([size.w, size.h], "portrait");
          y = margin;
        }
        doc.text(ln, margin, y);
        y += lineHeight;
      }
    }
    doc.save(`${(title || "patwari-note").replace(/\s+/g, "_")}.pdf`);
    toast.success("PDF ڈاؤن لوڈ ہو گیا");
  };

  const handleClear = () => {
    if (!text.trim() && !title.trim()) return;
    if (confirm("سارا کاغذ صاف کر دیں؟")) {
      setText("");
      setTitle("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-[#1B2A3A] text-white px-3 h-12 flex items-center gap-2 shadow-lg">
        <button onClick={() => navigate("/canal-patwari")} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <FileText className="w-4 h-4 text-cyan-300 shrink-0" />
        <span className="text-xs font-bold tracking-wide">نوٹ پیج — پٹواری</span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
            className="appearance-none bg-white/10 text-white text-[11px] font-medium px-2 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 focus:outline-none"
          >
            {Object.entries(PAGE_SIZES).map(([k, v]) => (
              <option key={k} value={k} className="text-slate-700">{v.label}</option>
            ))}
          </select>
          <button onClick={handleClear} title="صاف کریں" className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-md transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={handleDownload} className="h-8 px-3 flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 rounded-md text-xs font-bold transition-colors">
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="bg-cyan-50 border-b border-cyan-200 px-4 py-1.5 text-[11px] text-cyan-700 text-center">
        وہائٹ پیج پر کلک کر کے WhatsApp سے ڈیٹا پیسٹ کریں — نوٹ پیڈ کی طرح لکھیں، اوپر PDF ڈاؤن لوڈ کریں
      </div>

      {/* White sheet */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center">
        <div
          ref={sheetRef}
          className="bg-white shadow-xl w-full max-w-[760px] min-h-[600px] rounded-sm"
          style={{ aspectRatio: `${PAGE_SIZES[pageSize].w} / ${PAGE_SIZES[pageSize].h}` }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان (Title)…"
            className="w-full px-6 pt-6 pb-2 text-base font-bold text-slate-800 border-b border-slate-200 focus:outline-none placeholder:text-slate-300"
            dir="auto"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="یہاں لکھیں یا WhatsApp سے کاپی کر کے پیسٹ کریں…"
            className="w-full px-6 py-4 text-sm text-slate-700 leading-relaxed resize-none focus:outline-none placeholder:text-slate-300"
            style={{ minHeight: "500px", fontFamily: "inherit" }}
            dir="auto"
          />
        </div>
      </div>
    </div>
  );
}