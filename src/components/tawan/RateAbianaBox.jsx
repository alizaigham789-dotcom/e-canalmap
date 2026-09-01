import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const URDU = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif";

// Common canal-abiana crops seeded at rate 0 (per acre). User edits/adds.
const DEFAULT_CROPS = ["خریف", "ربیع", "گندم", "کپاس", "چاول", "مکئی", "گنا", "تھوڑ"];

export const DEFAULT_RATE_CONFIG = {
  mode: "manual", // "manual" | "fix" | "fasal"
  fixRate1: 0,
  fixRate2: 0,
  cropRates: DEFAULT_CROPS.map((c) => ({ crop: c, rate: 0 })),
};

// Abiana is calculated from a per-ACRE rate. Raqba is entered in KANAL,
// so acres = raqba / 8 (1 acre = 8 kanal).
export function computeAbiana(row, cfg) {
  const area = parseFloat(row.area) || 0;
  const acres = area / 8;
  if (cfg.mode === "fix") {
    return Math.round(((cfg.fixRate1 || 0) + (cfg.fixRate2 || 0)) * acres);
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

      {/* Fix rate — 2 rate fields, both per acre */}
      {cfg.mode === "fix" && (
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <label className="flex items-center gap-1.5">
            <span>ریٹ ۱:</span>
            <Input type="number" value={cfg.fixRate1} onChange={(e) => update({ fixRate1: parseFloat(e.target.value) || 0 })} className="h-8 w-24 text-center" />
          </label>
          <label className="flex items-center gap-1.5">
            <span>ریٹ ۲:</span>
            <Input type="number" value={cfg.fixRate2} onChange={(e) => update({ fixRate2: parseFloat(e.target.value) || 0 })} className="h-8 w-24 text-center" />
          </label>
          <span className="text-[11px] text-slate-500">فی ایکڑ (۸ کنال) — آبیانہ = (ریٹ۱ + ریٹ۲) × رقبہ ÷ ۸</span>
        </div>
      )}

      {/* Fasal war rate — per-crop rates */}
      {cfg.mode === "fasal" && (
        <div className="space-y-1.5">
          {(cfg.cropRates || []).map((c, i) => (
            <div key={i} className="flex gap-2 items-center text-sm">
              <Input
                value={c.crop}
                onChange={(e) => {
                  const n = [...cfg.cropRates];
                  n[i] = { ...n[i], crop: e.target.value };
                  update({ cropRates: n });
                }}
                dir="rtl"
                className="h-8 w-32"
                placeholder="فصل"
                style={{ fontFamily: URDU }}
              />
              <Input
                type="number"
                value={c.rate}
                onChange={(e) => {
                  const n = [...cfg.cropRates];
                  n[i] = { ...n[i], rate: parseFloat(e.target.value) || 0 };
                  update({ cropRates: n });
                }}
                className="h-8 w-24 text-center"
                placeholder="ریٹ"
              />
              <span className="text-[11px] text-slate-500">فی ایکڑ</span>
              <button onClick={() => update({ cropRates: cfg.cropRates.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button onClick={() => update({ cropRates: [...(cfg.cropRates || []), { crop: "", rate: 0 }] })} size="sm" variant="outline" className="gap-1 text-xs h-7">
            <Plus className="w-3.5 h-3.5" /> فصل شامل کریں
          </Button>
          <p className="text-[11px] text-slate-500">آبیانہ = فصل کا ریٹ × رقبہ ÷ ۸ (کنال سے ایکڑ) — صرف وہ فصل جو صف میں درج ہو</p>
        </div>
      )}

      {/* Manual */}
      {cfg.mode === "manual" && (
        <p className="text-[11px] text-slate-500">ہر قطار میں آبیانہ دستی درج کریں۔</p>
      )}
    </div>
  );
}