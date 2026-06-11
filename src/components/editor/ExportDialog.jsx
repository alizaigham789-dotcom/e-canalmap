import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Globe, Map, Table2 } from "lucide-react";
import { DrawingStateManager } from "@/lib/drawingEngine";

export default function ExportDialog({ open, onClose, mapData, objects }) {
  const exportGeoJSON = () => {
    const features = objects
      .filter(o => ["acre", "mustateel", "muraba"].includes(o.type))
      .map(o => ({
        type: "Feature",
        properties: {
          id: o.id,
          type: o.type,
          label: o.label || "",
          ownerName: o.ownerName || "",
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [o.x, o.y], [o.x + o.w, o.y],
            [o.x + o.w, o.y + o.h], [o.x, o.y + o.h], [o.x, o.y]
          ]]
        }
      }));

    const geojson = { type: "FeatureCollection", features };
    downloadJSON(geojson, `${mapData?.title || "map"}.geojson`);
  };

  const exportCSV = () => {
    const rows = [["id", "type", "x_ft", "y_ft", "width_ft", "height_ft", "label", "owner"]];
    for (const o of objects) {
      if (["acre", "mustateel", "muraba"].includes(o.type)) {
        rows.push([o.id, o.type, Math.round(o.x), Math.round(o.y), o.w, o.h, o.label || "", o.ownerName || ""]);
      }
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    downloadText(csv, `${mapData?.title || "map"}.csv`, "text/csv");
  };

  const exportKML = () => {
    let placemarks = "";
    for (const o of objects) {
      if (["acre", "mustateel", "muraba"].includes(o.type)) {
        const coords = [
          [o.x, o.y], [o.x + o.w, o.y],
          [o.x + o.w, o.y + o.h], [o.x, o.y + o.h], [o.x, o.y]
        ].map(c => `${c[0]},${c[1]},0`).join(" ");
        placemarks += `
  <Placemark>
    <name>${o.label || o.type}</name>
    <description>${o.ownerName || ""}</description>
    <Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>
  </Placemark>`;
      }
    }
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${mapData?.title || "map"}</name>${placemarks}</Document></kml>`;
    downloadText(kml, `${mapData?.title || "map"}.kml`, "application/vnd.google-earth.kml+xml");
  };

  const exportJSON = () => {
    downloadJSON({ map: mapData, objects }, `${mapData?.title || "map"}_raw.json`);
  };

  const EXPORTS = [
    { label: "GeoJSON", desc: "Standard GIS vector format", icon: Globe, color: "text-emerald-400", action: exportGeoJSON },
    { label: "KML", desc: "Google Earth compatible", icon: Map, color: "text-blue-400", action: exportKML },
    { label: "CSV", desc: "Spreadsheet / tabular data", icon: Table2, color: "text-amber-400", action: exportCSV },
    { label: "JSON", desc: "Raw drawing data backup", icon: FileText, color: "text-slate-400", action: exportJSON },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-white">Export Map</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {EXPORTS.map(({ label, desc, icon: Icon, color, action }) => (
            <button
              key={label}
              onClick={() => { action(); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <Download className="w-4 h-4 text-slate-600 ml-auto" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function downloadJSON(data, filename) {
  downloadText(JSON.stringify(data, null, 2), filename, "application/json");
}

function downloadText(text, filename, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}