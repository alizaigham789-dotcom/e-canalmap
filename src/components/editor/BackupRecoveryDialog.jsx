import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Database, RefreshCw, CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { getAllBackups } from "@/lib/mapBackup";
import { getMaxSnapshot } from "@/lib/serverSnapshot";
import { base44 } from "@/api/base44Client";

const PARCEL_TYPES = ["acre", "mustateel", "muraba"];

function countNonParcels(objects) {
  return (objects || []).filter(o => !PARCEL_TYPES.includes(o.type)).length;
}

function typeBreakdown(objects) {
  const tb = {};
  for (const o of objects || []) {
    tb[o.type] = (tb[o.type] || 0) + 1;
  }
  return tb;
}

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function BackupRecoveryDialog({ mapIds, onClose }) {
  const [mapData, setMapData] = useState({}); // { mapId: { title, serverObjs, backups: [], bestVersion, restoring, restored } }
  const [scanning, setScanning] = useState(true);

  const scan = useCallback(async () => {
    setScanning(true);
    const result = {};

    for (const { id, title, moga_number } of mapIds) {
      // Fetch current server data
      let serverObjs = [];
      try {
        const maps = await base44.entities.LandMap.filter({ id });
        if (maps[0]) {
          serverObjs = maps[0].drawing_data ? JSON.parse(maps[0].drawing_data) : [];
        }
      } catch {}

      const serverNonParcel = countNonParcels(serverObjs);

      // Read all IndexedDB backup versions
      const idbVersions = await getAllBackups(id);

      // Read server peak snapshot (cross-device recovery source)
      const serverSnap = await getMaxSnapshot(id);
      const serverSnapBackup = [];
      if (serverSnap && serverSnap.drawing_data) {
        try {
          const snapObjs = JSON.parse(serverSnap.drawing_data);
          if (snapObjs.length > 0) serverSnapBackup.push({ objects: snapObjs, viewport: serverSnap.viewport, editorSettings: serverSnap.editor_settings, timestamp: new Date(serverSnap.created_date).getTime(), source: "Server Snapshot" });
        } catch {}
      }

      // Read sessionStorage backup
      const sessionBackups = [];
      try {
        const raw = sessionStorage.getItem(`chakbandi_backup_${id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.objects) {
            sessionBackups.push({ ...parsed, source: "session" });
          }
        }
      } catch {}

      // Combine all backup sources
      const allBackups = [
        ...serverSnapBackup,
        ...sessionBackups.map(b => ({ ...b, source: "Session Storage" })),
        ...idbVersions.map(b => ({ ...b, source: "IndexedDB" })),
      ].filter(b => b.objects && b.objects.length > 0);

      // Find best version — the one with the most non-parcel objects
      let bestVersion = null;
      for (const b of allBackups) {
        const np = countNonParcels(b.objects);
        if (np > 0 && (!bestVersion || np > countNonParcels(bestVersion.objects))) {
          bestVersion = b;
        }
      }

      result[id] = {
        title,
        moga_number,
        serverObjs,
        serverNonParcel,
        backups: allBackups,
        bestVersion,
        restoring: false,
        restored: false,
      };
    }

    setMapData(result);
    setScanning(false);
  }, [mapIds]);

  useEffect(() => { scan(); }, [scan]);

  const handleRestore = async (mapId) => {
    const info = mapData[mapId];
    if (!info?.bestVersion) return;

    setMapData(prev => ({ ...prev, [mapId]: { ...prev[mapId], restoring: true } }));

    const backupObjs = info.bestVersion.objects;
    const backupNonParcels = backupObjs.filter(o => !PARCEL_TYPES.includes(o.type));

    // Merge: current server parcels + backup non-parcels
    // If backup has same or more parcels, use entire backup
    const backupParcels = backupObjs.filter(o => PARCEL_TYPES.includes(o.type));
    let merged;
    if (backupParcels.length >= info.serverObjs.length) {
      merged = backupObjs; // backup is a superset — restore entirely
    } else {
      // Keep server parcels, add backup's non-parcels
      merged = [...info.serverObjs, ...backupNonParcels];
    }

    try {
      await base44.entities.LandMap.update(mapId, {
        drawing_data: JSON.stringify(merged),
      });
      setMapData(prev => ({
        ...prev,
        [mapId]: { ...prev[mapId], restoring: false, restored: true, serverNonParcel: countNonParcels(merged) }
      }));
    } catch (err) {
      setMapData(prev => ({ ...prev, [mapId]: { ...prev[mapId], restoring: false } }));
      alert("Restore failed: " + (err.message || "unknown error"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">Backup Recovery</h2>
              <p className="text-[10px] text-slate-500">Restore lost objects from local browser backups</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-500">Scanning local backups…</p>
            </div>
          ) : (
            Object.entries(mapData).map(([mapId, info]) => {
              const bestTb = info.bestVersion ? typeBreakdown(info.bestVersion.objects) : {};
              const serverTb = typeBreakdown(info.serverObjs);
              const canRestore = info.bestVersion && !info.restored;

              return (
                <div key={mapId} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Map header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{info.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Moga: {info.moga_number} · ID: {mapId.slice(-8)}</p>
                    </div>
                    {info.restored ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Restored
                      </span>
                    ) : info.serverNonParcel > 0 ? (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {info.serverNonParcel} non-parcel objects on server
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3" /> Data loss detected
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Current server state */}
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1">Server (Current)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(serverTb).map(([type, count]) => (
                          <span key={type} className={`text-[10px] px-2 py-0.5 rounded font-medium ${PARCEL_TYPES.includes(type) ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                            {type}: {count}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Best backup found */}
                    {info.bestVersion ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] text-green-700 uppercase tracking-wide font-bold">Best Backup Found</p>
                          <span className="text-[9px] text-green-600 font-mono">{info.bestVersion.source} · {fmtTime(info.bestVersion.timestamp)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {Object.entries(bestTb).map(([type, count]) => (
                            <span key={type} className={`text-[10px] px-2 py-0.5 rounded font-medium ${PARCEL_TYPES.includes(type) ? "bg-amber-50 text-amber-700" : "bg-green-100 text-green-700"}`}>
                              {type}: {count}
                            </span>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRestore(mapId)}
                          disabled={!canRestore || info.restoring}
                          className="h-7 text-xs bg-green-600 hover:bg-green-500 text-white gap-1.5"
                        >
                          {info.restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          {info.restoring ? "Restoring…" : info.restored ? "Restored" : "Restore Non-Parcel Objects"}
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-400">No backup versions with non-parcel objects found in browser storage</p>
                      </div>
                    )}

                    {/* Other backup versions */}
                    {info.backups.length > 1 && (
                      <details className="text-[10px]">
                        <summary className="cursor-pointer text-slate-400 hover:text-slate-600">
                          All backup versions ({info.backups.length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {info.backups.map((b, i) => {
                            const tb = typeBreakdown(b.objects);
                            const np = countNonParcels(b.objects);
                            return (
                              <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-2 py-1">
                                <span className="text-slate-500 font-mono">{b.source} · {fmtTime(b.timestamp)}</span>
                                <span className={`font-bold ${np > 0 ? "text-green-600" : "text-slate-400"}`}>{b.objects.length} objs · {np} non-parcel</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Backups are stored locally in your browser. Recovery is only possible from this device.
          </p>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}