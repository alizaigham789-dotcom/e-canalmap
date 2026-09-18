import React from "react";

// Visual patwari stamp / seal — a circular red seal overlaid on the task card
// when the patwari has approved/submitted the task. Shows APPROVED or RESOLVED
// with the patwari name + halqa + date. Purely presentational.
export default function TaskStamp({ stampText, stampedAt, status }) {
  if (!stampText && !stampedAt) return null;
  const isApproved = status === "approved";
  const label = isApproved ? "APPROVED" : "RESOLVED";
  const dateStr = stampedAt ? new Date(stampedAt).toLocaleDateString("en-GB") : "";
  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="flex flex-col items-center justify-center rounded-full border-[2.5px] rotate-[-12deg] select-none"
        style={{
          width: 92,
          height: 92,
          borderColor: isApproved ? "#16a34a" : "#dc2626",
          color: isApproved ? "#16a34a" : "#dc2626",
          borderWidth: "2.5px",
          borderStyle: "solid",
          padding: "4px 6px",
          textAlign: "center",
          opacity: 0.88,
          fontFamily: "'Rajdhani', sans-serif",
        }}
      >
        <span className="text-[9px] font-bold tracking-wider leading-none">{label}</span>
        <span className="text-[7px] font-semibold leading-tight mt-0.5 px-1 truncate w-full" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
          {stampText || ""}
        </span>
        {dateStr && <span className="text-[7px] font-semibold leading-none mt-0.5">{dateStr}</span>}
        <span className="text-[6px] font-bold tracking-wider leading-none mt-0.5 opacity-80">PATWARI SEAL</span>
      </div>
    </div>
  );
}