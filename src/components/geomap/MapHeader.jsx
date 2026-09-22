import React from "react";
import { ArrowLeft, ChevronDown, Bell } from "lucide-react";

export default function MapHeader({
  districts,
  tehsils,
  villages,
  district,
  tehsil,
  village,
  onSelect,
  onMenu,
  mogas,
  selectedMoga,
  onSelectMoga,
  murabas,
  selectedMuraba,
  onSelectMuraba,
  rajbahs,
  rajbah,
  viewMode,
  showMogaSelect = true,
}) {
  const Select = ({ placeholder, value, options, field, onChange }) => (
    <div className="relative shrink-0">
      <select
        value={value || ""}
        onChange={(e) => (onChange ? onChange(e.target.value) : onSelect(field, e.target.value))}
        className="appearance-none bg-white/10 text-white text-xs font-medium pl-2.5 pr-7 h-8 rounded-md border border-white/15 cursor-pointer hover:bg-white/15 transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 max-w-[110px] truncate"
      >
        <option value="" className="text-slate-700">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-slate-700">{o}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-white/60 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] bg-[#1B2A3A] px-3 h-12 flex items-center gap-2 shadow-lg">
      <button onClick={onMenu} title="Back" className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-md transition-colors shrink-0">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
        <Select placeholder="District" value={district} options={districts} field="district" />
        <Select placeholder="Tehsil" value={tehsil} options={tehsils} field="tehsil" />
        <Select placeholder="Mouza" value={village} options={villages} field="village" />
        <Select placeholder="Rajbah" value={rajbah} options={rajbahs || []} field="rajbah" />
        {showMogaSelect && <Select placeholder="Moga" value={selectedMoga} options={mogas || []} onChange={onSelectMoga} />}
        {viewMode === "view" && <Select placeholder="Select Muraba" value={selectedMuraba} options={murabas || []} onChange={onSelectMuraba} />}
      </div>
      <div className="relative shrink-0">
        <button className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-md transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </div>
    </div>
  );
}