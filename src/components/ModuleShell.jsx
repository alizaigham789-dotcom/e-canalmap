import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ModuleShell({ title, titleUrdu, Icon, gradient, children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 antialiased">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
          </button>
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md ring-1 ring-white/20 shrink-0`}>
            <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold font-heading tracking-wide text-slate-800 truncate">{title}</h1>
            <p className="text-[10px] text-slate-400" style={{ fontFamily: "serif" }}>{titleUrdu}</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">{children}</main>
    </div>
  );
}