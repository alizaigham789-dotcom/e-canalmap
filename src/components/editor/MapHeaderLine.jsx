import React, { useEffect, useRef, useState } from "react";
import { buildMapHeaderText } from "@/lib/gisEngine";

// Single-line Urdu header shown at the top of the Map Editor.
// Auto-shrinks font size so the full line always fits in one row.
export default function MapHeaderLine({ mapData }) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(28);

  const headerText = buildMapHeaderText(mapData);

  useEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    // On small screens the text wraps (whitespace-normal), so the auto-shrink
    // loop (which relies on scrollWidth exceeding the nowrap container) would
    // never trigger. Use a smaller fixed size on mobile and keep the auto-shrink
    // for tablet/desktop where the single-line fit matters.
    const isMobile = wrap.clientWidth < 480;
    const MAX_SIZE = isMobile ? 15 : 28;
    const MIN_SIZE = isMobile ? 13 : 10;
    let size = MAX_SIZE;
    text.style.fontSize = `${size}px`;

    while (text.scrollWidth > wrap.clientWidth && size > MIN_SIZE) {
      size -= 1;
      text.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [headerText]);

  return (
    <div ref={wrapRef} className="w-full px-3 sm:px-4 py-1.5 bg-white border-b border-slate-200 overflow-hidden">
      <p
        ref={textRef}
        dir="rtl"
        className="text-center font-bold text-slate-900 whitespace-normal sm:whitespace-nowrap"
        style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif", fontSize: `${fontSize}px`, lineHeight: 1.5 }}
      >
        {headerText}
      </p>
    </div>
  );
}