import React, { useMemo } from "react";
import { X, Trash2, Download, Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

// Excel-style Form 1 register. Each occupier = 3 rows sharing one serial number:
//   Row A — farmer details (name, CNIC, phone, tenant, khata, totals…)
//   Row B — "Khasra/Kanal" : one box per acre (khasra on top, kanal below it)
//   Row C — "Crop"         : crop name beneath; one name spans consecutive same-crop acres
// Farmers with the same CNIC are merged. Header info (Moga, Section, Mouza, Sub
// Division, Division) is shown in a table form above the rows. An acre fully
// allotted to one farmer cannot be allotted to another (enforced at allocation time).
export default function Form1RegisterPanel({
  open,
  onClose,
  mapData,
  selectedMoga,
  info,
  setInfo,
  allocations,
  onRemove,
  onUpdateGroup,
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

  const mogaNo = selectedMoga || mapData?.moga_number || "—";
  const section = info?.sub_division || "—";
  const mouza = info?.mouza || info?.village || "—";
  const subDivision = info?.tehsil || "—";
  const division = info?.district || "—";

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
        const tenantCell =
          g.tenure === "Tenant" && g.tenant_name
            ? `${esc(g.tenant_name)}<br/><span class="sub">${esc(g.tenant_phone)}<br/>${esc(g.tenant_cnic)}</span>`
            : "—";
        return `
        <tr>
          <td class="sr" rowspan="3">${i + 1}</td>
          <td class="num mono">${esc(mogaNo)}</td>
          <td><b>${esc(g.farmer_name)}</b><br/><span class="sub">S/o ${esc(g.father)}</span><br/><span class="mono">${esc(g.cnic)}</span><br/><span class="sub">${esc(g.phone)}</span></td>
          <td>${tenantCell}</td>
          <td class="num">${esc(g.khata_no || "—")}</td>
          <td class="num">${t.kanal}</td>
          <td class="num">${t.acres.toFixed(3)}</td>
          <td class="num">${esc(info.channel || "—")}</td>
          <td>${esc(g.tenure)}</td>
        </tr>
        <tr class="detail"><td class="lbl">Khasra/Kanal</td><td colspan="7" class="strip">${boxes}</td></tr>
        <tr class="detail"><td class="lbl">Crop</td><td colspan="7" class="strip">${cropCells}</td></tr>`;
      })
      .join("");
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const srW = Math.max(14, String(groups.length || 1).length * 7 + 8);
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
      .sr { text-align:center; font-weight:700; font-size:${isMobile ? 8 : 11}px; background:#e2e8f0 !important; width:${srW}px; }
      th:first-child { width:${srW}px; }
      .sub { font-size:${isMobile ? 6 : 7}px; color:#475569; }
      .mono { font-family: monospace; font-size:${isMobile ? 6 : 8}px; }
      .num { text-align:center; font-weight:700; }
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
    <h1>Form 1 Register</h1>
    <div class="meta">Moga: ${esc(mogaNo)} &nbsp;|&nbsp; Section: ${esc(section)} &nbsp;|&nbsp; Mouza: ${esc(mouza)} &nbsp;|&nbsp; Sub Division: ${esc(subDivision)} &nbsp;|&nbsp; Division: ${esc(division)}</div>
    <table><thead><tr>
      <th>Sr</th><th>Moga No</th><th>Occupier Name</th><th>Tenant</th><th>Khata</th><th>Tot K</th><th>Tot Ac</th><th>Rajbah</th><th>Own/Tnt</th>
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

  const COLS = ["Sr", "Moga No", "Occupier Name", "Tenant", "Khata", "Tot K", "Tot Ac", "Rajbah", "Own/Tnt", ""];
  const GRID_W = 50;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-amber-600 to-amber-700 text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-bold tracking-wide">Form 1 Register</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
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

        {/* Header info (Moga, Section, Mouza, Sub Division, Division) in table form */}
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[10px]">
            <InfoCell label="Moga No" value={mogaNo} />
            <InfoCell label="Section" value={section} />
            <InfoCell label="Mouza" value={mouza} />
            <InfoCell label="Sub Division" value={subDivision} />
            <InfoCell label="Division" value={division} />
          </div>
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
                        <td className="px-1 py-1 border border-slate-200 text-center font-bold text-slate-700 w-6" rowSpan={3}>{i + 1}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center font-mono text-[9px] text-slate-700">{mogaNo}</td>
                        <td className="px-1 py-1 border border-slate-200">
                          <input value={g.farmer_name} onChange={(e) => onUpdateGroup(g.key, { farmer_name: e.target.value })} className="w-full font-medium text-[10px] bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none rounded-sm" />
                          <div className="font-mono text-[9px] text-slate-700 leading-tight">{g.cnic}</div>
                          <div className="text-[8px] text-slate-500 leading-tight">S/o {g.father}</div>
                          <div className="text-[8px] font-mono text-slate-500 leading-tight">{g.phone}</div>
                        </td>
                        <td className="px-1 py-1 border border-slate-200">
                          {g.tenure === "Tenant" ? (
                            <>
                              <div className="text-[9px] font-medium text-amber-800 leading-tight">{g.tenant_name}</div>
                              <div className="text-[8px] font-mono text-slate-600 leading-tight">{g.tenant_phone}</div>
                              <div className="text-[8px] font-mono text-slate-600 leading-tight">{g.tenant_cnic}</div>
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-1 py-1 border border-slate-200 text-center">
                          <input value={g.khata_no} onChange={(e) => onUpdateGroup(g.key, { khata_no: e.target.value })} className="w-12 text-center text-[10px] bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none rounded-sm" placeholder="—" />
                        </td>
                        <td className="px-1 py-1 border border-slate-200 text-center font-mono font-bold text-blue-700">{t.kanal}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center font-mono font-bold text-amber-700">{t.acres.toFixed(3)}</td>
                        <td className="px-1 py-1 border border-slate-200 text-center font-mono text-[9px] text-slate-700">{info.channel || "—"}</td>
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
                        <td className="px-1 py-1 border border-slate-200" colSpan={8}>
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
                        <td className="px-1 py-1 border border-slate-200" colSpan={8}>
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

function InfoCell({ label, value }) {
  return (
    <div className="border border-slate-200 rounded bg-white px-2 py-1">
      <div className="text-[8px] font-bold text-slate-400 uppercase">{label}</div>
      <div className="text-[10px] font-bold text-slate-700 truncate">{value}</div>
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