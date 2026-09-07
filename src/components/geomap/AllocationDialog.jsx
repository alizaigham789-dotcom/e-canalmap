import React, { useState, useEffect } from "react";
import { X, Save, AlertTriangle, Plus, Trash2, Lock } from "lucide-react";
import { remainingKanal, acreAllocations, acresFromKanal } from "@/lib/allocationEngine";
import { formatCnic, formatPhone } from "@/lib/formatIds";

const CROPS = ["Wheat", "Gram", "Fodder", "Mustard", "Rice", "Sugarcane", "Cotton", "Maize", "Orchard", "Abadi", "Khali", "Other"];
const LAND_TYPES = ["CCA", "Fish Farm", "Forest", "Garden"];
const TENURE = ["Owner", "Tenant"];

// Positions already taken by other farmers in this acre (1-8)
const takenPositions = (allocations, mustateelNo, acre) => {
  const taken = [];
  for (const a of acreAllocations(allocations, mustateelNo, acre)) {
    if (Array.isArray(a.positions)) taken.push(...a.positions);
  }
  return taken;
};

// Auto-select the first N available kanal positions (1-8 minus taken)
const autoSelectPositions = (allocations, mustateelNo, acre, count) => {
  const taken = takenPositions(allocations, mustateelNo, acre);
  return [1, 2, 3, 4, 5, 6, 7, 8].filter((p) => !taken.includes(p)).slice(0, count);
};

