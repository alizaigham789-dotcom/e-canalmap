import React from "react";
import { useNavigate } from "react-router-dom";
import { BookMarked, ChevronRight, ClipboardList, StickyNote } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";

const SUB_MODULES = [
  { id: "mytasks", label: "My Assigned Tasks", labelUrdu: "میرے مقرر کردہ ٹاسکس", desc: "DC کی مقرر کردہ ایپلیکیشنز — آپ کے موضع/سیکشن" },
  { id: "naqsha27b", label: "Naqsha 27-B", labelUrdu: "نقشہ نمبر 27B", desc: "انڈیکس کاغزات — Canal document index" },
  { id: "notepad", label: "Notepad", labelUrdu: "نوٹ پیج", desc: "WhatsApp سے ڈیٹا پیسٹ کریں — PDF ڈاؤن لوڈ" },
];

export default function CanalPatwari() {
  const navigate = useNavigate();
  const handleClick = (s) => {
    if (s.id === "naqsha27b") navigate("/canal-patwari/naqsha-27b");
    else if (s.id === "mytasks") navigate("/canal-patwari/my-tasks");
    else if (s.id === "notepad") navigate("/canal-patwari/notepad");
  };
  return (
    <ModuleShell title="CANAL PATWARI" titleUrdu="کنال پٹواری" Icon={BookMarked} gradient="from-cyan-400 to-teal-300">
      <p className="text-xs text-slate-500 mb-5" style={{ fontFamily: "serif" }}>
        کنال پٹواری دستاویزات اور نقشہ جات۔
      </p>
      <div className="space-y-3">
        {SUB_MODULES.map((s) => (
          <button
            key={s.id}
            onClick={() => handleClick(s)}
            className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 hover:shadow-md hover:ring-cyan-200 transition-all text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-300 flex items-center justify-center shadow-md shadow-cyan-400/25 ring-1 ring-white/20 shrink-0">
              {s.id === "mytasks" ? <ClipboardList className="w-5 h-5 text-white" strokeWidth={2} /> : s.id === "notepad" ? <StickyNote className="w-5 h-5 text-white" strokeWidth={2} /> : <BookMarked className="w-5 h-5 text-white" strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-700">{s.label}</p>
              <p className="text-[10px] text-slate-400" style={{ fontFamily: "serif" }}>{s.labelUrdu}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{s.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={2.2} />
          </button>
        ))}
      </div>
    </ModuleShell>
  );
}