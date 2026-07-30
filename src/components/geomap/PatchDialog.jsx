import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

const CROPS = ["Wheat", "Gram", "Fodder", "Mustard", "Rice", "Sugarcane", "Cotton", "Maize", "Orchard", "Abadi", "Khali", "Other"];
const LAND_TYPES = ["CCA", "Fish Farm", "Forest", "Garden"];
const TENURE = ["Owner", "Tenant"];

// Dialog shown after a freehand patch is drawn: enter farmer details + save.
// Area (acres/kanal) and khasra list are auto-computed from the drawn polygon.
export default function PatchDialog({ open, data, info, onSave, onClose }) {
  const [farmer_name, setFarmer] = useState("");
  const [father, setFather] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [crop, setCrop] = useState("");
  const [land_type, setLandType] = useState("CCA");
  const [tenure, setTenure] = useState("Owner");
  const [khata, setKhata] = useState("");

  useEffect(() => {
    if (open) {
      setFarmer("");
      setFather("");
      setPhone("");
      setCnic("");
      setCrop("");
      setLandType("CCA");
      setTenure("Owner");
      setKhata("");
    }
  }, [open, data]);

  if (!open || !data) return null;

  const { area, khasra, latlngs } = data;

  const handleSave = () => {
    if (!farmer_name.trim()) {
      alert("زمیندار کا نام درج کریں");
      return;
    }
    onSave({
      id: `patch_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      source: "patch",
      geometry: latlngs,
      khasra: (khasra || []).join("; "),
      mustateel_no: (khasra?.[0] || "").split("/")[0] || "",
      farmer_name: farmer_name.trim(),
      father: father.trim(),
      phone: phone.trim(),
      cnic: cnic.trim(),
      kanal: area.kanal,
      acres: area.acres,
      marla: area.marla,
      crop_name: crop,
      land_type,
      tenure,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 h-11 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <span className="text-sm font-bold">Farmer Patch Details</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Area + khasra */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg px-3 py-2">
              <div className="text-[9px] font-bold text-indigo-700 uppercase">Total Area</div>
              <div className="text-base font-bold text-indigo-800">{area.acres.toFixed(3)} ac</div>
              <div className="text-[10px] text-indigo-600">{area.kanal} kanal {area.marla} marla</div>
            </div>
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg px-3 py-2">
              <div className="text-[9px] font-bold text-emerald-700 uppercase">Khasra (auto)</div>
              <div className="text-[11px] font-mono font-bold text-emerald-800 break-all">{(khasra || []).join("; ") || "—"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="زمیندار کا نام (Name)" value={farmer_name} onChange={setFarmer} full />
            <Field label="ولدیت (Father)" value={father} onChange={setFather} full />
            <Field label="فون نمبر (Phone)" value={phone} onChange={setPhone} placeholder="03xx-xxxxxxx" />
            <Field label="شناختی کارڈ (CNIC)" value={cnic} onChange={setCnic} placeholder="xxxxx-xxxxxxx-x" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select label="Crop" value={crop} onChange={setCrop} options={CROPS} />
            <Select label="Land Type" value={land_type} onChange={setLandType} options={LAND_TYPES} />
            <Select label="Owner / Tenant" value={tenure} onChange={setTenure} options={TENURE} />
            <Field label="Khata No" value={khata} onChange={setKhata} />
          </div>

          <button
            onClick={handleSave}
            className="w-full h-9 rounded-lg bg-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" /> Save Patch
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
        className="w-full h-8 text-xs px-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-8 text-xs px-1.5 border border-slate-200 rounded bg-white">
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}