import React from "react";
import { ScrollText } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";

export default function ChakbandiIkhrajCase() {
  return (
    <ModuleShell title="CHAKBANDI IKHRAJ" titleUrdu="چکبندی اخراج کیس" Icon={ScrollText} gradient="from-indigo-400 to-purple-300">
      <p className="text-xs text-slate-500 mb-5" style={{ fontFamily: "serif" }}>
        چکبندی اخراج کیس دستاویزات اور ریکارڈ۔
      </p>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 text-center">
        <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-xs text-slate-400" style={{ fontFamily: "serif" }}>
          دستاویزات جلد ہی دستیاب ہوں گی۔
        </p>
      </div>
    </ModuleShell>
  );
}