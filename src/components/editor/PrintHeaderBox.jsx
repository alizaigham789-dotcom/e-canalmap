import React, { useEffect, useRef, useState } from "react";
import { buildMapHeaderText } from "@/lib/gisEngine";

// Bordered single-line Urdu header box shown above the map in Print Preview / Export.
// Auto-shrinks font size so the full line always fits in one row.
export default function PrintHeaderBox({ mapData }) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(28);
  const headerText = buildMapHeaderText(mapData);

  useEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    const MAX_SIZE = 28;
    const MIN_SIZE = 8;
    let size = MAX_SIZE;
    text.style.fontSize = `${size}px`;

    while (text.scrollWidth > wrap.clientWidth - 4 && size > MIN_SIZE) {
      size -= 1;
      text.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [headerText]);

  return (
    <div ref={wrapRef} className="w-full px-3 py-1.5 mb-2 border-b-2 border-black flex items-center justify-center overflow-hidden bg-white shrink-0">
      <span
        ref={textRef}
        dir="rtl"
        className="whitespace-nowrap font-bold text-black"
        style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif", fontSize: `${fontSize}px` }}
      >
        {headerText}
      </span>
    </div>
  );
}