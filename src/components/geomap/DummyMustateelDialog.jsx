import React, { useState, useMemo, useEffect } from "react";
import { findUnplacedMogasByLabel } from "@/lib/mogaArrange";
import { X, Search, Check, Trash2, Plus } from "lucide-react";

// Modal dialog for the "dummy mustateel" attach flow:
//  1. User clicks a dummy cell at the edge of the placed moga.
//  2. Types a Khasra (mustateel) number.
//  3. Unplaced mogas of the same village containing that mustateel are listed.
//  4. Confirm → the chosen moga is auto-placed so its matching mustateel sits
//     exactly on the dummy cell (chained to the previous moga).
//  5. If placed wrongly, Remove clears the placement right here; Done closes.
export default function DummyMustateelDialog({ open, dummy, dummyGeo, maps, village, placedMapId, placedMapIds, skipGeoCheck, onConfirm, onRemove, onClose }) {
  const [label, setLabel] = useState("");
  const [matches, setMatches] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState("");
  const [placedInfo, setPlacedInfo] = useState(null);

  useEffect(() => {
    if (open) {
      setLabel("");
      setMatches([]);
      setSelectedMapId("");
      setPlacedInfo(null);
    }
  }, [open]);

  // Live search: unplaced mogas of the same village whose mustateels include
  // the typed Khasra label.
  useEffect(() => {
    if (!open) return;
    const exclude = placedMapIds && placedMapIds.length ? placedMapIds : (placedMapId ? [placedMapId] : []);
    const ms = findUnplacedMogasByLabel(maps, village, label, exclude, { skipGeoCheck: !!skipGeoCheck });
    setMatches(
      ms.map(({ map, must }) => ({
        id: map.id,
        mogaNumber: map.moga_number || "",
        title: map.title || "",
        must,
      }))
    );
    // Auto-select the first match so the user can confirm immediately
    setSelectedMapId(ms.length > 0 ? ms[0].map.id : "");
  }, [label, open, maps, village, placedMapId]);

  const handleConfirm = () => {
    const match = matches.find((m) => m.id === selectedMapId) || matches[0];
    if (!match || !dummyGeo) return;
    onConfirm(match, dummyGeo);
    setPlacedInfo({ mapId: match.id, mogaNumber: match.mogaNumber, title: match.title, label: match.must.label });
  };

  const handleRemove = () => {
    if (!placedInfo) return;
    onRemove(placedInfo.mapId);
    setPlacedInfo(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[92%] max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 bg-gradient-to-r from-emerald-600 to-teal-500 text-white">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-bold" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
              نیا موگہ جوڑیں
            </span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3" dir="rtl">
          {!placedInfo ? (
            <>
              <p className="text-[11px] text-slate-500 leading-relaxed" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
                اس مستطیل کا کہسڑا نمبر درج کریں جو اس خالی خانے میں آئے گا۔ اگر یہ نمبر کسی اور غیر پلیس شدہ موگہ میں موجود ہے تو وہ موگہ یہاں خودبخود جڑ جائے گا۔
              </p>

              {/* Label input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && matches.length > 0) handleConfirm(); }}
                  placeholder="کہسڑا نمبر (مستطیل نمبر) درج کریں"
                  className="w-full h-10 pr-10 pl-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-right"
                  style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}
                  autoFocus
                />
              </div>

              {/* Matches */}
              {label.trim() && (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {matches.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-3" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
                      اس نمبر پر کوئی غیر پلیس شدہ موگہ نہیں ملا
                    </p>
                  ) : (
                    matches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMapId(m.id)}
                        className={`w-full flex items-center justify-between px-3 h-11 rounded-lg border text-right transition-all ${
                          selectedMapId === m.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
                            موگہ {m.mogaNumber || "—"}
                          </span>
                          <span className="text-[10px] text-slate-500">{m.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                          کہسڑا {m.must.label}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConfirm}
                  disabled={!selectedMapId}
                  className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
                  style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}
                >
                  <Check className="w-3.5 h-3.5" />
                  تصدیق اور جوڑیں
                </button>
                <button
                  onClick={onClose}
                  className="h-10 px-4 flex items-center justify-center bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                  style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}
                >
                  منسوخ
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Placed confirmation — Remove + Save (Done) */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-800 leading-relaxed" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
                  موگہ <b>{placedInfo.mogaNumber || "—"}</b> کہسڑا <b>{placedInfo.label}</b> پر پلیس ہو گیا۔ اگر غلط ہے تو ہٹا دیں، ورنہ محفوظ کر لیں۔
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleRemove}
                  className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                  style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ہٹائیں (Remove)
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 h-10 flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                  style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}
                >
                  <Check className="w-3.5 h-3.5" />
                  محفوظ کریں (Save)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}