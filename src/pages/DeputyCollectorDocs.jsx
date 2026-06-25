import React from "react";
import { Landmark, FileBadge2, ChevronRight } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";

const SUB_MODULES = [
  { id: "33c", label: "33-C", labelUrdu: "۳۳-سی", desc: "Deputy Collector 33-C proceeding" },
];

export default function DeputyCollectorDocs() {
  return (
    <ModuleShell title="DEPUTY COLLECTOR" titleUrdu="ڈپٹی کلکٹر دستاویزات" Icon={Landmark} gradient="from-emerald-400 to-green-300">
      <p className="text-xs text-slate-500 mb-5">
        Official forms, records and documents related to the Deputy Collector office.
      </p>
      <div className="space-y-3">
        {SUB_MODULES.map((s) => (
          <button
            key={s.id}
            className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 hover:shadow-md hover:ring-emerald-200 transition-all text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-green-300 flex items-center justify-center shadow-md shadow-emerald-400/25 ring-1 ring-white/20 shrink-0">
              <FileBadge2 className="w-5 h-5 text-white" strokeWidth={2} />
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