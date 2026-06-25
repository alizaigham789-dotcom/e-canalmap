import React from "react";

// High-fidelity 48×48 vector module icons (crisp on high-DPI / zoom).
// All use stroke="currentColor" so they inherit text-white on gradient cards.

export function MapEditorIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="36" height="36" rx="3" />
      <path d="M6 18h36M6 30h36M18 6v36M30 6v36" />
      <circle cx="24" cy="24" r="6" />
      <path d="M24 13v4M24 31v4M13 24h4M31 24h4" />
    </svg>
  );
}

export function WarabandiIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="6" width="34" height="36" rx="2" />
      <path d="M13 13h22M13 19h22M13 25h16" />
      <circle cx="33" cy="33" r="7" />
      <path d="M33 29.5v3.5l2.5 1.5" />
    </svg>
  );
}

export function KhalMismariIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 16h36M6 26h36" />
      <path d="M12 36l24-24" strokeWidth={3.2} />
      <path d="M6 16l3-3M39 16l3-3M6 26l3-3M39 26l3-3" />
    </svg>
  );
}

export function WarashikniIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="20" r="12" />
      <path d="M18 20l4 4 8-8" />
      <path d="M24 32v8M18 40h12" />
    </svg>
  );
}

export function TawanCaseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h12l4 4h20v22H6z" />
      <path d="M24 21v8" />
      <circle cx="24" cy="34" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TAFormIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="32" height="32" rx="2" />
      <path d="M8 18h32M8 28h32M20 8v32" />
      <circle cx="14" cy="14" r="2" fill="currentColor" stroke="none" />
      <circle cx="34" cy="34" r="2" fill="currentColor" stroke="none" />
      <path d="M14 14l8 6 12 14" strokeDasharray="3 3" />
    </svg>
  );
}

export function GeoMapIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="22" r="13" />
      <path d="M20 9v26M7 22h26M10 15h20M10 29h20" />
      <path d="M36 27c0 3 5 9 5 9s5-6 5-9a5 5 0 0 0-10 0z" fill="currentColor" fillOpacity="0.25" />
      <circle cx="41" cy="27" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DeputyCollectorIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h12l4 4h20v22H6z" />
      <text x="24" y="31" fontSize="11" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Rajdhani, sans-serif">33-C</text>
    </svg>
  );
}

export function ZilladarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="8" width="28" height="32" rx="2" />
      <path d="M10 12a4 4 0 0 0 4-4M38 12a4 4 0 0 1-4-4" />
      <path d="M16 16h16M16 22h16M16 28h10" />
    </svg>
  );
}

export function GroupChatIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="8" width="26" height="18" rx="5" opacity="0.45" />
      <path d="M8 16a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H18l-6 6v-6a4 4 0 0 1-4-4z" />
      <path d="M14 18h12M14 22h8" />
    </svg>
  );
}