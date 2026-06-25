import React from "react";

export default function DepartmentalSection({ titleUrdu, titleEn, children }) {
  return (
    <div className="mb-4">
      <div
        className="flex items-center justify-center gap-3 py-2 mb-3 border-y-2 border-slate-800 bg-slate-100"
        style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
      >
        <span className="text-base font-bold text-slate-900" dir="rtl">{titleUrdu}</span>
        {titleEn && (
          <span className="text-xs text-slate-500 hidden sm:inline">({titleEn})</span>
        )}
      </div>
      {children}
    </div>
  );
}