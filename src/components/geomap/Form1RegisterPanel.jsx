import React, { useMemo } from "react";
import { X, Trash2, Download, Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

// Register grouped by farmer (one serial per occupier). Under the occupier name,
// khasra numbers are laid out HORIZONTALLY (each with kanal beneath + crop) so the
// register stays compact and does not waste pages. Chips are grouped by crop.
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
  const groups = useMemo(() => {
    const map = new Map();
    for (const a of allocations) {
      const key = `${a.farmer_name || ""}||${a.father || ""}||${a.phone || ""}||${a.cnic || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          farmer_name: a.farmer_name || "",
          father: a.father || "",
          phone: a.phone || "",
          cnic: a.cnic || "",
          items: [],
        });
      }
      map.get(key).items.push(a);
    }
    return [...map.values()];
  }, [allocations]);

  if (!open) return null;

  const farmerTotals = (g) =>
    g.items.reduce((s, it) => ({ kanal: s.kanal + (it.kanal || 0), acres: s.acres + (it.acres || 0) }), { kanal: 0, acres: 0 });

  const groupByCrop = (items) => {
    const out = {};
    for (const it of items) {
      const c = it.crop_name || "—";
      if (!out[c]) out[c] = [];
      out[c].push(it);
    }
    return out;
  };

  const handlePrintPDF = () => {
    if (allocations.length === 0) {
      toast.error("Allocate patches first");
      return;
    }
    const rows = groups
      .map((g, i) => {
        const t = farmerTotals(g);
        const byCrop = groupByCrop(g.items);
        const khasraCell = Object.keys(byCrop)
          .map((crop) => {
            const chips = byCrop[crop]
              .map(
                (it) =>
                  `<span style="display:inline-block;text-align:center;margin:0 1px;min-width:34px;">
                    <div style="font-weight:700;">${esc(it.khasra)}</div>
                    <div style="color:#1d4ed8;">${it.kanal}K</div>
                  </span>`
              )
              .join("");
            return `<span style="display:inline-block;margin-right:6px;vertical-align:top;border:1px solid #cbd5e1;padding:1px 2px;">
              <div style="font-size:7px;font-weight:700;color:#047857;">${esc(crop)}</div>${chips}
            </span>`;
          })
          .join("");
        const khata = [...new Set(g.items.map((it) => it.khata_no).filter(Boolean))].join(", ");
        const tenure = [...new Set(g.items.map((it) => it.tenure).filter(Boolean))].join(", ");
        return `<tr>
          <td style="text-align:center;font-weight:700;">${i + 1}</td>
          <td><b>${esc(g.farmer_name)}</b><br/><span style="font-size:7px;color:#475569;">S/o ${esc(g.father)}<br/>${esc(g.phone)} · ${esc(g.cnic)}</span></td>
          <td>${khasraCell}</td>
          <td style="text-align:center;font-weight:700;color:#1d4ed8;">${t.kanal}</td>
          <td style="text-align:center;font-weight:700;color:#b45309;">${t.acres.toFixed(3)}</td>
          <td>${esc(khata)}</td>
          <td>${esc(tenure)}</td>
        </tr>`;
      })
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Form 1 Register</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: 'Inter', Arial, sans-serif; color:#1e293b; }
      h1 { font-size:16px; text-align:center; margin:0 0 2px; }
      h2 { font-size:12px; text-align:center; margin:0 0 6px; font-weight:600; }
      .meta { font-size:10px; text-align:center; margin-bottom:8px; color:#475569; }
      table { width:100%; border-collapse:collapse; font-size:9px; }
      th, td { border:1px solid #94a3b8; padding:2px 3px; vertical-align:top; }
      th { background:#1e3a5f; color:#fff; font-weight:700; }
      tr:nth-child(even) td { background:#f1f5f9; }
      .totals { margin-top:8px; font-size:11px; font-weight:bold; text-align:right; }
      .foot { margin-top:18px; display:flex; justify-content:space-between; font-size:10px; }
    </style></head><body>
    <h1>FORM 1 REGISTER (Girdawari)</h1>
    <h2>${esc(mapData?.title || "")}${selectedMoga ? ` — Moga ${esc(selectedMoga)}` : ""}</h2>
    <div class="meta">Village: ${esc(info.village)} | Mouza: ${esc(info.mouza)} | Tehsil: ${esc(info.tehsil)} | District: ${esc(info.district)} | Channel: ${esc(info.channel)} | Side: ${esc(info.side)} | Outlet RD: ${esc(info.outlet_rd)}</div>
    <table><thead><tr><th>Sr</th><th>Occupier Name</th><th>Khasra No. (kanal / crop)</th><th>Total K</th><th>Total Ac</th><th>Khata</th><th>Owner/Tenant</th></tr></thead><tbody>${rows}</tbody></table>
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
          <div className="text-xs text-slate-500">{groups.length} occupier{groups.length !== 1 ? "s" : ""}</div>
          <div className="ml-auto text-[10px] text-slate-400">Use “Draw Patch” on the map to add a farmer's land quickly</div>
        </div>

        <div className="flex-1 overflow-auto">
          {groups.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm px-4 text-center">
              ابھی کوئی پیچ الوٹ نہیں۔ میپ پر “Draw Patch” آن کریں، فارمر کی زمین پر کلوزد پیچ بنائیں اور تفصیلات درج کریں۔
            </div>
          ) : (
            <table className="w-full text-[10px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white">
                  <th className="px-1 py-1 border border-slate-300 sticky left-0 bg-slate-800">#</th>
                  <th className="px-1 py-1 border border-slate-300 whitespace-nowrap">Occupier Name</th>
                  <th className="px-1 py-1 border border-slate-300">Khasra No. (kanal / crop)</th>
                  <th className="px-1 py-1 border border-slate-300">Tot K</th>
                  <th className="px-1 py-1 border border-slate-300">Tot Ac</th>
                  <th className="px-1 py-1 border border-slate-300">Khata</th>
                  <th className="px-1 py-1 border border-slate-300">Own/Tnt</th>
                  <th className="px-1 py-1 border border-slate-300"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => {
                  const t = farmerTotals(g);
                  const byCrop = groupByCrop(g.items);
                  const khata = [...new Set(g.items.map((it) => it.khata_no).filter(Boolean))].join(", ");
                  const tenure = [...new Set(g.items.map((it) => it.tenure).filter(Boolean))].join(", ");
                  return (
                    <tr key={g.key} className="even:bg-slate-50 align-top">
                      <td className="px-1 py-1 border border-slate-200 text-center font-bold sticky left-0 bg-inherit">{i + 1}</td>
                      <td className="px-1 py-1 border border-slate-200">
                        <div className="font-medium">{g.farmer_name}</div>
                        <div className="text-[8px] text-slate-500">S/o {g.father}</div>
                        <div className="text-[8px] font-mono text-slate-500">{g.phone}</div>
                        <div className="text-[8px] font-mono text-slate-500">{g.cnic}</div>
                      </td>
                      <td className="px-1 py-1 border border-slate-200">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.keys(byCrop).map((crop) => (
                            <div key={crop} className="flex items-start gap-1 border border-emerald-200 bg-emerald-50/40 rounded px-1 py-0.5">
                              <span className="text-[8px] font-bold text-emerald-700 mt-0.5 whitespace-nowrap">{crop}</span>
                              <div className="flex flex-wrap gap-0.5">
                                {byCrop[crop].map((it) => (
                                  <div key={it.id} className="border border-slate-300 rounded px-1 text-center min-w-[48px] bg-white">
                                    <div className="font-mono font-bold text-[9px] text-indigo-700 leading-tight">{it.khasra}</div>
                                    <div className="font-mono text-[9px] text-blue-700 leading-tight">{it.kanal} K</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-1 py-1 border border-slate-200 text-center font-mono font-bold text-blue-700">{t.kanal}</td>
                      <td className="px-1 py-1 border border-slate-200 text-center font-mono font-bold text-amber-700">{t.acres.toFixed(3)}</td>
                      <td className="px-1 py-1 border border-slate-200 text-center">{khata}</td>
                      <td className="px-1 py-1 border border-slate-200 text-center">{tenure}</td>
                      <td className="px-1 py-1 border border-slate-200 text-center">
                        <button
                          onClick={() => g.items.forEach((it) => onRemove(it.id))}
                          className="text-red-500 hover:text-red-700"
                          title="Remove all allocations of this occupier"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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