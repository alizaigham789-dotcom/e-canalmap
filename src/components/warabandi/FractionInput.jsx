import React from "react";

// مستطیل (top) / کلا (bottom) — fraction-style stacked inputs with a divider line
// Value stored as "top/bottom" in a single string field
export default function FractionInput({ value, onChange, placeholderTop, placeholderBottom, fontFamily }) {
  const str = String(value || "");
  const idx = str.indexOf("/");
  const top = idx >= 0 ? str.slice(0, idx) : str;
  const bottom = idx >= 0 ? str.slice(idx + 1) : "";

  const handleChange = (t, b) => {
    if (t === "" && b === "") onChange("");
    else if (b === "") onChange(t);
    else onChange(`${t}/${b}`);
  };

  const inpCls = "w-full bg-transparent outline-none text-[10px] text-slate-800 text-center px-0.5 py-0.5 placeholder:text-slate-300";
  const style = fontFamily ? { fontFamily } : undefined;

  return (
    <div className="flex flex-col w-full">
      <input value={top} onChange={e => handleChange(e.target.value, bottom)} placeholder={placeholderTop} dir="ltr" className={inpCls} style={style} />
      <div style={{ borderTop: "1.5px solid #334155", margin: "1px 0" }} />
      <input value={bottom} onChange={e => handleChange(top, e.target.value)} placeholder={placeholderBottom} dir="ltr" className={inpCls} style={style} />
    </div>
  );
}