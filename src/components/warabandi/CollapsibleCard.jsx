import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleCard({ title, titleUrdu, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-blue-500" />}
          <h3 className="text-sm font-bold text-slate-800 font-heading tracking-wide">{title}</h3>
          {titleUrdu && (
            <span className="text-xs text-slate-400" style={{ fontFamily: "serif" }}>{titleUrdu}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}