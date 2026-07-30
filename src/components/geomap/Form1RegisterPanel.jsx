import React, { useMemo } from "react";
import { X, Trash2, Download, Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

// Excel-style Form 1 register. Each occupier = 3 rows sharing one serial number:
//   Row A — farmer details (name, CNIC, totals, khata, tenure, tenant …)
//   Row B — "Khasra/Kanal" : one box per acre (khasra on top, kanal below it)
//   Row C — "Crop"         : crop name beneath; one name spans consecutive same-crop acres
// Farmers with the same CNIC are merged. An acre fully allotted to one farmer
// cannot be allotted to another (enforced at allocation time).
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
      const key = a.cnic ? `cnic:${a.cnic}` : `name:${a.farmer_name || ""}||${a.father || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          farmer_name: "",
          father: "",
          phone: "",
          cnic: "",
          khata_no: "",
          crop_name: "",
          land_type: "",
          tenure: "",
          tenant_name: "",
          tenant_phone: "",
          tenant_cnic: "",
          channel_nme: "",
          outlet_rd: "",
          side: "",
          village: "",
          mouza: "",
          tehsil: "",
          district: "",
          items: [],
        });
      }
      const g = map.get(key);
      g.items.push(a);
      const pick = (k) => { if (!g[k] && a[k]) g[k] = a[k]; };
      if (!g.farmer_name && a.farmer_name) g.farmer_name = a.farmer_name;
      pick("father"); pick("phone"); pick("cnic"); pick("khata_no");
      pick("crop_name"); pick("land_type"); pick("tenure");
      pick("tenant_name"); pick("tenant_phone"); pick("tenant_cnic");
      pick("channel_nme"); pick("outlet_rd"); pick("side");
      pick("village"); pick("mouza"); pick("tehsil"); pick("district");
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
        const acres = farmerAcres(g.items);
        const runs = cropRuns(acres);
        const boxes = acres
          .map((a) => `<span class="box"><span class="kh">${esc(a.khasra)}</span><span class="kn">${esc(a.kanal)}</span></span>`)
          .join("");
        const cropCells = runs
          .map((r) => `<span class="cell crop" style="min-width:${r.count * 50}px;">${esc(r.crop || "—")}</span>`)
          .join("");
        const tenantLine =
          g.tenure === "Tenant" && g.tenant_name
            ? `<div class="sub">Tenant: ${esc(g.tenant_name)} · ${esc(g.tenant_phone)} · ${esc(g.tenant_cnic)}</div>`
            : "";
        return `
        <tr>
          <td class="sr" rowspan="3">${i + 1}</td>
          <td><b>${esc(g.farmer_name)}</b><br/><span class="sub">S/o ${esc(g.father)}</span>${tenantLine}</td>
          <td class="mono">${esc(g.cnic)}</td>
          <td class="blk"></td>
          <td class="num">${t.kanal}</td>
          <td class="num">${t.acres.toFixed(3)}</td>
          <td>${esc(g.khata_no)}</td>
          <td>${esc(g.tenure)}</td>
        </tr>
        <tr class="detail"><td class="lbl">Khasra/Kanal</td><td></td><td colspan="5" class="strip">${boxes}</td></tr>
        <tr class="detail"><td class="lbl">Crop</td><td></td><td colspan="5" class="strip">${cropCells}</td></tr>`;
      })
      .join("");
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Form 1 Register</title>
    <style>
      @page { size: A4 ${isMobile ? "portrait" : "landscape"}; margin: ${isMobile ? "5mm" : "8mm"}; }
      body { font-family: 'Inter', Arial, sans-serif; color:#1e293b; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      h1 { font-size:${isMobile ? 12 : 15}px; text-align:center; margin:0 0 2px; }
      h2 { font-size:${isMobile ? 9 : 11}px; text-align:center; margin:0 0 5px; font-weight:600; }
      .meta { font-size:${isMobile ? 7 : 9}px; text-align:center; margin-bottom:6px; color:#475569; }
      table { width:100%; border-collapse:collapse; font-size:${isMobile ? 6 : 8}px; table-layout:fixed; }
      th, td { border:1px solid #94a3b8; padding:${isMobile ? "1px 2px" : "2px 3px"}; vertical-align:top; word-break:break-word; }
      th { background:#1e3a5f; color:#fff; font-weight:700; }
      tr:nth-child(3n+1) td { background:#f8fafc; }
      .sr { text-align:center; font-weight:700; font-size:${isMobile ? 8 : 11}px; background:#e2e8f0 !important; }
      .sub { font-size:${isMobile ? 6 : 7}px; color:#475569; }
      .mono { font-family: monospace; font-size:${isMobile ? 6 : 8}px; }
      .num { text-align:center; font-weight:700; }
      .blk { background:#f1f5f9; }
      .detail td { background:#fff; }
      .lbl { font-weight:700; background:#eef2ff !important; color:#3730a3; text-align:center; }
      .strip { line-height:1.6; }
      .box { display:inline-block; min-width:${isMobile ? 34 : 48}px; text-align:center; margin:0 1px; border:1px solid #6366f1; border-radius:2px; overflow:hidden; }
      .box .kh { display:block; font-weight:700; color:#3730a3; border-bottom:1px solid #c7d2fe; padding:0 2px; }
      .box .kn { display:block; color:#1d4ed8; padding:0 2px; }
      .cell.crop { display:inline-block; text-align:center; margin:0 1px; border:1px solid #a7f3d0; border-radius:2px; padding:0 2px; color:#047857; font-weight:700; background:#ecfdf5; }
      .totals { margin-top:8px; font-size:${isMobile ? 9 : 11}px; font-weight:bold; text-align:right; }
      .foot { margin-top:16px; display:flex; justify-content:space-between; font-size:${isMobile ? 8 : 10}px; }
    </style></head><body>
    <h1>FORM 1 REGISTER (Girdawari)</h1>
    <h2>${esc(mapData?.title || "")}${selectedMoga ? ` — Moga ${esc(selectedMoga)}` : ""}</h2>
    <div class="meta">Village: ${esc(info.village)} | Mouza: ${esc(info.mouza)} | Tehsil: ${esc(info.tehsil)} | District: ${esc(info.district)} | Division: ${esc(info.division)} | Circle: ${esc(info.circle)} | Sub Div: ${esc(info.sub_division)} | Channel: ${esc(info.channel)} | Side: ${esc(info.side)} | Outlet RD: ${esc(info.outlet_rd)}</div>
    <table><thead><tr>
      <th>Sr</th><th>Occupier Name</th><th>CNIC</th><th>Khasra / Kanal / Crop</th><th>Tot K</th><th>Tot Ac</th><th>Khata</th><th>Own/Tnt</th>
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

  const COLS = ["Sr", "Occupier Name", "CNIC", "Khasra / Kanal / Crop", "Tot K", "Tot Ac", "Khata", "Own/Tnt", ""];
  const GRID_W = 50;

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

        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-2 shrink-0">
          {[
            ["Village", "village"],
            ["Mouza", "mouza"],
            ["Tehsil", "tehsil"],
            ["District", "district"],
            ["Division", "division"],
            ["Circle", "circle"],
            ["Sub Div", "sub_division"],
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
          <div className="ml-auto text-[10px] text-slate-400">Same CNIC merged · full acre locked</div>
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
                  {COLS.map((h, i) => (
                    <th key={i} className="px-1 py-1 border border-slate-300 whitespace-nowrap min-w-[44px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => {
                  const t = farmerTotals(g);
                  const acres = farmerAcres(g.items);
                  const runs = cropRuns(acres);
                  const tpl = `repeat(${Math.max(acres.length, 1)}, minmax(${GRID_W}px, 1fr))`;
                  return (
                    <React.Fragment key={g.key}>
                      {/* Row A — farmer */}
                      <tr className="bg-slate-50/60 align-top">
                        <td className="px-1 py-1 border border-slate-200 text-center font-bold text-slate-700" rowSpan={3}>{i + 1}</td>
                        <td className="px-1 py-1 border border-slate-200">
                          <div className="font-medium">{g.farmer_name}</div>
                          <div className="text-[8px] text-slate-500">S/o {g.father}</div>
                          <div className="text-[8px] font-mono text-slate-500">{g.phone}</div>
                          {g.tenure === "Tenant" && g.tenant_name && (
                            <div className="text-[8px] text-amber-700 font-medium mt-0.5">Tenant: {g.tenant_name} · {g.tenant_phone} · {g.tenant_cnic}</div>
                          )}
                        </td>
                        <td className="px-1 py-1 border border-slate-200 font-mono text-[9px] text-slate-700">{g.cnic}</td>
                        <td className="px-1 py-1 border border-slate-200 bg-slate-100"></td>
                        <td className="px-1 py-1 border border-slate-200 text-center font-mono font-bold text-blue-700">{t.kanal}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center font-mono font-bold text-amber-700">{t.acres.toFixed(3)}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center">{g.khata_no}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center">{g.tenure}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center">
                          <button onClick={() => g.items.forEach((it) => onRemove(it.id))} className="text-red-500 hover:text-red-700" title="Remove occupier">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                      {/* Row B — Khasra/Kanal combined boxes (khasra top, kanal bottom) */}
                      <tr className="align-top">
                        <td className="px-1 py-1 border border-slate-200 text-center font-bold text-indigo-700 bg-indigo-50">Khasra/Kanal</td>
                        <td className="px-1 py-1 border border-slate-200"></td>
                        <td className="px-1 py-1 border border-slate-200" colSpan={6}>
                          <div style={{ display: "grid", gridTemplateColumns: tpl }}>
                            {acres.length === 0 ? <span className="text-slate-300">—</span> : acres.map((a, j) => (
                              <div key={j} className="border border-indigo-300 rounded bg-white text-center mx-0.5 overflow-hidden">
                                <div className="font-mono font-bold text-[9px] text-indigo-700 leading-tight border-b border-indigo-100">{a.khasra}</div>
                                <div className="font-mono text-[9px] text-blue-700 leading-tight">{a.kanal}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                      {/* Row C — Crop (one name spans consecutive same-crop acres) */}
                      <tr className="align-top">
                        <td className="px-1 py-1 border border-slate-200 text-center font-bold text-emerald-700 bg-emerald-50">Crop</td>
                        <td className="px-1 py-1 border border-slate-200"></td>
                        <td className="px-1 py-1 border border-slate-200" colSpan={6}>
                          <div style={{ display: "grid", gridTemplateColumns: tpl }}>
                            {runs.length === 0 ? <span className="text-slate-300">—</span> : runs.map((r, j) => (
                              <div key={j} style={{ gridColumn: `span ${r.count}` }} className="border border-emerald-300 rounded px-1 text-center bg-emerald-50 font-bold text-[9px] text-emerald-700 leading-tight mx-0.5">{r.crop || "—"}</div>
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

// Per-acre list for one farmer: each acre = { khasra, kanal, crop }.
// Cell allocations → one entry per (mustateel, acre), ordered by mustateel then acre.
// Patch allocations → distribute kanal as 8-per-acre then remainder.
function farmerAcres(items) {
  const acres = [];
  const cells = items.filter((it) => it.acre_no != null);
  const patches = items.filter((it) => it.geometry);

  const byMust = {};
  for (const c of cells) {
    const m = c.mustateel_no || "";
    (byMust[m] = byMust[m] || []).push(c);
  }
  for (const m of Object.keys(byMust).sort((a, b) => +a - +b)) {
    const arr = byMust[m].slice().sort((a, b) => (+a.acre_no || 0) - (+b.acre_no || 0));
    for (const a of arr) acres.push({ khasra: `${m}/${a.acre_no}`, kanal: a.kanal, crop: a.crop_name || "" });
  }

  for (const p of patches) {
    const groups = parsePatchGroups(p.khasra);
    let remaining = p.kanal || 0;
    for (const g of groups) {
      for (const ac of g.acres) {
        const k = Math.min(8, remaining);
        remaining -= k;
        acres.push({ khasra: `${g.must}/${ac}`, kanal: k, crop: p.crop_name || "" });
      }
    }
  }
  return acres;
}

// Group consecutive acres of the same crop into runs (for the Crop row spans).
function cropRuns(acres) {
  const runs = [];
  for (const a of acres) {
    const last = runs[runs.length - 1];
    if (last && last.crop === a.crop) last.count++;
    else runs.push({ crop: a.crop, count: 1 });
  }
  return runs;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}