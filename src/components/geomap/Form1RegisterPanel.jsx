import React, { useMemo } from "react";
import { X, Trash2, Download, Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

// Excel-style Form 1 register: each occupier = 3 rows sharing one serial number.
//   Row A — farmer details (name, father, owner, khata, crop, land type, totals, …)
//   Row B — "Khasra_No" with each khasra listed horizontally
//   Row C — "Kanal"     with each acre's kanal listed horizontally (aligned under B)
// Khasra are grouped per mustateel (e.g. 840/1,2,3) with kanal per acre (8,8,8).
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
          khata_no: a.khata_no || "",
          crop_name: a.crop_name || "",
          land_type: a.land_type || "",
          tenure: a.tenure || "",
          channel_nme: a.channel_nme || "",
          outlet_rd: a.outlet_rd || "",
          side: a.side || "",
          village: a.village || "",
          mouza: a.mouza || "",
          tehsil: a.tehsil || "",
          district: a.district || "",
          items: [],
        });
      }
      map.get(key).items.push(a);
    }
    return [...map.values()];
  }, [allocations]);

  if (!open) return null;

  const farmerTotals = (g) =>
    g.items.reduce(
      (s, it) => ({ kanal: s.kanal + (it.kanal || 0), acres: s.acres + (it.acres || 0) }),
      { kanal: 0, acres: 0 }
    );

  const handlePrintPDF = () => {
    if (allocations.length === 0) {
      toast.error("Allocate patches first");
      return;
    }
    const rows = groups
      .map((g, i) => {
        const t = farmerTotals(g);
        const entries = farmerEntries(g.items);
        const khasraCells = entries
          .map((e) => `<span class="cell">${esc(e.khasra)}</span>`)
          .join("");
        const kanalCells = entries.map((e) => `<span class="cell">${esc(e.kanal)}</span>`).join("");
        return `
        <tr>
          <td class="sr" rowspan="3">${i + 1}</td>
          <td><b>${esc(g.farmer_name)}</b><br/><span class="sub">S/o ${esc(g.father)}</span></td>
          <td class="blk"></td>
          <td class="num">${t.kanal}</td>
          <td class="num">${t.acres.toFixed(3)}</td>
          <td>${esc(g.khata_no)}</td>
          <td>${esc(g.tenure)}</td>
          <td>${esc(g.crop_name)}</td>
          <td>${esc(g.land_type)}</td>
          <td>${esc(g.channel_nme)}</td>
          <td>${esc(g.outlet_rd)}</td>
          <td>${esc(g.side)}</td>
          <td>${esc(g.village)}</td>
        </tr>
        <tr class="detail"><td class="lbl">Khasra_No</td><td colspan="12" class="strip">${khasraCells}</td></tr>
        <tr class="detail"><td class="lbl">Kanal</td><td colspan="12" class="strip">${kanalCells}</td></tr>`;
      })
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Form 1 Register</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: 'Inter', Arial, sans-serif; color:#1e293b; }
      h1 { font-size:15px; text-align:center; margin:0 0 2px; }
      h2 { font-size:11px; text-align:center; margin:0 0 5px; font-weight:600; }
      .meta { font-size:9px; text-align:center; margin-bottom:6px; color:#475569; }
      table { width:100%; border-collapse:collapse; font-size:8px; }
      th, td { border:1px solid #94a3b8; padding:2px 3px; vertical-align:top; }
      th { background:#1e3a5f; color:#fff; font-weight:700; }
      tr:nth-child(3n+1) td { background:#f8fafc; }
      .sr { text-align:center; font-weight:700; font-size:11px; background:#e2e8f0 !important; }
      .sub { font-size:7px; color:#475569; }
      .num { text-align:center; font-weight:700; }
      .blk { background:#f1f5f9; }
      .detail td { background:#fff; }
      .lbl { font-weight:700; background:#eef2ff !important; color:#3730a3; text-align:center; }
      .strip { line-height:1.6; }
      .cell { display:inline-block; min-width:46px; text-align:center; margin:0 1px; border:1px solid #cbd5e1; border-radius:2px; padding:0 2px; }
      .totals { margin-top:8px; font-size:11px; font-weight:bold; text-align:right; }
      .foot { margin-top:16px; display:flex; justify-content:space-between; font-size:10px; }
    </style></head><body>
    <h1>FORM 1 REGISTER (Girdawari)</h1>
    <h2>${esc(mapData?.title || "")}${selectedMoga ? ` — Moga ${esc(selectedMoga)}` : ""}</h2>
    <div class="meta">Village: ${esc(info.village)} | Mouza: ${esc(info.mouza)} | Tehsil: ${esc(info.tehsil)} | District: ${esc(info.district)} | Channel: ${esc(info.channel)} | Side: ${esc(info.side)} | Outlet RD: ${esc(info.outlet_rd)}</div>
    <table><thead><tr>
      <th>Sr</th><th>Occupier Name</th><th>Khasra No. / Kanal</th><th>Tot K</th><th>Tot Ac</th><th>Khata</th><th>Own/Tnt</th><th>Crop</th><th>Land</th><th>Channel</th><th>Outlet</th><th>Side</th><th>Village</th>
    </tr></thead><tbody>${rows}</tbody></table>
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

  const COLS = ["Sr", "Occupier Name", "Khasra No. / Kanal", "Tot K", "Tot Ac", "Khata", "Own/Tnt", "Crop", "Land", "del"];

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
                  {COLS.map((h) => (
                    <th key={h} className="px-1 py-1 border border-slate-300 whitespace-nowrap min-w-[44px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => {
                  const t = farmerTotals(g);
                  const entries = farmerEntries(g.items);
                  return (
                    <React.Fragment key={g.key}>
                      {/* Row A — farmer details */}
                      <tr className="bg-slate-50/60 align-top">
                        <td className="px-1 py-1 border border-slate-200 text-center font-bold text-slate-700" rowSpan={3}>{i + 1}</td>
                        <td className="px-1 py-1 border border-slate-200">
                          <div className="font-medium">{g.farmer_name}</div>
                          <div className="text-[8px] text-slate-500">S/o {g.father}</div>
                          <div className="text-[8px] font-mono text-slate-500">{g.phone}</div>
                          <div className="text-[8px] font-mono text-slate-500">{g.cnic}</div>
                        </td>
                        <td className="px-1 py-1 border border-slate-200 bg-slate-100"></td>
                        <td className="px-1 py-1 border border-slate-200 text-center font-mono font-bold text-blue-700">{t.kanal}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center font-mono font-bold text-amber-700">{t.acres.toFixed(3)}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center">{g.khata_no}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center">{g.tenure}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center">{g.crop_name}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center">{g.land_type}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center">
                          <button onClick={() => g.items.forEach((it) => onRemove(it.id))} className="text-red-500 hover:text-red-700" title="Remove occupier">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                      {/* Row B — Khasra_No */}
                      <tr className="align-top">
                        <td className="px-1 py-1 border border-slate-200 text-center font-bold text-indigo-700 bg-indigo-50">Khasra_No</td>
                        <td className="px-1 py-1 border border-slate-200" colSpan={7}>
                          <div className="flex flex-wrap gap-1">
                            {entries.length === 0 ? <span className="text-slate-300">—</span> : entries.map((e, j) => (
                              <div key={j} className="border border-slate-300 rounded px-1 text-center min-w-[56px] bg-white">
                                <div className="font-mono font-bold text-[9px] text-indigo-700 leading-tight">{e.khasra}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                      {/* Row C — Kanal (aligned under B) */}
                      <tr className="align-top">
                        <td className="px-1 py-1 border border-slate-200 text-center font-bold text-blue-700 bg-blue-50">Kanal</td>
                        <td className="px-1 py-1 border border-slate-200" colSpan={7}>
                          <div className="flex flex-wrap gap-1">
                            {entries.length === 0 ? <span className="text-slate-300">—</span> : entries.map((e, j) => (
                              <div key={j} className="border border-slate-300 rounded px-1 text-center min-w-[56px] bg-white">
                                <div className="font-mono text-[9px] text-blue-700 leading-tight">{e.kanal}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
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

// Parse a patch khasra like "840/3,4,5; 841/1,2" into mustateel/acres groups.
function parsePatchGroups(khasra) {
  return String(khasra || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => {
      const [m, ac] = p.split("/");
      return { must: (m || "").trim(), acres: String(ac || "").split(",").map((n) => n.trim()).filter(Boolean) };
    })
    .filter((g) => g.must && g.acres.length);
}

// Build horizontal khasra/kanal entries for one farmer.
// Cell allocations → grouped by mustateel: "840/3,4" + "8,2".
// Patch allocations → distribute kanal as 8-per-acre then remainder.
function farmerEntries(items) {
  const entries = [];
  const cells = items.filter((it) => it.acre_no != null);
  const patches = items.filter((it) => it.geometry);

  const byMust = {};
  for (const c of cells) {
    const m = c.mustateel_no || "";
    (byMust[m] = byMust[m] || []).push(c);
  }
  for (const m of Object.keys(byMust)) {
    const arr = byMust[m].slice().sort((a, b) => (a.acre_no || 0) - (b.acre_no || 0));
    entries.push({
      khasra: `${m}/${arr.map((a) => a.acre_no).join(",")}`,
      kanal: arr.map((a) => a.kanal).join(","),
    });
  }

  for (const p of patches) {
    const groups = parsePatchGroups(p.khasra);
    let remaining = p.kanal || 0;
    for (const g of groups) {
      const kanals = g.acres.map(() => {
        const k = Math.min(8, remaining);
        remaining -= k;
        return k;
      });
      entries.push({ khasra: `${g.must}/${g.acres.join(",")}`, kanal: kanals.join(",") });
    }
  }
  return entries;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}