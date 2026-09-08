import React, { useState, useEffect } from "react";
import { X, Trash2, Save } from "lucide-react";
import { acreAllocations } from "@/lib/allocationEngine";

const CROPS = ["Wheat", "Gram", "Fodder", "Mustard", "Rice", "Sugarcane", "Cotton", "Maize", "Orchard", "Abadi", "Khali", "Other"];
const TENURE = ["Owner", "Tenant"];

// Edit an existing cell allocation: farmer details, tenant, khata, crop and the
// exact kanal positions (1-8) inside the acre. Changes flow back through
// onUpdate/onRemove into the shared allocations state, so the green patch AND
// the Form 1 register update together (two-way link).
export default function EditAllocationDialog({ open, data, allocations, onUpdate, onRemove, onClose }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (open && data) {
      const acs = acreAllocations(allocations, data.mustNo, data.acre);
      setRows(acs.map((a) => ({ ...a })));
    }
  }, [open, data]);

  if (!open || !data) return null;

  // Positions held by OTHER allocations in this acre (excl. the given alloc id)
  const takenByOthers = (allocId) => {
    const taken = [];
    for (const a of allocations) {
      if (String(a.mustateel_no) === String(data.mustNo) && a.acre_no === data.acre && a.id !== allocId) {
        if (Array.isArray(a.positions)) taken.push(...a.positions);
      }
    }
    return taken;
  };

  const updateRow = (idx, changes) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...changes } : r)));

  const togglePos = (idx, pos) => {
    setRows((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      const cur = r.positions || [];
      const taken = takenByOthers(r.id);
      if (cur.includes(pos)) {
        const next = cur.filter((p) => p !== pos);
        return { ...r, positions: next, kanal: next.length };
      }
      if (taken.includes(pos)) return r;
      const next = [...cur, pos].sort((a, b) => a - b);
      return { ...r, positions: next, kanal: next.length };
    }));
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    onRemove(id);
  };

  const saveAll = () => {
    for (const r of rows) {
      if ((r.positions || []).length === 0) {
        alert("ہر الوٹمنٹ کے لیے کم از کم ایک کنال منتخب کریں");
        return;
      }
      onUpdate(r.id, {
        farmer_name: r.farmer_name,
        father: r.father,
        phone: r.phone,
        cnic: r.cnic,
        crop_name: r.crop_name,
        tenure: r.tenure,
        tenant_name: r.tenure === "Tenant" ? r.tenant_name : "",
        tenant_phone: r.tenure === "Tenant" ? r.tenant_phone : "",
        tenant_cnic: r.tenure === "Tenant" ? r.tenant_cnic : "",
        khata_no: r.khata_no,
        positions: r.positions || [],
        kanal: (r.positions || []).length,
        acres: (r.positions || []).length / 8,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1150] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 h-11 bg-gradient-to-r from-emerald-600 to-green-600 text-white shrink-0">
          <span className="text-sm font-bold">Edit Allocation — {data.mustNo}/{data.acre}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {rows.length === 0 && <div className="text-xs text-slate-400 text-center py-4">کوئی الوٹمنٹ نہیں</div>}
          {rows.map((r, idx) => {
            const taken = takenByOthers(r.id);
            const sel = r.positions || [];
            return (
              <div key={r.id} className="border border-slate-200 rounded-lg p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-slate-700">{data.mustNo}/{data.acre}_{idx + 1}</span>
                  <span className="text-[10px] font-bold text-green-700">{sel.length} کنال</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input value={r.farmer_name || ""} onChange={(e) => updateRow(idx, { farmer_name: e.target.value })} placeholder="زمیندار" className="h-7 text-[10px] px-1.5 border border-slate-200 rounded" />
                  <input value={r.father || ""} onChange={(e) => updateRow(idx, { father: e.target.value })} placeholder="ولدیت" className="h-7 text-[10px] px-1.5 border border-slate-200 rounded" />
                  <input value={r.phone || ""} onChange={(e) => updateRow(idx, { phone: e.target.value })} placeholder="فون" className="h-7 text-[10px] px-1.5 border border-slate-200 rounded font-mono" />
                  <input value={r.cnic || ""} onChange={(e) => updateRow(idx, { cnic: e.target.value })} placeholder="شناختی کارڈ" className="h-7 text-[10px] px-1.5 border border-slate-200 rounded font-mono" />
                  <select value={r.crop_name || ""} onChange={(e) => updateRow(idx, { crop_name: e.target.value })} className="h-7 text-[10px] px-1 border border-slate-200 rounded bg-white">
                    <option value="">فصل</option>
                    {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={r.tenure || "Owner"} onChange={(e) => updateRow(idx, { tenure: e.target.value })} className="h-7 text-[10px] px-1 border border-slate-200 rounded bg-white">
                    {TENURE.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={r.khata_no || ""} onChange={(e) => updateRow(idx, { khata_no: e.target.value })} placeholder="خانہ" className="h-7 text-[10px] px-1.5 border border-slate-200 rounded" />
                </div>
                {r.tenure === "Tenant" && (
                  <div className="grid grid-cols-3 gap-1.5 bg-amber-50 border border-amber-200 rounded p-1.5">
                    <input value={r.tenant_name || ""} onChange={(e) => updateRow(idx, { tenant_name: e.target.value })} placeholder="مزارع" className="h-7 text-[10px] px-1.5 border border-amber-200 rounded" />
                    <input value={r.tenant_phone || ""} onChange={(e) => updateRow(idx, { tenant_phone: e.target.value })} placeholder="فون" className="h-7 text-[10px] px-1.5 border border-amber-200 rounded font-mono" />
                    <input value={r.tenant_cnic || ""} onChange={(e) => updateRow(idx, { tenant_cnic: e.target.value })} placeholder="شناختی" className="h-7 text-[10px] px-1.5 border border-amber-200 rounded font-mono" />
                  </div>
                )}
                <div className="text-[8px] text-slate-500 font-bold">کنال پوزیشن — سبز = منتخب، سرخ = دوسروں کے</div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((pos) => {
                    const isTaken = taken.includes(pos);
                    const isSel = sel.includes(pos);
                    return (
                      <button
                        key={pos}
                        type="button"
                        disabled={isTaken}
                        onClick={() => togglePos(idx, pos)}
                        className={`w-5 h-5 text-[8px] rounded font-bold border transition-colors ${
                          isSel
                            ? "bg-green-600 text-white border-green-600"
                            : isTaken
                            ? "bg-red-200 text-red-600 border-red-300 cursor-not-allowed"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-green-50"
                        }`}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => removeRow(r.id)} className="w-full h-7 rounded bg-red-50 text-red-600 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-red-100">
                  <Trash2 className="w-3 h-3" /> حذف کریں
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <button onClick={saveAll} className="w-full h-9 rounded-lg bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-green-700">
            <Save className="w-4 h-4" /> محفوظ کریں
          </button>
        </div>
      </div>
    </div>
  );
}