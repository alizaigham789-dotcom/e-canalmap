// Jurisdiction hierarchy for Khushab Canal Division — Thal/Mianwali Circle
// Source: Taksim-e-Jadeed Halqa Bandi, Lo Division Khushab (Sub-Division Qaidabad)

export const DIVISIONS = ["Khushab"];

export const SUBDIVISIONS = {
  Khushab: ["Jauharabad", "Qaidabad"],
};

// Sections per sub-division (from official document)
export const SECTIONS = {
  Jauharabad: ["Mithatiwana", "Khushab Town"],
  Qaidabad: ["Khushab", "Gunjial", "Mithatiwana", "Wan"],
};

// Mouzas per (subdivision + section) — keyed by `subdivision::section` to keep
// section names unique only within their subdivision (e.g. Mithatiwana exists
// in both Jauharabad and Qaidabad but has different mouzas).
// Jauharabad sections: mouza names to be provided later.
// Qaidabad sections: Halqa Patwar mouza lists per official document.
export const SECTION_MOUZAS = {
  // Jauharabad sub-division (mouzas to be filled later)
  "Jauharabad::Mithatiwana": [],
  "Jauharabad::Khushab Town": [],

  // Qaidabad — Khushab Zilladari Section
  "Qaidabad::Khushab": [
    "خوشاب", "سندرال", "ناڑی جنوبی", "ڈھاک", "نلی", "ہڈالی", "64/MB",
    "ہڈالی نمبر 1", "ہڈالی نمبر 2",
  ],

  // Qaidabad — Gunjial Section (formerly Sanjyal)
  "Qaidabad::Gunjial": [
    "5/TDA", "4/TDA", "26/MB", "8/MB", "گنجیال", "آدھی کوٹ", "روڈہ",
    "روڈہ نمبر 1", "اوکھلی موہلہ جنوبی",
  ],

  // Qaidabad — Mithatiwana Section (formerly Mushtar Twana)
  "Qaidabad::Mithatiwana": [
    "48/MB", "حسن پور ٹوانہ", "بوتالہ جنوبی", "مٹھہ ٹوانہ", "مٹھہ ٹوانہ نمبر 1",
    "بجار", "اوکھلی موہلہ جنوبی", "مہاڑاے رائیٹ", "مٹھہ ٹوانہ نمبر 2",
    "مٹھہ ٹوانہ نمبر 3",
  ],

  // Qaidabad — Wan Section (formerly Admi Sargal)
  "Qaidabad::Wan": [
    "اتراء", "آدھی سرگل", "بندیال", "شادیہ جنوبی", "شادیہ شمالی", "واں",
    "مظفر پور", "بندیال نمبر 1", "مہاڑاے لفٹ", "مہاڑاے لفٹ نمبر 1",
  ],
};

export function sectionsFor(subdivision) {
  return SECTIONS[subdivision] || [];
}

export function mouzasFor(subdivision, section) {
  return SECTION_MOUZAS[`${subdivision}::${section}`] || [];
}

// Reverse lookup: given a mouza name, find which subdivision + section it
// belongs to. Returns { subdivision, section } or null if not found.
export function findMouza(mouza) {
  for (const key of Object.keys(SECTION_MOUZAS)) {
    const list = SECTION_MOUZAS[key];
    if (list && list.includes(mouza)) {
      const [subdivision, section] = key.split("::");
      return { subdivision, section };
    }
  }
  return null;
}

// All mouza names across every subdivision/section — used for a single
// top-level mouza picker that auto-fills the rest of the jurisdiction.
export function allMouzas() {
  const out = [];
  for (const key of Object.keys(SECTION_MOUZAS)) {
    const [subdivision, section] = key.split("::");
    for (const m of SECTION_MOUZAS[key] || []) {
      out.push({ mouza: m, subdivision, section });
    }
  }
  return out;
}