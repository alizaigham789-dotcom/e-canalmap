// ============================================================
// EDIT ALLOCATION — whole-farmer edit.
//
// When a green patch is clicked, this dialog opens for the WHOLE
// occupier (same CNIC / name+father), not just one acre. Every acre
// the farmer holds across the moga is shown with its kanal positions
// (1-8) — exactly like the allocation dialog. Farmer details are
// edited once and applied to every acre at save time.
// ============================================================

import React, { useState, useEffect } from "react";
import { X, Trash2, Save, AlertTriangle, Lock, UserX } from "lucide-react";
import { acreAllocations, acresFromKanal } from "@/lib/allocationEngine";
import { formatCnic, formatPhone } from "@/lib/formatIds";

const CROPS = ["Wheat", "Gram", "Fodder", "Mustard", "Rice", "Sugarcane", "Cotton", "Maize", "Orchard", "Abadi", "Khali", "Other"];
const TENURE = ["Owner", "Tenant"];

// Identity key — same logic as the Form 1 register grouping (CNIC wins).
const identityKey = (a) => (a.cnic ? `cnic:${a.cnic}` : `name:${a.farmer_name || ""}||${a.father || ""}`);

// Find all of one farmer's allocations (cell allocations only — patches are
// edited via the patch tool). Returns { allocations, key }.
function farmerAllocations(allocations, mustNo, acre) {
  const clicked = acreAllocations(allocations, mustNo, acre);
  if (clicked.length === 0) return { list: [], key: null };
  const key = identityKey(clicked[0]);
  const list = allocations.filter((a) => a.acre_no != null && identityKey(a) === key);
  return { list, key };
}

// Kanal positions in an acre held by OTHER farmers (excl. this farmer).
const takenByOthers = (allocations, mustNo, acre, key) => {
  const taken = [];
  for (const a of allocations) {
    if (String(a.mustateel_no) === String(mustNo) && a.acre_no === acre && identityKey(a) !== key) {
      if (Array.isArray(a.positions)) taken.push(...a.positions);
    }
  }
  return taken;
};

