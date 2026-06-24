import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Droplets } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function Warashikni() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-bold font-heading text-slate-800">Warashikni</h1>
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">وارشکنی</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-16 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
          <Droplets className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-lg font-bold font-heading text-slate-800 mb-2">Warashikni Module</h2>
        <p className="text-sm text-slate-500 mb-6">This module is under development. Water distribution measurement records will be available here.</p>
        <Link to="/">
          <Button variant="outline" className="gap-2 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Button>
        </Link>
      </main>

      <BottomNav />
    </div>
  );
}