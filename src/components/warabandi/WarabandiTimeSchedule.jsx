import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, Clock } from "lucide-react";

// Days of week in Urdu
const URDU_DAYS = ["سوموار", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار"];
const URDU_AM_PM = { am: "صبح", pm: "دوپہر", eve: "شام", night: "رات", midnight: "آدھی رات", earlyam: "الصبح" };

function formatUrduTime(totalMinutesFromStartOfWeek, startMinuteOfDay = 6 * 60) {
  // Week starts Monday 6:00 AM
  const weekMins = 7 * 24 * 60;
  const clipped = ((totalMinutesFromStartOfWeek % weekMins) + weekMins) % weekMins;

  const dayIndex = Math.floor(clipped / (24 * 60));
  const minuteInDay = clipped % (24 * 60);
  // Adjust for start of day offset: week-minute 0 = Monday 6:00 AM
  const actualMinInDay = (minuteInDay + startMinuteOfDay) % (24 * 60);

  const h = Math.floor(actualMinInDay / 60);
  const m = actualMinInDay % 60;
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");

  let period;
  if (h >= 0 && h < 1) period = URDU_AM_PM.midnight;
  else if (h >= 1 && h < 6) period = URDU_AM_PM.earlyam;
  else if (h >= 6 && h < 12) period = URDU_AM_PM.am;
  else if (h === 12) period = URDU_AM_PM.pm;
  else if (h >= 13 && h < 17) period = URDU_AM_PM.pm;
  else if (h >= 17 && h < 20) period = URDU_AM_PM.eve;
  else period = URDU_AM_PM.night;

  // Adjust dayIndex for the start offset
  const adjustedDay = dayIndex % 7;
  return `${URDU_DAYS[adjustedDay]} ${period} ${hh}:${mm} بجے`;
}

function formatUrduRange(startMins, endMins, startOfDay = 6 * 60) {
  return `${formatUrduTime(startMins, startOfDay)} سے لیکر ${formatUrduTime(endMins, startOfDay)} تک`;
}

export default function WarabandiTimeSchedule({ rows }) {
  const [cca, setCca] = useState("");
  const [startHour, setStartHour] = useState(6); // default 6 AM

  // Formula: time per acre = 168 * 7 * 60 / CCA  (min/acre per week)
  // Wait — formula given: 1 acre time = 168*7*60/cca  → that's (168×7×60)/cca = 70560/cca min per acre
  // But 7 days = 168 hrs per week, so 7*24*60 = 10080 min/week total
  // 168 hrs in a week is also 7 days → 168*60 = 10080 → formula: 10080/cca min/acre
  // User's formula: 168*7*60/cca = 70560/cca which would be ~7 weeks — likely intended as:
  // 1 week = 7 days = 7*24=168 hrs = 168*60=10080 min
  // so min/acre = 10080 / cca
  const ccaNum = parseFloat(cca) || 0;
  const minPerAcre = ccaNum > 0 ? (10080 / ccaNum) : 0;

  const schedule = useMemo(() => {
    if (!minPerAcre || !rows.length) return [];
    const startDayMins = startHour * 60; // minutes from midnight for start of day
    let cursor = 0; // minutes from start of week (Monday startHour)
    return rows.map((row, i) => {
      const acres = (parseFloat(row.area_acre) || 0) + (parseFloat(row.area_kanal) || 0) / 8 + (parseFloat(row.area_marla) || 0) / 160;
      const duration = acres * minPerAcre;
      const from = cursor;
      const to = cursor + duration;
      cursor = to;
      return {
        sr: row.sr_no || String(i + 1),
        name: row.owner_name || "—",
        acres: acres.toFixed(3),
        duration: Math.round(duration),
        from,
        to,
        range: formatUrduRange(from, Math.round(to), startDayMins),
      };
    });
  }, [rows, minPerAcre, startHour]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-emerald-50 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-emerald-800 font-heading">
            وارہ بندی جدول — Time Schedule
          </h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-slate-500 font-semibold">CCA (ایکڑ)</label>
            <input
              type="number"
              value={cca}
              onChange={e => setCca(e.target.value)}
              placeholder="مثال: 250"
              className="w-24 border border-emerald-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-slate-500 font-semibold">شروع (بجے)</label>
            <input
              type="number"
              min="0" max="23"
              value={startHour}
              onChange={e => setStartHour(parseInt(e.target.value) || 0)}
              className="w-16 border border-emerald-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 bg-white text-center"
            />
          </div>
          {ccaNum > 0 && (
            <div className="text-[10px] bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-1 text-emerald-700 font-mono">
              {minPerAcre.toFixed(2)} منٹ / ایکڑ
            </div>
          )}
        </div>
      </div>

      {!ccaNum ? (
        <div className="text-center py-8 text-slate-400">
          <Calculator className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">CCA درج کریں تا کہ جدول بنے</p>
          <p className="text-[10px] mt-1 text-slate-300">فارمولہ: وقت = 10080 ÷ CCA منٹ فی ایکڑ</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="bg-emerald-50 border-b border-slate-200">
                <th className="px-2 py-2 text-center border-r border-emerald-100 text-[10px] text-slate-600">#</th>
                <th className="px-2 py-2 text-right border-r border-emerald-100 text-[10px] text-slate-600" style={{ fontFamily: "serif" }}>نام مالک</th>
                <th className="px-2 py-2 text-center border-r border-emerald-100 text-[10px] text-slate-600">Acres</th>
                <th className="px-2 py-2 text-center border-r border-emerald-100 text-[10px] text-slate-600">مدت (منٹ)</th>
                <th className="px-2 py-2 text-right text-[10px] text-slate-600" style={{ fontFamily: "serif" }}>وقت / شیڈول</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-emerald-50/30"}`}>
                  <td className="px-2 py-2 text-center text-slate-500 border-r border-slate-50">{s.sr}</td>
                  <td className="px-2 py-2 text-right border-r border-slate-50" style={{ fontFamily: "serif", direction: "rtl" }}>{s.name}</td>
                  <td className="px-2 py-2 text-center border-r border-slate-50 font-mono text-emerald-700">{s.acres}</td>
                  <td className="px-2 py-2 text-center border-r border-slate-50 font-mono text-blue-700 font-semibold">{s.duration}</td>
                  <td className="px-2 py-2 text-right text-emerald-800 font-semibold" style={{ fontFamily: "serif", direction: "rtl", fontSize: "11px" }}>
                    {s.range}
                  </td>
                </tr>
              ))}
            </tbody>
            {schedule.length > 0 && (
              <tfoot>
                <tr className="bg-amber-50 border-t-2 border-slate-200 font-semibold">
                  <td colSpan={2} className="px-2 py-2 text-right text-xs text-slate-600" style={{ fontFamily: "serif" }}>مجموعہ</td>
                  <td className="px-2 py-2 text-center text-xs font-mono text-emerald-700">
                    {schedule.reduce((s, r) => s + parseFloat(r.acres), 0).toFixed(3)}
                  </td>
                  <td className="px-2 py-2 text-center text-xs font-mono text-blue-700">
                    {schedule.reduce((s, r) => s + r.duration, 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}