export default function EditAllocationDialog({ open, data, allocations, mustateels, info, onUpdate, onAllocate, onRemove, onClose }) {
  const [farmerName, setFarmerName] = useState("");
  const [father, setFather] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [crop, setCrop] = useState("");
  const [tenure, setTenure] = useState("Owner");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantCnic, setTenantCnic] = useState("");
  const [khata, setKhata] = useState("");
  const [groups, setGroups] = useState([]); // [{ mustNo, positions: { acre: [pos] } }]
  const [farmerList, setFarmerList] = useState([]);
  const [farmerKey, setFarmerKey] = useState(null);

  useEffect(() => {
    if (open && data) {
      const { list, key } = farmerAllocations(allocations, data.mustNo, data.acre);
      setFarmerList(list);
      setFarmerKey(key);
      const f = list[0] || {};
      setFarmerName(f.farmer_name || "");
      setFather(f.father || "");
      setPhone(f.phone || "");
      setCnic(f.cnic || "");
      setCrop(f.crop_name || "");
      setTenure(f.tenure || "Owner");
      setTenantName(f.tenant_name || "");
      setTenantPhone(f.tenant_phone || "");
      setTenantCnic(f.tenant_cnic || "");
      setKhata(f.khata_no || "");
      // Group existing cell allocations by mustateel → { acre: positions }
      const byMust = {};
      for (const a of list) {
        if (a.acre_no == null) continue;
        const m = String(a.mustateel_no || "");
        (byMust[m] = byMust[m] || {})[a.acre_no] = a.positions || [];
      }
      const gs = Object.keys(byMust)
        .sort((a, b) => +a - +b)
        .map((mustNo) => ({ mustNo, positions: byMust[mustNo] }));
      setGroups(gs);
    }
  }, [open, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !data) return null;

  const acreCountFor = (mustNo) => (mustateels?.find((m) => String(m.mustNo) === String(mustNo)) || {}).acreCount || 10;

  const addGroup = () => {
    const used = new Set(groups.map((g) => g.mustNo));
    const next = (mustateels || []).find((m) => !used.has(String(m.mustNo)));
    if (next) setGroups((prev) => [...prev, { mustNo: String(next.mustNo), positions: {} }]);
  };
  const removeGroup = (gi) => setGroups((prev) => prev.filter((_, i) => i !== gi));
  const changeMustateel = (gi, mustNo) => setGroups((prev) => prev.map((g, i) => (i === gi ? { mustNo, positions: {} } : g)));

  const toggleAcre = (gi, acre) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const positions = { ...(g.positions || {}) };
        if (positions[acre]) {
          delete positions[acre];
        } else {
          const taken = takenByOthers(allocations, g.mustNo, acre, farmerKey);
          const sel = [1, 2, 3, 4, 5, 6, 7, 8].filter((p) => !taken.includes(p)).slice(0, 1);
          positions[acre] = sel;
        }
        return { ...g, positions };
      })
    );
  };

  const togglePosition = (gi, acre, pos) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const cur = (g.positions || {})[acre] || [];
        let next;
        if (cur.includes(pos)) {
          next = cur.filter((p) => p !== pos);
        } else {
          const taken = takenByOthers(allocations, g.mustNo, acre, farmerKey);
          if (taken.includes(pos)) return g;
          next = [...cur, pos].sort((a, b) => a - b);
        }
        return { ...g, positions: { ...(g.positions || {}), [acre]: next } };
      })
    );
  };

  const selectAllAcres = (gi) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== gi) return g;
        const count = acreCountFor(g.mustNo);
        const positions = {};
        for (let acre = 1; acre <= count; acre++) {
          const taken = takenByOthers(allocations, g.mustNo, acre, farmerKey);
          if (taken.length < 8) positions[acre] = [1, 2, 3, 4, 5, 6, 7, 8].filter((p) => !taken.includes(p));
        }
        return { ...g, positions };
      })
    );
  };
  const clearAcres = (gi) => setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, positions: {} } : g)));

  const handleDeleteFarmer = () => {
    if (!confirm("پورا زمیںدار حذف کر لیں؟")) return;
    for (const a of farmerList) onRemove(a.id);
    onClose();
  };

  const handleSave = () => {
    if (!farmerName.trim()) { alert("زمیندار کا نام درج کریں"); return; }
    const detailChanges = {
      farmer_name: farmerName.trim(),
      father: father.trim(),
      phone: phone.trim(),
      cnic: cnic.trim(),
      crop_name: crop,
      tenure,
      tenant_name: tenure === "Tenant" ? tenantName.trim() : "",
      tenant_phone: tenure === "Tenant" ? tenantPhone.trim() : "",
      tenant_cnic: tenure === "Tenant" ? tenantCnic.trim() : "",
      khata_no: khata,
    };
    const keptIds = new Set();
    const newRows = [];
    for (const g of groups) {
      for (const [acreStr, pos] of Object.entries(g.positions || {})) {
        const acre = +acreStr;
        if (!pos.length) continue; // emptied → will be removed below
        const existing = farmerList.find((a) => String(a.mustateel_no) === String(g.mustNo) && a.acre_no === acre);
        if (existing) {
          keptIds.add(existing.id);
          onUpdate(existing.id, { ...detailChanges, positions: pos, kanal: pos.length, acres: pos.length / 8 });
        } else {
          const sub = acreAllocations(allocations, g.mustNo, acre).length + 1;
          newRows.push({
            id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2)}_${newRows.length}`,
            source: "cell",
            mustateel_no: g.mustNo,
            acre_no: acre,
            khasra: `${g.mustNo}/${acre}_${sub}`,
            ...detailChanges,
            kanal: pos.length,
            positions: pos,
            acres: acresFromKanal(pos.length),
            channel_nme: info?.channel || "",
            outlet_rd: info?.outlet_rd || "",
            side: info?.side || "",
            village: info?.village || "",
            mouza: info?.mouza || "",
            tehsil: info?.tehsil || "",
            district: info?.district || "",
            sub_division: info?.sub_division || "",
            division: info?.division || "",
            circle: info?.circle || "",
            zone: info?.zone || "",
          });
        }
      }
    }
    // Remove cell allocations that the farmer emptied (no positions in any group).
    for (const a of farmerList) if (a.acre_no != null && !keptIds.has(a.id)) onRemove(a.id);
    if (newRows.length) onAllocate?.(newRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1150] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 h-11 bg-gradient-to-r from-emerald-600 to-green-600 text-white shrink-0">
          <span className="text-sm font-bold">Edit Occupier — {farmerName || "—"}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {/* Mustateel + acre groups */}
          <div className="space-y-2">
            {groups.map((g, gi) => {
              const count = acreCountFor(g.mustNo);
              let allSel = true;
              for (let acre = 1; acre <= count; acre++) {
                if (takenByOthers(allocations, g.mustNo, acre, farmerKey).length < 8 && !g.positions[acre]) { allSel = false; break; }
              }
              return (
                <div key={gi} className="border border-slate-200 rounded-lg p-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Mustateel</span>
                    <select value={g.mustNo} onChange={(e) => changeMustateel(gi, e.target.value)} className="h-7 text-xs px-1.5 border border-slate-200 rounded bg-white font-mono font-bold">
                      {(mustateels || []).map((m) => (
                        <option key={m.mustNo} value={String(m.mustNo)}>{m.mustNo} ({m.acreCount} ac)</option>
                      ))}
                    </select>
                    <label className="ml-auto flex items-center gap-1 text-[10px] font-bold text-green-700 cursor-pointer select-none">
                      <input type="checkbox" checked={allSel} onChange={() => (allSel ? clearAcres(gi) : selectAllAcres(gi))} className="w-3.5 h-3.5 accent-green-600" />
                      Select All Acres
                    </label>
                    {groups.length > 1 && (
                      <button onClick={() => removeGroup(gi)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: count }, (_, k) => k + 1).map((acre) => {
                      const taken = takenByOthers(allocations, g.mustNo, acre, farmerKey);
                      const selected = !!g.positions[acre];
                      const locked = taken.length >= 8 && !selected;
                      if (!selected) {
                        return (
                          <button
                            key={acre}
                            disabled={locked}
                            onClick={() => toggleAcre(gi, acre)}
                            title={locked ? "مکمل الوٹ" : `بقیہ ${8 - taken.length} کنال`}
                            className={`w-7 h-7 text-[10px] rounded font-bold border ${
                              locked ? "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {locked ? <Lock className="w-2.5 h-2.5 mx-auto" /> : acre}
                          </button>
                        );
                      }
                      const sel = g.positions[acre] || [];
                      const isFull = sel.length >= 8;
                      return (
                        <div key={acre} className="w-full border border-green-400 bg-green-50/50 rounded-lg p-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-700">{g.mustNo}/{acre}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono font-bold text-green-700">{isFull ? "8 کنال — مکمل" : `${sel.length} کنال`}</span>
                              <button onClick={() => toggleAcre(gi, acre)} className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-600" title="ایکڑ ہٹائیں">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {!isFull && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((pos) => {
                                const isTaken = taken.includes(pos);
                                const isSel = sel.includes(pos);
                                return (
                                  <button
                                    key={pos}
                                    type="button"
                                    disabled={isTaken}
                                    onClick={() => togglePosition(gi, acre, pos)}
                                    title={isTaken ? "دوسرے زمیندار کا" : `پوزیشن ${pos}`}
                                    className={`w-5 h-5 text-[8px] rounded font-bold border transition-colors ${
                                      isSel ? "bg-green-600 text-white border-green-600"
                                      : isTaken ? "bg-red-200 text-red-600 border-red-300 cursor-not-allowed"
                                      : "bg-white text-slate-600 border-slate-300 hover:bg-green-50 hover:border-green-400"
                                    }`}
                                  >
                                    {pos}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {groups.length < (mustateels?.length || 0) && (
              <button onClick={addGroup} className="w-full h-8 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-green-400 hover:text-green-600">
                + اور مستطیل شامل کریں
              </button>
            )}
          </div>

          {/* Farmer details — edited once, applied to all acres */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="زمیندار کا نام (Name)" value={farmerName} onChange={setFarmerName} full />
            <Field label="ولدیت (Father)" value={father} onChange={setFather} full />
            <Field label="فون نمبر (Phone)" value={phone} onChange={setPhone} placeholder="03xx-xxxxxxx" format={formatPhone} />
            <Field label="شناختی کارڈ (CNIC)" value={cnic} onChange={setCnic} placeholder="xxxxx-xxxxxxx-x" format={formatCnic} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select label="Crop" value={crop} onChange={setCrop} options={CROPS} />
            <Select label="Owner / Tenant" value={tenure} onChange={setTenure} options={TENURE} />
            <Field label="Khata No" value={khata} onChange={setKhata} />
          </div>

          {tenure === "Tenant" && (
            <div className="grid grid-cols-2 gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <div className="col-span-2 text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Tenant Details
              </div>
              <Field label="Tenant Name" value={tenantName} onChange={setTenantName} full />
              <Field label="Tenant Phone" value={tenantPhone} onChange={setTenantPhone} placeholder="03xx-xxxxxxx" format={formatPhone} />
              <Field label="Tenant CNIC" value={tenantCnic} onChange={setTenantCnic} placeholder="xxxxx-xxxxxxx-x" format={formatCnic} />
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0 flex gap-2">
          <button onClick={handleDeleteFarmer} className="h-9 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1.5 hover:bg-red-100">
            <UserX className="w-4 h-4" /> پورا حذف کریں
          </button>
          <button onClick={handleSave} className="flex-1 h-9 rounded-lg bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-green-700">
            <Save className="w-4 h-4" /> محفوظ کریں
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