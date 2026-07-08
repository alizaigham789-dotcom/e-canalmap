import React, { useEffect, useRef, useState } from "react";

// Single-line Urdu header shown at the top of the Map Editor.
// Auto-shrinks font size so the full line always fits in one row.
export default function MapHeaderLine({ mapData }) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(28);

  const number = mapData?.moga_number || "_____";
  const side = mapData?.mogha_side || "";
  const rajbah = mapData?.rajbah || "_____";
  const village = mapData?.village || "_____";
  const zilladarSection = mapData?.zilladar_section || "_____";
  const tehsil = mapData?.tehsil || "_____";
  const district = mapData?.district || "_____";

  const headerText = `خاکہ دستی موگہ نمبری${number}${side ? `/${side}` : ""}، راجباہ ${rajbah}،موضع ${village}، ضلعداری سیکشن ${zilladarSection}، سب ڈویژن ${tehsil} ڈویژن ${district}`;

  useEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    const MAX_SIZE = 28;
    const MIN_SIZE = 10;
    let size = MAX_SIZE;
    text.style.fontSize = `${size}px`;

    while (text.scrollWidth > wrap.clientWidth && size > MIN_SIZE) {
      size -= 1;
      text.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [headerText]);

  return (
    <div ref={wrapRef} className="w-full px-4 py-1.5 bg-white border-b border-slate-200 overflow-hidden">
      <p
        ref={textRef}
        dir="rtl"
        className="whitespace-nowrap text-center font-bold text-slate-900"
        style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif", fontSize: `${fontSize}px`, lineHeight: 1.6 }}
      >
        {headerText}
      </p>
    </div>
  );
}