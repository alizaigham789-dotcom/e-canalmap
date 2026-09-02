import React from "react";
import { Input } from "@/components/ui/input";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// ── Khareef crops (خریف) with per-acre abiana rates ──────────────────────
const KHAREEF_CROPS = [
  { crop: "چاول", rate: 2000 },
  { crop: "کپاس", rate: 1000 },
  { crop: "مونگ پھلی", rate: 1200 },
  { crop: "باغ", rate: 1000 },
  { crop: "کماد", rate: 1600 },
  { crop: "خالی", rate: 400 },
];
// ── Rabeeh crops (ربیع) with per-acre abiana rates ──────────────────────
const RABEEH_CROPS = [
  { crop: "چنا", rate: 200 },
  { crop: "گندم", rate: 400 },
  { crop: "خالی", rate: 400 },
  { crop: "سرسوں", rate: 500 },
  { crop: "دیگر", rate: 400 },
];

// Crop → season lookup.
const CROP_SEASON = {};
KHAREEF_CROPS.forEach((c) => (CROP_SEASON[c.crop] = "k"));
RABEEH_CROPS.forEach((c) => (CROP_SEASON[c.crop] = "r"));

export const SEASON_LABEL = { k: "خریف", r: "ربیع" };
CROP_SEASON[SEASON_LABEL.k] = "k";
CROP_SEASON[SEASON_LABEL.r] = "r";

export const DEFAULT_RATE_CONFIG = {
  mode: "fix", // "fix" | "fasal"  — Fix Rate selected by default
  selectedSeason: "k", // "k" (Khareef) | "r" (Rabeeh)
  fixRate1: 1650, // Khareef rate per acre
  fixRate2: 850, // Rabeeh rate per acre
  selectedCrop: "چاول", // default fasal for new rows in fasal-war mode
  cropRates: [
    ...KHAREEF_CROPS.map((c) => ({ ...c, season: "k" })),
    ...RABEEH_CROPS.map((c) => ({ ...c, season: "r" })),
  ],
};

// Dropdown options for the table's fasal column:
// the season label first, then that season's crops (کھاد کے نام).
export function cropOptionsFor(cfg) {
  const season = cfg.selectedSeason || "k";
  const label = SEASON_LABEL[season];
  const crops = (cfg.cropRates || [])
    .filter((c) => (c.season || CROP_SEASON[c.crop] || "r") === season)
    .map((c) => c.crop);
  return [label, ...crops];
}

// Abiana from a per-ACRE rate. Raqba is in KANAL → acres = raqba / 8.
export function computeAbiana(row, cfg) {
  const area = parseFloat(row.area) || 0;
  const acres = area / 8;
  if (cfg.mode === "fasal") {
    // fasal-war: use the selected crop's own rate. Season label alone = 0.
    if (!row.crop || row.crop === SEASON_LABEL.k || row.crop === SEASON_LABEL.r) return 0;
    // خالی (fallow) — fixed 400/acre regardless of saved cropRates
    if (row.crop === "خالی") return Math.round(400 * acres);
    const cr = (cfg.cropRates || []).find((c) => c.crop === row.crop);
    return cr ? Math.round((cr.rate || 0) * acres) : 0;
  }
  // fix: flat season rate applies (regardless of which crop name is shown).
  // خریف → fixRate1, ربیع → fixRate2 (based on the selected season).
  const season = cfg.selectedSeason || "k";
  const rate = season === "k" ? (cfg.fixRate1 || 0) : (cfg.fixRate2 || 0);
  return Math.round(rate * acres);
}

export default function RateAbianaBox({ config, onChange }) {
  const cfg = { ...DEFAULT_RATE_CONFIG, ...config };
  const update = (patch) => onChange({ ...cfg, ...patch });

  const cropsOfSeason = (season) =>
    (cfg.cropRates || []).filter((c) => (c.season || CROP_SEASON[c.crop] || "r") === season);

  const pickSeason = (s) => {
    const first = cropsOfSeason(s)[0];
    update({ selectedSeason: s, selectedCrop: first ? first.crop : "" });
  };

  return (
    <div dir="rtl" className="border-2 border-slate-300 rounded-lg bg-slate-50 p-3 mb-3" style={{ fontFamily: URDU }}>
      <p className="text-sm font-bold text-slate-700 mb-2">ریٹ آبیانہ</p>

      {/* Row 1 — mode: Fix Rate (first, default) | Fasal War Rate */}
      <div className="flex flex-wrap gap-4 text-sm mb-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="ratemode" checked={cfg.mode === "fix"} onChange={() => update({ mode: "fix" })} className="w-3.5 h-3.5" />
          Fix Rate
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="ratemode" checked={cfg.mode === "fasal"} onChange={() => update({ mode: "fasal" })} className="w-3.5 h-3.5" />
          Fasal War Rate
        </label>
      </div>

      {/* Row 2 — season: Khareef | Rabeeh */}
      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="seasonmode" checked={cfg.selectedSeason === "k"} onChange={() => pickSeason("k")} className="w-3.5 h-3.5" />
          Khareef
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="seasonmode" checked={cfg.selectedSeason === "r"} onChange={() => pickSeason("r")} className="w-3.5 h-3.5" />
          Rabeeh
        </label>
      </div>

      {/* Fix mode — edit the two per-acre rates */}
      {cfg.mode === "fix" && (
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <label className="flex items-center gap-1.5">
            <span>Khareef ریٹ:</span>
            <Input type="number" value={cfg.fixRate1} onChange={(e) => update({ fixRate1: parseFloat(e.target.value) || 0 })} className="h-8 w-24 text-center" />
          </label>
          <label className="flex items-center gap-1.5">
            <span>Rabeeh ریٹ:</span>
            <Input type="number" value={cfg.fixRate2} onChange={(e) => update({ fixRate2: parseFloat(e.target.value) || 0 })} className="h-8 w-24 text-center" />
          </label>
          <span className="text-[11px] text-slate-500">فی ایکڑ — دونوں موسم کے ریٹ یہیں دے دیں</span>
        </div>
      )}

      {cfg.mode === "fasal" && (
        <p className="text-[11px] text-slate-500">
          منتخب موسم ({SEASON_LABEL[cfg.selectedSeason || "k"]}) کی فصلیں (چاول، گندم، گنا وغیرہ) قطار کے فصل کالم کے ڈراپ ڈاؤن میں آ جائیں گی۔ آبیانہ = فصل کا ریٹ × رقبہ ÷ ۸ (کنال سے ایکڑ)
        </p>
      )}
    </div>
  );
}