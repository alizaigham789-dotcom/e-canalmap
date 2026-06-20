import React from "react";

export const URDU_FONT = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

export const printStyles = `
  @media print {
    body { background: white !important; color: black !important; }
    .no-print { display: none !important; }
    .print-form { background: white !important; color: black !important; border: none !important; box-shadow: none !important; }
    input, textarea { border-bottom: 1px solid #333 !important; background: transparent !important; color: black !important; }
  }
`;

export function FormField({ label, value, onChange, width = "flex-1", placeholder = "_______________", multiline = false }) {
  return (
    <div className={`flex items-end gap-2 ${width}`} style={{ direction: "rtl" }}>
      {label && <span className="text-sm text-slate-700 shrink-0 whitespace-nowrap font-medium" style={{ fontFamily: URDU_FONT }}>{label}</span>}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 bg-transparent border-b-2 border-slate-300 focus:border-blue-500 outline-none text-slate-900 text-sm px-1 py-0.5 resize-none placeholder:text-slate-300"
          style={{ direction: "rtl", fontFamily: URDU_FONT }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-b-2 border-slate-300 focus:border-blue-500 outline-none text-slate-900 text-sm px-1 py-0.5 placeholder:text-slate-300"
          style={{ direction: "rtl", fontFamily: URDU_FONT }}
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
      <div className="print-form bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto shadow-lg">
        <div className="text-center mb-8 pb-4 border-b-2 border-blue-100">
          <h2 className="text-xl font-bold text-slate-800 mb-1" style={{ direction: "rtl", fontFamily: URDU_FONT }}>
            ❯ {title} ❮
          </h2>
          <p className="text-xs text-blue-600 font-mono font-medium">{titleEn}</p>
        </div>
        {children}
      </div>
    </>
  );
}