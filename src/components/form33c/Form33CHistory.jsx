import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, GitCompare, Loader2, X, History, RefreshCw } from "lucide-react";

function calcTotal(v) {
  if (v.surcharge_override && String(v.surcharge_override).trim() !== "") return v.surcharge_override;
  const z = parseFloat(v.total_zar) || 0;
  return z > 0 ? (z + z * 0.1).toFixed(2) : "";
}

export default function Form33CHistory({ onLoad, refreshKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareData, setCompareData] = useState(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Form33CRecord.list("-created_date", 100);
      setRecords(data || []);
    } catch (e) { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { loadRecords(); }, [refreshKey]);

  const handleDelete = async (id) => {
    if (!confirm("یہ ریکارڈ حذف کریں؟")) return;
    try {
      await base44.entities.Form33CRecord.delete(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) { alert("حذف نہیں ہو سکا"); }
  };

  const handleLoad = (rec) => {
    let vills = [];
    try { vills = JSON.parse(rec.villages_json || "[]"); } catch { vills = []; }
    if (!vills.length) vills = [{ id: Date.now() + Math.random(), mouza: "", tehsil: "", total_bills: "", total_zar: "", surcharge_override: "" }];
    vills = vills.map(v => ({ ...v, id: Date.now() + Math.random() }));
    onLoad?.(rec, vills);
  };

  const handleCompare = () => {
    const map = {};
    const seasons = [];
    records.forEach(rec => {
      const label = `${rec.fasal} ${rec.year}`;
      if (!seasons.includes(label)) seasons.push(label);
      let vills = [];
      try { vills = JSON.parse(rec.villages_json || "[]"); } catch { vills = []; }
      vills.forEach(v => {
        const name = (v.mouza || "").trim() || "(بے نام)";
        if (!map[name]) map[name] = {};
        map[name][label] = {
          bills: v.total_bills || "—",
          zar: v.total_zar || "—",
          total: calcTotal(v) || "—",
        };
      });
    });
    setCompareData({ map, seasons: seasons.sort() });
    setCompareOpen(true);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-violet-600" /> محفوظ شدہ ریکارڈز
        </h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleCompare} disabled={records.length < 1}
            className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1">
            <GitCompare className="w-3.5 h-3.5" /> موازنہ کریں
          </Button>
          <Button size="sm" variant="outline" onClick={loadRecords} disabled={loading}
            className="h-7 text-xs gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> ریفریش
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-8">
          <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-[11px] text-slate-400">ابھی کوئی ریکارڈ محفوظ نہیں۔ "محفوظ کریں" بٹن سے ریکارڈ محفوظ کریں۔</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(rec => {
            let count = 0;
            try { count = JSON.parse(rec.villages_json || "[]").length; } catch { count = 0; }
            return (
              <div key={rec.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 hover:border-violet-300 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-violet-700" dir="rtl">{rec.fasal?.slice(0,2) || "—"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-slate-800" dir="rtl">فصل {rec.fasal} {rec.year}ء</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {count} موضع{rec.district ? ` • ${rec.district}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleLoad(rec)}
                  className="h-7 text-[10px] gap-1 border-blue-300 text-blue-700 hover:bg-blue-50">
                  <Upload className="w-3 h-3" /> لوڈ
                </Button>
                <button onClick={() => handleDelete(rec.id)} className="text-slate-300 hover:text-red-500 shrink-0 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {compareOpen && compareData && (
        <CompareModal data={compareData} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}

function CompareModal({ data, onClose }) {
  const { map, seasons } = data;
  const villages = Object.keys(map).sort();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-auto py-6 px-3">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-violet-50 rounded-t-xl">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-violet-600" /> مواضع کا موازنہ (مختلف فصلوں)
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-x-auto" dir="rtl">
          {villages.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">کوئی ڈیٹا نہیں</p>
          ) : (
            <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr className="bg-violet-100">
                  <th className="border border-violet-300 px-3 py-2 text-center text-[11px]" style={{ fontFamily: "serif" }}>نام موضع</th>
                  {seasons.map(s => (
                    <th key={s} className="border border-violet-300 px-3 py-2 text-center text-[11px]" style={{ fontFamily: "serif" }}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {villages.map((name, i) => (
                  <tr key={name} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-800" style={{ fontFamily: "serif" }}>{name}</td>
                    {seasons.map(s => {
                      const cell = map[name][s];
                      if (!cell) return <td key={s} className="border border-slate-200 px-3 py-2 text-center text-slate-300">—</td>;
                      return (
                        <td key={s} className="border border-slate-200 px-3 py-2 text-center text-[10px] leading-relaxed">
                          <div>بلز: <span className="font-semibold text-slate-700">{cell.bills}</span></div>
                          <div>زر: <span className="font-semibold text-slate-700">{cell.zar}</span></div>
                          <div className="text-emerald-700 font-semibold">+10%: {cell.total}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}