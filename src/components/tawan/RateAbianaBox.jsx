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
  { crop: "گنا", rate: 1800 },
];
// ── Rabeeh crops (ربیع) with per-acre abiana rates ──────────────────────
const RABEEH_CROPS = [
  { crop: "چنا", rate: 200 },
  { crop: "گندم", rate: 400 },
  { crop: "خالی", rate: 400 },
  { crop: "سرسوں", rate: 500 },
  { crop: "دیگر", rate: 400 },
];

// Crop → season lookup (used by fix-rate mode to pick Khareef/Rabeeh rate).
const CROP_SEASON = {};
KHAREEF_CROPS.forEach((c) => (CROP_SEASON[c.crop] = "k"));
RABEEH_CROPS.forEach((c) => (CROP_SEASON[c.crop] = "r"));
CROP_SEASON["خریف"] = "k";
CROP_SEASON["ربیع"] = "r";

export const DEFAULT_RATE_CONFIG = {
  mode: "fix", // "fix" | "fasal"
  selectedSeason: "k", // "k" (خریف) | "r" (ربیع) — global season for new rows / crop list
  fixRate1: 1650, // خریف rate per acre
  fixRate2: 850, // ربیع rate per acre
  selectedCrop: "", // active fasal picked in fasal-war mode (default for new rows)
  cropRates: [
    ...KHAREEF_CROPS.map((c) => ({ ...c, season: "k" })),
    ...RABEEH_CROPS.map((c) => ({ ...c, season: "r" })),
  ],
};

// Crops available for the dropdown in each mode/season.
export function cropOptionsFor(cfg) {
  if (cfg.mode === "fix") return ["خریف", "ربیع"];
  const season = cfg.selectedSeason || "k";
  return (cfg.cropRates || [])
    .filter((c) => (c.season || CROP_SEASON[c.crop] || "r") === season)
    .map((c) => c.crop);
}

// Abiana is calculated from a per-ACRE rate. Raqba is entered in KANAL,
// so acres = raqba / 8 (1 acre = 8 kanal).
export function computeAbiana(row, cfg) {
  const area = parseFloat(row.area) || 0;
  const acres = area / 8;
  if (cfg.mode === "fasal") {
    const cr = (cfg.cropRates || []).find((c) => c.crop === row.crop);
    return cr ? Math.round((cr.rate || 0) * acres) : 0;
  }
  // fix
  const season = CROP_SEASON[row.crop] || (cfg.selectedSeason === "k" ? "k" : "r");
  const rate = season === "k" ? (cfg.fixRate1 || 0) : (cfg.fixRate2 || 0);
  return Math.round(rate * acres);
}

export const SEASON_LABEL = { k: "خریف", r: "ربیع" };

export default function RateAbianaBox({ config, onChange }) {
  const cfg = { ...DEFAULT_RATE_CONFIG, ...config };
  const update = (patch) => onChange({ ...cfg, ...patch });

  const cropsOfSeason = (season) =>
    (cfg.cropRates || []).filter((c) => (c.season || CROP_SEASON[c.crop] || "r") === season);

  const pickSeason = (s) => {
    const firstCrop = cropsOfSeason(s)[0];
    update({ selectedSeason: s, selectedCrop: firstCrop ? firstCrop.crop : "" });
  };

  return (
    <div dir="rtl" className="border-2 border-slate-300 rounded-lg bg-slate-50 p-3 mb-3" style={{ fontFamily: URDU }}>
      <p className="text-sm font-bold text-slate-700 mb-2">ریٹ آبیانہ</p>

      {/* Row 1 — mode: فصلوار / مقررہ */}
      <div className="flex flex-wrap gap-4 text-sm mb-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="ratemode" checked={cfg.mode === "fasal"} onChange={() => update({ mode: "fasal" })} className="w-3.5 h-3.5" />
          فصلوار ریٹ
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="ratemode" checked={cfg.mode === "fix"} onChange={() => update({ mode: "fix" })} className="w-3.5 h-3.5" />
          مقررہ ریٹ
        </label>
      </div>

      {/* Row 2 — season: خریف / ربیع */}
      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="seasonmode" checked={cfg.selectedSeason === "k"} onChange={() => pickSeason("k")} className="w-3.5 h-3.5" />
          خریف
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="seasonmode" checked={cfg.selectedSeason === "r"} onChange={() => pickSeason("r")} className="w-3.5 h-3.5" />
          ربیع
        </label>
      </div>

      {/* Fix mode — show / edit the two per-acre rates */}
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
          <span className="text-[11px] text-slate-500">فی ایکڑ — دونوں موسم کے ریٹ یہیں دے دیں</span>
        </div>
      )}

      {/* Fasal mode — crops appear as dropdown in the table; just a hint here */}
      {cfg.mode === "fasal" && (
        <p className="text-[11px] text-slate-500">
          منتخب موسم ({SEASON_LABEL[cfg.selectedSeason || "k"]}) کی فصلیں قطار کے فصل کالم کے ڈراپ ڈاؤن میں آ جائیں گی۔ آبیانہ = فصل کا ریٹ × رقبہ ÷ ۸ (کنال سے ایکڑ)
        </p>
      )}
    </div>
  );
}