// Cell-based allocation: pick a whole mustateel, toggle its acre subdivisions,
// select which kanal positions (1-8) inside each acre the farmer gets, and add
// more mustateels in the same dialog. Acres already fully allotted (8 kanal) are
// locked. Tenant fields appear when tenure=Tenant.
export default function AllocationDialog({ open, data, mustateels, allocations, info, onAllocate, onClose }) {
  const [groups, setGroups] = useState([]); // [{ mustNo, acres: { acre: kanal }, positions: { acre: [pos...] } }]
  const [farmer_name, setFarmer] = useState("");
  const [father, setFather] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [crop, setCrop] = useState("");
  const [land_type, setLandType] = useState("CCA");
  const [tenure, setTenure] = useState("Owner");
  const [tenant_name, setTenantName] = useState("");
  const [tenant_phone, setTenantPhone] = useState("");
  const [tenant_cnic, setTenantCnic] = useState("");
  const [khata, setKhata] = useState("");

  useEffect(() => {
    if (open && data) {
      const rem = remainingKanal(allocations, data.mustNo, data.acre);
      const sel = autoSelectPositions(allocations, data.mustNo, data.acre, Math.min(8, rem || 8));
      setGroups([{ mustNo: data.mustNo, acres: { [data.acre]: sel.length }, positions: { [data.acre]: sel } }]);
      setFarmer("");
      setFather("");
      setPhone("");
      setCnic("");
      setCrop("");
      setLandType("CCA");
      setTenure("Owner");
      setTenantName("");
      setTenantPhone("");
      setTenantCnic("");
      setKhata("");
    }
  }, [open, data, allocations]);

  if (!open || !data) return null;

  const acreCountFor = (mustNo) => (mustateels.find((m) => m.mustNo === mustNo) || {}).acreCount || 10;

  const toggleAcre = (gi, acre) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const acres = { ...g.acres };
        const positions = { ...(g.positions || {}) };
        if (acres[acre]) {
          delete acres[acre];
          delete positions[acre];
        } else {
          const rem = remainingKanal(allocations, g.mustNo, acre);
          const sel = autoSelectPositions(allocations, g.mustNo, acre, Math.min(8, rem || 8));
          acres[acre] = sel.length;
          positions[acre] = sel;
        }
        return { ...g, acres, positions };
      })
    );
  };

  // Toggle a single kanal position (1-8) inside an acre — the farmer picks which
  // side / which specific kanal slots they want. Kanal count = selected positions.
  const togglePosition = (gi, acre, pos) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const positions = g.positions || {};
        const cur = positions[acre] || [];
        let next;
        if (cur.includes(pos)) {
          next = cur.filter((p) => p !== pos);
        } else {
          const rem = remainingKanal(allocations, g.mustNo, acre);
          if (cur.length >= rem) return g; // can't select more than remaining
          next = [...cur, pos].sort((a, b) => a - b);
        }
        return { ...g, positions: { ...positions, [acre]: next }, acres: { ...g.acres, [acre]: next.length } };
      })
    );
  };

  // Select all available kanal positions in an acre
  const selectAllPositions = (gi, acre) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const sel = autoSelectPositions(allocations, g.mustNo, acre, 8);
        return { ...g, positions: { ...(g.positions || {}), [acre]: sel }, acres: { ...g.acres, [acre]: sel.length } };
      })
    );
  };

  // Select every non-locked acre in a mustateel at once (all available kanal positions).
  const selectAllAcres = (gi) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const count = acreCountFor(g.mustNo);
        const acres = {};
        const positions = {};
        for (let acre = 1; acre <= count; acre++) {
          const rem = remainingKanal(allocations, g.mustNo, acre);
          if (rem > 0) {
            const sel = autoSelectPositions(allocations, g.mustNo, acre, rem);
            acres[acre] = sel.length;
            positions[acre] = sel;
          }
        }
        return { ...g, acres, positions };
      })
    );
  };

  // Deselect every acre in a mustateel group.
  const clearAcres = (gi) => setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, acres: {}, positions: {} } : g)));

  const changeMustateel = (gi, mustNo) => setGroups((prev) => prev.map((g, i) => (i === gi ? { mustNo, acres: {}, positions: {} } : g)));

  const addGroup = () => {
    const used = new Set(groups.map((g) => g.mustNo));
    const next = mustateels.find((m) => !used.has(m.mustNo));
    if (next) setGroups((prev) => [...prev, { mustNo: next.mustNo, acres: {}, positions: {} }]);
  };

  const removeGroup = (gi) => setGroups((prev) => prev.filter((_, i) => i !== gi));

  const handleSave = () => {
    if (!farmer_name.trim()) {
      alert("زمیندار کا نام درج کریں");
      return;
    }
    const rows = [];
    for (const g of groups) {
      for (const [acre, kanal] of Object.entries(g.acres)) {
        const k = Math.max(1, Math.min(8, parseInt(kanal, 10) || 0));
        const rem = remainingKanal(allocations, g.mustNo, +acre);
        if (k > rem) {
          alert(`کلا ${g.mustNo}/${acre} میں صرف ${rem} کنال بقیہ ہیں`);
          return;
        }
        const sub = acreAllocations(allocations, g.mustNo, +acre).length + 1;
        rows.push({
          id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2)}_${rows.length}`,
          source: "cell",
          mustateel_no: g.mustNo,
          acre_no: +acre,
          khasra: `${g.mustNo}/${acre}_${sub}`,
          farmer_name: farmer_name.trim(),
          father: father.trim(),
          phone: phone.trim(),
          cnic: cnic.trim(),
          kanal: k,
          positions: g.positions?.[acre] || [],
          acres: acresFromKanal(k),
          crop_name: crop,
          land_type,
          tenure,
          tenant_name: tenure === "Tenant" ? tenant_name.trim() : "",
          tenant_phone: tenure === "Tenant" ? tenant_phone.trim() : "",
          tenant_cnic: tenure === "Tenant" ? tenant_cnic.trim() : "",
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
      }
    }
    if (rows.length === 0) {
      alert("کم از کم ایک ایکڑ منتخب کریں");
      return;
    }
    onAllocate(rows);
  };

  return (
    <div className="fixed inset-0 z-[1150] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 h-11 bg-gradient-to-r from-green-600 to-emerald-600 text-white shrink-0">
          <span className="text-sm font-bold">Farmer Patch Allocation</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {/* Mustateel + acre groups */}
          <div className="space-y-2">
            {groups.map((g, gi) => (
              <div key={gi} className="border border-slate-200 rounded-lg p-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Mustateel</span>
                  <select value={g.mustNo} onChange={(e) => changeMustateel(gi, e.target.value)} className="h-7 text-xs px-1.5 border border-slate-200 rounded bg-white font-mono font-bold">
                    {mustateels.map((m) => (
                      <option key={m.mustNo} value={m.mustNo}>{m.mustNo} ({m.acreCount} ac)</option>
                    ))}
                  </select>
                  {(() => {
                    const count = acreCountFor(g.mustNo);
                    let allSel = true;
                    for (let acre = 1; acre <= count; acre++) {
                      if (remainingKanal(allocations, g.mustNo, acre) > 0 && !g.acres[acre]) { allSel = false; break; }
                    }
                    return (
                      <label className="ml-auto flex items-center gap-1 text-[10px] font-bold text-green-700 cursor-pointer select-none">
                        <input type="checkbox" checked={allSel} onChange={() => (allSel ? clearAcres(gi) : selectAllAcres(gi))} className="w-3.5 h-3.5 accent-green-600" />
                        Select All Acres
                      </label>
                    );
                  })()}
                  {groups.length > 1 && (
                    <button onClick={() => removeGroup(gi)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: acreCountFor(g.mustNo) }, (_, k) => k + 1).map((acre) => {
                    const rem = remainingKanal(allocations, g.mustNo, acre);
                    const selected = !!g.acres[acre];
                    const locked = rem <= 0 && !selected;
                    return (
                      <button
                        key={acre}
                        disabled={locked}
                        onClick={() => toggleAcre(gi, acre)}
                        title={locked ? "مکمل الوٹ" : `بقیہ ${rem} کنال`}
                        className={`w-7 h-7 text-[10px] rounded font-bold border ${
                          selected
                            ? "bg-green-600 text-white border-green-600"
                            : locked
                            ? "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {locked ? <Lock className="w-2.5 h-2.5 mx-auto" /> : acre}
                      </button>
                    );
                  })}
                </div>
                {/* Kanal slider — defaults to 8 (or remaining), green slider to reduce */}
                {Object.entries(g.acres).length > 0 && (
                  <div className="mt-2 space-y-2">
                    {Object.entries(g.acres).map(([acre]) => {
                      const rem = remainingKanal(allocations, g.mustNo, +acre);
                      const maxK = Math.min(8, rem);
                      const selected = g.positions?.[acre] || [];
                      const kanalCount = g.acres[acre] || selected.length || maxK;
                      return (
                        <div key={acre} className="bg-slate-50 rounded px-2 py-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] font-bold text-slate-700">{g.mustNo}/{acre}</span>
                            <span className="text-[12px] font-mono font-bold text-green-700">{kanalCount} کنال</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={maxK}
                            value={kanalCount}
                            onChange={(e) => {
                              const count = parseInt(e.target.value, 10);
                              const sel = autoSelectPositions(allocations, g.mustNo, +acre, count);
                              setGroups(prev => prev.map((gg, i) => {
                                if (i !== gi) return gg;
                                return { ...gg, positions: { ...(gg.positions || {}), [acre]: sel }, acres: { ...gg.acres, [acre]: count } };
                              }));
                            }}
                            className="w-full h-2 accent-green-600 cursor-pointer"
                          />
                          <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                            <span>1 کنال</span>
                            <span>{maxK} کنال</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {groups.length < mustateels.length && (
              <button onClick={addGroup} className="w-full h-8 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-green-400 hover:text-green-600">
                <Plus className="w-3.5 h-3.5" /> اور مستطیل شامل کریں
              </button>
            )}
          </div>

          {/* Farmer details */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="زمیندار کا نام (Name)" value={farmer_name} onChange={setFarmer} full />
            <Field label="ولدیت (Father)" value={father} onChange={setFather} full />
            <Field label="فون نمبر (Phone)" value={phone} onChange={setPhone} placeholder="03xx-xxxxxxx" format={formatPhone} />
            <Field label="شناختی کارڈ (CNIC)" value={cnic} onChange={setCnic} placeholder="xxxxx-xxxxxxx-x" format={formatCnic} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select label="Crop" value={crop} onChange={setCrop} options={CROPS} />
            <Select label="Land Type" value={land_type} onChange={setLandType} options={LAND_TYPES} />
            <Select label="Owner / Tenant" value={tenure} onChange={setTenure} options={TENURE} />
            <Field label="Khata No" value={khata} onChange={setKhata} />
          </div>

          {tenure === "Tenant" && (
            <div className="grid grid-cols-2 gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <div className="col-span-2 text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Tenant Details
              </div>
              <Field label="Tenant Name" value={tenant_name} onChange={setTenantName} full />
              <Field label="Tenant Phone" value={tenant_phone} onChange={setTenantPhone} placeholder="03xx-xxxxxxx" format={formatPhone} />
              <Field label="Tenant CNIC" value={tenant_cnic} onChange={setTenantCnic} placeholder="xxxxx-xxxxxxx-x" format={formatCnic} />
            </div>
          )}

          <button onClick={handleSave} className="w-full h-9 rounded-lg bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-green-700">
            <Save className="w-4 h-4" /> Allocate Patch
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, full, format }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(format ? format(e.target.value) : e.target.value)}
        className="w-full h-8 text-xs px-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-green-400"
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
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}