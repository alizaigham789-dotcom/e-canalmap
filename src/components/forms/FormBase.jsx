import React from "react";

// Shared styles for print
export const printStyles = `
  @media print {
    body { background: white !important; color: black !important; }
    .no-print { display: none !important; }
    .print-form { background: white !important; color: black !important; border: none !important; box-shadow: none !important; }
    input, textarea { border-bottom: 1px solid #333 !important; background: transparent !important; color: black !important; }
    .form-title { color: black !important; }
  }
`;

export function FormField({ label, value, onChange, width = "flex-1", placeholder = "_______________", multiline = false }) {
  return (
    <div className={`flex items-end gap-2 ${width}`} style={{ direction: "rtl" }}>
      {label && <span className="text-sm text-slate-300 shrink-0 whitespace-nowrap" style={{ fontFamily: "serif" }}>{label}</span>}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none text-white text-sm px-1 py-0.5 resize-none placeholder:text-slate-700"
          style={{ direction: "rtl", fontFamily: "serif" }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-b border-slate-600 focus:border-blue-400 outline-none text-white text-sm px-1 py-0.5 placeholder:text-slate-700"
          style={{ direction: "rtl", fontFamily: "serif" }}
        />
      )}
    </div>
  );
}

export function FormSection({ children, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`} style={{ direction: "rtl" }}>
      {children}
    </div>
  );
}

export function FormWrapper({ title, titleEn, children }) {
  return (
    <>
      <style>{printStyles}</style>
      <div className="print-form bg-slate-900/80 border border-slate-700 rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl">
        {/* Title */}
        <div className="text-center mb-8 pb-4 border-b border-slate-700">
          <h2 className="form-title text-xl font-bold text-white mb-1" style={{ direction: "rtl", fontFamily: "serif" }}>
            ❯ {title} ❮
          </h2>
          <p className="text-xs text-slate-500 font-mono">{titleEn}</p>
        </div>
        {children}
      </div>
    </>
  );
}