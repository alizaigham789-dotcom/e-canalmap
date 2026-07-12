import React, { useEffect, useRef, useState } from "react";
import { buildMapHeaderText } from "@/lib/gisEngine";

// Bordered single-line Urdu header box shown above the map in Print Preview / Export.
// Auto-shrinks font size so the full line always fits in one row.
export default function PrintHeaderBox({ mapData }) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(28);
  const headerText = buildMapHeaderText(mapData);

  const fitHeader = () => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;
    const maxW = wrap.clientWidth - 4;
    if (maxW <= 0) return;

    let size = 80;
    text.style.fontSize = `${size}px`;
    while (text.scrollWidth > maxW && size > 6) {
      size -= 1;
      text.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  };

  useEffect(() => {
    fitHeader();
    // Re-measure after Urdu web font finishes loading
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitHeader);
    }
    const t1 = setTimeout(fitHeader, 300);
    const t2 = setTimeout(fitHeader, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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