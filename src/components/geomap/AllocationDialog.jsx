import React, { useState, useEffect } from "react";
import { X, Save, AlertTriangle } from "lucide-react";
import { nextSubIndex, acresFromKanal } from "@/lib/allocationEngine";

const CROPS = ["Wheat", "Gram", "Fodder", "Mustard", "Rice", "Sugarcane", "Cotton", "Maize", "Other"];

// Dialog for allocating a farmer's portion inside one acre (killa) of a mustateel.
// Khasra auto = mustateelNo/acre_subIndex. Kanal capped by remaining (≤ 8 per acre).
export default function AllocationDialog({ open, data, remaining, existing, info, onAllocate, onClose }) {
  const [farmer_name, setFarmer] = useState("");
  const [father, setFather] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [kanal, setKanal] = useState(8);
  const [crop, setCrop] = useState("");
  const [land_type, setLandType] = useState("CCA");
  const [rate, setRate] = useState("Half");
  const [khata, setKhata] = useState("");

  useEffect(() => {
    if (open) {
      setFarmer("");
      setFather("");
      setPhone("");
      setCnic("");
      setKanal(Math.min(8, remaining || 8));
      setCrop("");
      setLandType("CCA");
      setRate("Half");
      setKhata("");
    }
  }, [open, data, remaining]);

  if (!open || !data) return null;

  const sub = nextSubIndex(existing, data.mustNo, data.acre);
  const khasra_full = `${data.mustNo}/${data.acre}_${sub}`;
  const maxK = Math.min(8, remaining);

  const handleSave = () => {
    if (!farmer_name.trim()) {
      alert("زمیندار کا نام درج کریں");
      return;
    }
    const k = Math.max(1, Math.min(maxK, parseInt(kanal, 10) || 0));
    if (k <= 0 || k > maxK) {
      alert(`کنال 1 سے ${maxK} کے درمیان ہو (بقیہ: ${remaining} کنال)`);
      return;
    }
    onAllocate({
      id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      mustateel_no: data.mustNo,
      acre_no: data.acre,
      khasra_full,
      farmer_name: farmer_name.trim(),
      father: father.trim(),
      phone: phone.trim(),
      cnic: cnic.trim(),
      kanal: k,
      acres: acresFromKanal(k),
      crop_name: crop,
      land_type,
      rate1: rate,
      khata_no: khata,
      channel_nme: info.channel,
      outlet_rd: info.outlet_rd,
      side: info.side,
      village: info.village,
      mouza: info.mouza,
      tehsil: info.tehsil,
      district: info.district,
      sub_division: info.sub_division,
      division: info.division,
      circle: info.circle,
      zone: info.zone,
    });
  };

  return (
    <div className="fixed inset-0 z-[1150] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-11 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Farmer Patch Allocation</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Khasra + remaining */}
          <div className="flex items-center justify-between bg-slate-100 rounded-lg px-3 py-2">
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase">Khasra No (auto)</div>
              <div className="text-lg font-bold text-slate-800 font-mono">{khasra_full}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-500 uppercase">Remaining in acre</div>
              <div className={`text-lg font-bold ${remaining < 8 ? "text-amber-600" : "text-green-600"}`}>{remaining} kanal</div>
            </div>
          </div>

          {existing.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <div className="text-[9px] font-bold text-amber-700 uppercase mb-0.5">Already allotted in this acre</div>
              {existing.map((a) => (
                <div key={a.id} className="text-[10px] text-amber-800 flex justify-between">
                  <span>{a.khasra_full}: {a.farmer_name}</span>
                  <span className="font-mono">{a.kanal} K</span>
                </div>
              ))}
            </div>
          )}

          {/* Farmer fields */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="زمیندار کا نام (Name)" value={farmer_name} onChange={setFarmer} full />
            <Field label="ولدیت (Father)" value={father} onChange={setFather} full />
            <Field label="فون نمبر (Phone)" value={phone} onChange={setPhone} placeholder="03xx-xxxxxxx" />
            <Field label="شناختی کارڈ (CNIC)" value={cnic} onChange={setCnic} placeholder="xxxxx-xxxxxxx-x" />
          </div>

          {/* Kanal allocation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-600">حصہ (Kanal) — 1 acre = 8 kanal</label>
              <span className="text-[10px] font-mono text-green-700 font-bold">
                {kanal} K = {acresFromKanal(parseInt(kanal) || 0).toFixed(3)} ac
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={maxK}
                value={Math.min(kanal, maxK)}
                onChange={(e) => setKanal(parseInt(e.target.value, 10))}
                className="flex-1 accent-green-600"
              />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].filter((n) => n <= maxK).map((n) => (
                  <button
                    key={n}
                    onClick={() => setKanal(n)}
                    className={`w-7 h-7 text-[10px] rounded font-bold ${kanal === n ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {remaining === 0 && (
              <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold mt-1">
                <AlertTriangle className="w-3 h-3" /> یہ ایکڑ مکمل الوٹ ہو چکا ہے
              </div>
            )}
          </div>

          {/* Crop / type / rate / khata */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Crop</label>
              <select value={crop} onChange={(e) => setCrop(e.target.value)} className="w-full h-8 text-xs px-1.5 border border-slate-200 rounded">
                <option value="">—</option>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Land Type</label>
              <select value={land_type} onChange={(e) => setLandType(e.target.value)} className="w-full h-8 text-xs px-1.5 border border-slate-200 rounded">
                <option value="CCA">CCA</option>
                <option value="GCA">GCA</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Rate</label>
              <select value={rate} onChange={(e) => setRate(e.target.value)} className="w-full h-8 text-xs px-1.5 border border-slate-200 rounded">
                <option>Half</option>
                <option>Full</option>
                <option>Quarter</option>
              </select>
            </div>
            <Field label="Khata No" value={khata} onChange={setKhata} />
          </div>

          <button
            onClick={handleSave}
            disabled={remaining === 0}
            className="w-full h-9 rounded-lg bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Allocate Patch
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 text-xs px-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-green-400"
      />
    </div>
  );
}