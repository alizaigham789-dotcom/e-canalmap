import React from "react";
import { X, Trash2, Download, Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

// Register compiled from both cell allocations and drawn patches. Each row has a
// unified `khasra` string, `kanal`, `acres`, `tenure` (Owner/Tenant). Header info
// auto-filled from the map editor header line and editable here.
export default function Form1RegisterPanel({
  open,
  onClose,
  mapData,
  selectedMoga,
  info,
  setInfo,
  allocations,
  onRemove,
  totals,
  onSave,
  saving,
}) {
  if (!open) return null;

  const handlePrintPDF = () => {
    if (allocations.length === 0) {
      toast.error("Allocate patches first");
      return;
    }
    const cols = [
      ["Sr", (_r, i) => i + 1],
      ["Khasra No", (r) => esc(r.khasra)],
      ["Mustateel", (r) => esc(r.mustateel_no)],
      ["Farmer Name", (r) => esc(r.farmer_name)],
      ["Father", (r) => esc(r.father)],
      ["Phone", (r) => esc(r.phone)],
      ["CNIC", (r) => esc(r.cnic)],
      ["Khata", (r) => esc(r.khata_no)],
      ["Crop", (r) => esc(r.crop_name)],
      ["Land Type", (r) => esc(r.land_type)],
      ["Owner/Tenant", (r) => esc(r.tenure)],
      ["Kanal", (r) => r.kanal],
      ["Acres", (r) => (r.acres || 0).toFixed(3)],
      ["Channel", (r) => esc(r.channel_nme)],
      ["Outlet RD", (r) => esc(r.outlet_rd)],
      ["Side", (r) => esc(r.side)],
      ["Village", (r) => esc(r.village)],
      ["Mouza", (r) => esc(r.mouza)],
      ["Tehsil", (r) => esc(r.tehsil)],
      ["District", (r) => esc(r.district)],
      ["Sub Div", (r) => esc(r.sub_division)],
      ["Division", (r) => esc(r.division)],
    ];
    const head = cols.map((c) => `<th>${c[0]}</th>`).join("");
    const body = allocations.map((r, i) => `<tr>${cols.map((c) => `<td>${c[1](r, i)}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Form 1 Register</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: 'Inter', Arial, sans-serif; color:#1e293b; }
      h1 { font-size:16px; text-align:center; margin:0 0 2px; }
      h2 { font-size:12px; text-align:center; margin:0 0 6px; font-weight:600; }
      .meta { font-size:10px; text-align:center; margin-bottom:8px; color:#475569; }
      table { width:100%; border-collapse:collapse; font-size:8px; }
      th, td { border:1px solid #94a3b8; padding:2px 3px; white-space:nowrap; }
      th { background:#1e3a5f; color:#fff; font-weight:700; }
      tr:nth-child(even) td { background:#f1f5f9; }
      .totals { margin-top:8px; font-size:11px; font-weight:bold; text-align:right; }
      .foot { margin-top:18px; display:flex; justify-content:space-between; font-size:10px; }
    </style></head><body>
    <h1>FORM 1 REGISTER (Girdawari)</h1>
    <h2>${esc(mapData?.title || "")}${selectedMoga ? ` — Moga ${esc(selectedMoga)}` : ""}</h2>
    <div class="meta">Village: ${esc(info.village)} | Mouza: ${esc(info.mouza)} | Tehsil: ${esc(info.tehsil)} | District: ${esc(info.district)} | Channel: ${esc(info.channel)} | Side: ${esc(info.side)} | Outlet RD: ${esc(info.outlet_rd)}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <div class="totals">Total Area: ${totals.acres.toFixed(3)} Acres &nbsp;|&nbsp; ${totals.kanal.toFixed(2)} Kanal</div>
    <div class="foot"><span>Girdawar _______________</span><span>Patwari _______________</span><span>Zilladar _______________</span></div>
    </body></html>`;
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Allow pop-ups to download PDF");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-amber-600 to-amber-700 text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">Form 1 Register — Girdawari</span>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">Moga {selectedMoga || "—"}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 shrink-0">
          {[
            ["Village", "village"],
            ["Mouza", "mouza"],
            ["Tehsil", "tehsil"],
            ["District", "district"],
            ["Channel", "channel"],
            ["Outlet RD", "outlet_rd"],
            ["Side", "side"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-[9px] font-bold text-slate-500 uppercase block">{label}</label>
              <input value={info[key] || ""} onChange={(e) => setInfo((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full h-7 text-xs px-1.5 border border-slate-200 rounded" />
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg px-4 py-1.5">
            <div className="text-[9px] font-bold text-amber-700 uppercase">Total Acres</div>
            <div className="text-lg font-bold text-amber-800">{totals.acres.toFixed(3)}</div>
          </div>
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-1.5">
            <div className="text-[9px] font-bold text-blue-700 uppercase">Total Kanal</div>
            <div className="text-lg font-bold text-blue-800">{totals.kanal.toFixed(2)}</div>
          </div>
          <div className="text-xs text-slate-500">{allocations.length} portion{allocations.length !== 1 ? "s" : ""}</div>
          <div className="ml-auto text-[10px] text-slate-400">Use “Draw Patch” on the map to add a farmer's land quickly</div>
        </div>

        <div className="flex-1 overflow-auto">
          {allocations.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm px-4 text-center">
              ابھی کوئی پیچ الوٹ نہیں۔ میپ پر “Draw Patch” آن کریں، فارمر کی زمین پر کلوزد پیچ بنائیں اور تفصیلات درج کریں۔
            </div>
          ) : (
            <table className="w-full text-[10px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white">
                  <th className="px-1 py-1 border border-slate-300 sticky left-0 bg-slate-800">#</th>
                  {["Khasra", "Must", "Farmer", "Father", "Phone", "CNIC", "K", "Acres", "Crop", "Type", "Own/Tnt", ""].map((h) => (
                    <th key={h} className="px-1 py-1 border border-slate-300 whitespace-nowrap min-w-[55px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allocations.map((r, i) => (
                  <tr key={r.id} className="even:bg-slate-50">
                    <td className="px-1 py-0.5 border border-slate-200 text-center font-bold sticky left-0 bg-inherit">{i + 1}</td>
                    <td className="px-1 py-0.5 border border-slate-200 text-center font-mono font-bold text-indigo-700">{r.khasra}</td>
                    <td className="px-1 py-0.5 border border-slate-200 text-center font-mono">{r.mustateel_no}</td>
                    <td className="px-1 py-0.5 border border-slate-200 font-medium">{r.farmer_name}</td>
                    <td className="px-1 py-0.5 border border-slate-200">{r.father}</td>
                    <td className="px-1 py-0.5 border border-slate-200 font-mono">{r.phone}</td>
                    <td className="px-1 py-0.5 border border-slate-200 font-mono">{r.cnic}</td>
                    <td className="px-1 py-0.5 border border-slate-200 text-center font-mono font-bold">{r.kanal}</td>
                    <td className="px-1 py-0.5 border border-slate-200 text-center font-mono font-bold text-amber-700">{(r.acres || 0).toFixed(3)}</td>
                    <td className="px-1 py-0.5 border border-slate-200 text-center">{r.crop_name}</td>
                    <td className="px-1 py-0.5 border border-slate-200 text-center">{r.land_type}</td>
                    <td className="px-1 py-0.5 border border-slate-200 text-center">{r.tenure}</td>
                    <td className="px-1 py-0.5 border border-slate-200 text-center">
                      <button onClick={() => onRemove(r.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 h-12 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button onClick={handlePrintPDF} className="h-8 px-4 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-red-700">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
          <button onClick={onSave} disabled={saving} className="h-8 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}