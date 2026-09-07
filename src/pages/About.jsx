import React from "react";
import { Link } from "react-router-dom";
import { Map as MapIcon, ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100">
      <header className="border-b border-white/10 bg-[#0f1923]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold tracking-wide">
            <MapIcon className="w-5 h-5 text-blue-400" />
            ChakLand GIS PRO
          </div>
          <Link to="/login" className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-5">
        <h1 className="text-3xl font-bold font-heading">About ChakLand GIS PRO</h1>
        <p className="text-slate-300 leading-relaxed">
          ChakLand GIS PRO (Canal E Record) is a precision cadastral mapping and land-records
          management platform built for irrigation and revenue departments. It digitizes survey
          records, manages canal and watercourse (khal) networks, and automates land-record workflows
          such as Form 1 registers, Parat Warabandi, Fard Masrooba, and Naqsha 27B.
        </p>
        <p className="text-slate-300 leading-relaxed">
          The system lets field officers draw Mustateel and Muraba parcels on a georeferenced
          satellite map, place mogas (outlets) at their true geographic positions, and generate
          print-ready cadastral maps with accurate area verification. It is designed for Patwaris,
          Zilladars, Canal Patwaris, and Deputy Collectors who need professional GIS accuracy without
          desktop GIS software.
        </p>
        <p className="text-slate-300 leading-relaxed">
          ChakLand GIS PRO is built and maintained by the Canal E Record team to bring transparency,
          speed, and reliability to land-record and irrigation administration. The platform combines a
          georeferenced map editor with automated registers and form generation, so the same data flows
          seamlessly from the field map to the official paper record.
        </p>
      </main>
      <footer className="border-t border-white/10 bg-[#0f1923]">
        <div className="max-w-3xl mx-auto px-6 h-12 flex items-center gap-4 text-sm text-slate-400">
          <Link to="/contact" className="hover:text-white">Contact</Link>
          <Link to="/login" className="hover:text-white">Log in</Link>
        </div>
      </footer>
    </div>
  );
}