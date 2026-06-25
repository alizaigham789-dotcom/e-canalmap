import React from "react";

/**
 * Departmental-style header bar for Warabandi Parat.
 * Displays warabandi type, mogha number, canal, village, section, and sub-division
 * in a single RTL header line matching official irrigation department forms.
 */
export default function WarabandiHeaderBar({ data }) {
  const mogha = [data.mogha_side, data.mogha_number].filter(Boolean).join(" ");
  const type = data.warabandi_type || "پرت وارہ بندی";
  const canal = data.canal_name || "—";
  const village = data.village_name || "—";
  const section = data.division || "—";
  const subDiv = data.sub_division || "—";

  const Sep = () => <span className="mx-2" style={{ color: "#2c3e50" }}>—</span>;

  return (
    <div
      dir="rtl"
      className="text-center mb-4"
      style={{
        fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif",
        fontSize: "clamp(12px, 3.2vw, 20px)",
        border: "2px solid #2c3e50",
        padding: "12px",
        backgroundColor: "#f8f9fa",
        borderRadius: "6px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        color: "#2c3e50",
        fontWeight: "bold",
        lineHeight: 1.8,
      }}
    >
      {type}
      <Sep />
      موگہ نمبر: <span style={{ color: "#2980b9" }}>{mogha || "—"}</span>
      <Sep />
      راجباہ: <span style={{ color: "#27ae60" }}>{canal}</span>
      <Sep />
      موضع: <span style={{ color: "#7f8c8d" }}>{village}</span>
      <Sep />
      سیکشن: <span style={{ color: "#8e44ad" }}>{section}</span>
      <Sep />
      سب ڈویژن: <span style={{ color: "#c0392b" }}>{subDiv}</span>
    </div>
  );
}