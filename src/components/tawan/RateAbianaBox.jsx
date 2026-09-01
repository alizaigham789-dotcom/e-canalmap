import React from "react";
import { Input } from "@/components/ui/input";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// ── Khareef crops (خریف) with per-acre abiana rates ──────────────────────
const KHAREEF_CROPS = [
  { crop: "چاول", rate: 2000 },
  { crop: "کپاس", rate: 1000 },
  { crop: "مونگ پھلی", rate: 1200 },
  { crop: "باغ", rate: 1000 },
  { crop: "کمند", rate: 1600 },
];
// ── Rabeeh crops (ربیع) with per-acre abiana rates ──────────────────────
const RABEEH_CROPS = [
  { crop: "چنا", rate: 200 },
  { crop: "گندم", rate: 400 },
  { crop: "خالی", rate: 400 },
  { crop: "دیگر", rate: 400 },
];

// Crop → season lookup (used by fix-rate mode to pick Khareef/Rabeeh rate).
const CROP_SEASON = {};
KHAREEF_CROPS.forEach((c) => (CROP_SEASON[c.crop] = "k"));
RABEEH_CROPS.forEach((c) => (CROP_SEASON[c.crop] = "r"));
CROP_SEASON["خریف"] = "k";
CROP_SEASON["ربیع"] = "r";

export const DEFAULT_RATE_CONFIG = {
  mode: "manual", // "manual" | "fix" | "fasal"
  fixRate1: 1650, // خریف rate per acre
  fixRate2: 850, // ربیع rate per acre
  selectedCrop: "", // active fasal picked in fasal-war mode (default for new rows)
  cropRates: [
    ...KHAREEF_CROPS.map((c) => ({ ...c, season: "k" })),
    ...RABEEH_CROPS.map((c) => ({ ...c, season: "r" })),
  ],
};

// Abiana is calculated from a per-ACRE rate. Raqba is entered in KANAL,
// so acres = raqba / 8 (1 acre = 8 kanal).
export function computeAbiana(row, cfg) {
  const area = parseFloat(row.area) || 0;
  const acres = area / 8;
  if (cfg.mode === "fix") {
    // Pick Khareef or Rabeeh rate based on the row's crop season.
    const season = CROP_SEASON[row.crop] || "r";
    const rate = season === "k" ? (cfg.fixRate1 || 0) : (cfg.fixRate2 || 0);
    return Math.round(rate * acres);
  }
  if (cfg.mode === "fasal") {
    const cr = (cfg.cropRates || []).find((c) => c.crop === row.crop);
    return cr ? Math.round((cr.rate || 0) * acres) : 0;
  }
  return parseFloat(row.abiana) || 0; // manual
}

