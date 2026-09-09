import React, { useState, useMemo, useEffect } from "react";
import { X, Save, Loader2, Trash2, Plus, User, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Edit dialog for a saved Form 1 Register record.
// Lets you edit farmer-level fields (name, father, CNIC, phone, khata, tenure,
// crop) per group, edit per-acre kanal/marla, add/delete acres, add/delete
// farmers, then save back to the Form1Register entity (rows_json).
export default function Form1RegisterEditDialog({ open, register, onClose, onSaved }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && register) {
      try { setRows(JSON.parse(register.rows_json || "[]")); } catch { setRows([]); }
    }
  }, [open, register]);

  const groupKey = (r) => (r.cnic ? `cnic:${r.cnic}` : `name:${r.farmer_name || ""}||${r.father || ""}`);

  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const k = groupKey(r);
      if (!map.has(k)) map.set(k, { key: k, farmer_name: "", father: "", cnic: "", phone: "", khata_no: "", tenure: "", crop_name: "", indices: [] });
      const g = map.get(k);
      g.indices.push(rows.indexOf(r));
      const pick = (f) => { if (!g[f] && r[f]) g[f] = r[f]; };
      pick("farmer_name"); pick("father"); pick("cnic"); pick("phone"); pick("khata_no"); pick("tenure"); pick("crop_name");
      if (!g.farmer_name && r.farmer_name) g.farmer_name = r.farmer_name;
    });
    return [...map.values()];
  }, [rows]);

  const updateGroup = (key, patch) =>
    setRows((prev) => prev.map((r) => (groupKey(r) === key ? { ...r, ...patch } : r)));

  const updateRow = (idx, patch) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const deleteRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const addAcre = (key) => {
    const g = groups.find((x) => x.key === key);
    if (!g) return;
    setRows((prev) => [
      ...prev,
      {
        farmer_name: g.farmer_name, father: g.father, cnic: g.cnic, phone: g.phone,
        khata_no: g.khata_no, tenure: g.tenure, crop_name: g.crop_name,
        mustateel_no: "", acre_no: "", kanal: 0, marla: 0, khasra: "", moga_number: register?.moga_number || "",
      },
    ]);
  };

  const addFarmer = () => {
    setRows((prev) => [
      ...prev,
      {
        farmer_name: "", father: "", cnic: "", phone: "", khata_no: "", tenure: "Owner",
        crop_name: "", mustateel_no: "", acre_no: "", kanal: 0, marla: 0, khasra: "",
        moga_number: register?.moga_number || "",
      },
    ]);
  };

  const deleteFarmer = (key) => setRows((prev) => prev.filter((r) => groupKey(r) !== key));

  const handleSave = async () => {
    if (!register) return;
    setSaving(true);
    try {
      let totalKanal = 0;
      for (const r of rows) totalKanal += (r.kanal || 0) + (r.marla || 0) / 20;
      await base44.entities.Form1Register.update(register.id, {
        rows_json: JSON.stringify(rows),
        total_kanal: Math.round(totalKanal * 100) / 100,
        total_acres: Math.round((totalKanal / 8) * 1000) / 1000,
      });
      toast.success("رجسٹر محفوظ ہو گیا");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("محفوظ نہیں ہوا: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !register) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-amber-600 to-amber-700 text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-bold" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
              رجسٹر میں ترمیم — {register.map_title || register.moga_number || ""}
            </span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3" dir="rtl">
          {groups.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">ابھی کوئی زمیندار نہیں۔ نیا زمیندار شامل کریں۔</div>
          )}

          {groups.map((g, gi) => (
            <div key={g.key || gi} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {/* Farmer header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200">
                <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-800">زمیندار {gi + 1}</span>
                <button
                  onClick={() => deleteFarmer(g.key)}
                  className="mr-auto text-red-500 hover:text-red-700 flex items-center gap-1 text-[10px] font-bold"
                >
                  <Trash2 className="w-3 h-3" /> زمیندار حذف کریں
                </button>
              </div>

              {/* Farmer detail inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
                <Field label="نام زراعت کار" value={g.farmer_name} onChange={(v) => updateGroup(g.key, { farmer_name: v })} />
                <Field label="ولدیت" value={g.father} onChange={(v) => updateGroup(g.key, { father: v })} />
                <Field label="شناختی کارڈ" value={g.cnic} onChange={(v) => updateGroup(g.key, { cnic: v })} ltr />
                <Field label="فون" value={g.phone} onChange={(v) => updateGroup(g.key, { phone: v })} ltr />
                <Field label="نمبر کھاتہ" value={g.khata_no} onChange={(v) => updateGroup(g.key, { khata_no: v })} />
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">ملکیت</label>
                  <select
                    value={g.tenure || "Owner"}
                    onChange={(e) => updateGroup(g.key, { tenure: e.target.value })}
                    className="w-full h-7 text-[11px] border border-slate-300 rounded px-1 bg-white"
                  >
                    <option value="Owner">مالک</option>
                    <option value="Tenant">مزارع</option>
                  </select>
                </div>
                <Field label="فصل" value={g.crop_name} onChange={(v) => updateGroup(g.key, { crop_name: v })} />
              </div>

              {/* Acres list */}
              <div className="px-3 pb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-600">ایکڑ تفصیل ({g.indices.length})</span>
                  <button
                    onClick={() => addAcre(g.key)}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-3 h-3" /> ایکڑ شامل کریں
                  </button>
                </div>
                <div className="space-y-1.5">
                  {g.indices.map((idx) => {
                    const r = rows[idx];
                    if (!r) return null;
                    return (
                      <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1.5">
                        <input
                          value={r.mustateel_no || ""}
                          onChange={(e) => updateRow(idx, { mustateel_no: e.target.value })}
                          placeholder="مستطیل"
                          className="w-16 h-7 text-[10px] text-center border border-slate-300 rounded px-1 font-mono"
                        />
                        <input
                          value={r.acre_no ?? ""}
                          onChange={(e) => updateRow(idx, { acre_no: e.target.value })}
                          placeholder="کیلہ"
                          className="w-12 h-7 text-[10px] text-center border border-slate-300 rounded px-1 font-mono"
                        />
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            value={r.kanal ?? 0}
                            onChange={(e) => updateRow(idx, { kanal: Number(e.target.value) })}
                            className="w-12 h-7 text-[10px] text-center border border-slate-300 rounded px-1 font-mono"
                          />
                          <span className="text-[9px] text-slate-400">کنال</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            value={r.marla ?? 0}
                            onChange={(e) => updateRow(idx, { marla: Number(e.target.value) })}
                            className="w-12 h-7 text-[10px] text-center border border-slate-300 rounded px-1 font-mono"
                          />
                          <span className="text-[9px] text-slate-400">مرلہ</span>
                        </div>
                        <input
                          value={r.crop_name || ""}
                          onChange={(e) => updateRow(idx, { crop_name: e.target.value })}
                          placeholder="فصل"
                          className="flex-1 min-w-[60px] h-7 text-[10px] border border-slate-300 rounded px-1.5"
                        />
                        <button
                          onClick={() => deleteRow(idx)}
                          className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addFarmer}
            className="w-full h-10 flex items-center justify-center gap-1.5 border-2 border-dashed border-blue-300 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> نیا زمیندار شامل کریں
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 h-12 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} className="h-8 px-4 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300">
            منسوخ
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} محفوظ کریں
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, ltr }) {
  return (
    <div>
      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">{label}</label>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        dir={ltr ? "ltr" : "rtl"}
        className={`w-full h-7 text-[11px] border border-slate-300 rounded px-1.5 bg-white ${ltr ? "font-mono text-left" : "text-right"}`}
      />
    </div>
  );
}