export default function RateAbianaBox({ config, onChange }) {
  const cfg = { ...DEFAULT_RATE_CONFIG, ...config };
  const update = (patch) => onChange({ ...cfg, ...patch });

  const seasonOf = (c) => c.season || CROP_SEASON[c.crop] || "r";
  const khareefRows = (cfg.cropRates || []).map((c, i) => ({ c, i })).filter((x) => seasonOf(x.c) === "k");
  const rabeehRows = (cfg.cropRates || []).map((c, i) => ({ c, i })).filter((x) => seasonOf(x.c) === "r");

  const editCrop = (i, key, val) => {
    const n = [...(cfg.cropRates || [])];
    n[i] = { ...n[i], [key]: key === "rate" ? parseFloat(val) || 0 : val };
    update({ cropRates: n });
  };

  return (
    <div dir="rtl" className="border-2 border-slate-300 rounded-lg bg-slate-50 p-3 mb-3" style={{ fontFamily: URDU }}>
      <p className="text-sm font-bold text-slate-700 mb-2">ریٹ آبیانہ</p>

      {/* Mode selector — 3 options */}
      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="ratemode" checked={cfg.mode === "fix"} onChange={() => update({ mode: "fix" })} className="w-3.5 h-3.5" />
          مقررہ ریٹ
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="ratemode" checked={cfg.mode === "fasal"} onChange={() => update({ mode: "fasal" })} className="w-3.5 h-3.5" />
          فصلوار ریٹ
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="ratemode" checked={cfg.mode === "manual"} onChange={() => update({ mode: "manual" })} className="w-3.5 h-3.5" />
          دستی
        </label>
      </div>

      {/* Fix rate — خریف / ربیع, both per acre; row crop picks the season */}
      {cfg.mode === "fix" && (
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <label className="flex items-center gap-1.5">
            <span>خریف ریٹ:</span>
            <Input type="number" value={cfg.fixRate1} onChange={(e) => update({ fixRate1: parseFloat(e.target.value) || 0 })} className="h-8 w-24 text-center" />
          </label>
          <label className="flex items-center gap-1.5">
            <span>ربیع ریٹ:</span>
            <Input type="number" value={cfg.fixRate2} onChange={(e) => update({ fixRate2: parseFloat(e.target.value) || 0 })} className="h-8 w-24 text-center" />
          </label>
          <span className="text-[11px] text-slate-500">فی ایکڑ (۸ کنال) — فصل کے موسم سے ریٹ خودکار — آبیانہ = ریٹ × رقبہ ÷ ۸</span>
        </div>
      )}

      {/* Fasal war rate — pick a fasal (crop) first; its rate applies per acre */}
      {cfg.mode === "fasal" && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">خریف فصل — منتخب کریں</p>
            <div className="flex flex-wrap gap-1.5">
              {khareefRows.map((x) => (
                <button
                  key={x.i}
                  onClick={() => update({ selectedCrop: x.c.crop })}
                  className={`px-2.5 py-1 rounded-full text-xs border transition ${cfg.selectedCrop === x.c.crop ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-emerald-400"}`}
                  style={{ fontFamily: URDU }}
                >
                  {x.c.crop} ({x.c.rate})
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">ربیع فصل — منتخب کریں</p>
            <div className="flex flex-wrap gap-1.5">
              {rabeehRows.map((x) => (
                <button
                  key={x.i}
                  onClick={() => update({ selectedCrop: x.c.crop })}
                  className={`px-2.5 py-1 rounded-full text-xs border transition ${cfg.selectedCrop === x.c.crop ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-emerald-400"}`}
                  style={{ fontFamily: URDU }}
                >
                  {x.c.crop} ({x.c.rate})
                </button>
              ))}
            </div>
          </div>

          {/* Selected fasal — show / edit its per-acre rate */}
          {cfg.selectedCrop && (() => {
            const idx = (cfg.cropRates || []).findIndex((c) => c.crop === cfg.selectedCrop);
            if (idx < 0) return null;
            const cr = cfg.cropRates[idx];
            return (
              <div className="flex flex-wrap gap-2 items-center text-sm border-t border-slate-200 pt-2">
                <span className="font-semibold text-slate-700">منتخب فصل:</span>
                <span className="font-bold text-emerald-700" style={{ fontFamily: URDU }}>{cr.crop}</span>
                <label className="flex items-center gap-1.5">
                  <span>ریٹ:</span>
                  <Input
                    type="number"
                    value={cr.rate}
                    onChange={(e) => editCrop(idx, "rate", e.target.value)}
                    className="h-8 w-24 text-center"
                  />
                  <span className="text-[11px] text-slate-500">فی ایکڑ</span>
                </label>
              </div>
            );
          })()}

          <p className="text-[11px] text-slate-500">آبیانہ = فصل کا ریٹ × رقبہ ÷ ۸ (کنال سے ایکڑ) — نئی قطار میں منتخب فصل خود درج ہو جائے گی</p>
        </div>
      )}

      {/* Manual */}
      {cfg.mode === "manual" && (
        <p className="text-[11px] text-slate-500">ہر قطار میں آبیانہ دستی درج کریں۔</p>
      )}
    </div>
  );
}