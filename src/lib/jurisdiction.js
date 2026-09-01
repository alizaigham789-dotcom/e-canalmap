// Jurisdiction hierarchy for Khushab Canal Division — Thal/Mianwali Circle
// Source: Taksim-e-Jadeed Halqa Bandi, Lo Division Khushab (Sub-Division Qaidabad)

export const DIVISIONS = ["Khushab"];

export const SUBDIVISIONS = {
  Khushab: ["Jauharabad", "Qaidabad"],
};

// Sections per sub-division (from official document)
export const SECTIONS = {
  Jauharabad: ["Mithatiwana", "Khushab Town"],
  Qaidabad: ["Khushab (Zilladari)", "Mushtar Twana", "Sanjyal", "Admi Sargal"],
};

// Mouzas per section (from Thal Circle PDF)
export const SECTION_MOUZAS = {
  // Jauharabad sub-division
  "Mithatiwana": ["Mithatiwana", "Khushab"],
  "Khushab Town": ["Khushab", "Khanpur"],

  // Qaidabad sub-division — Khushab Zilladari Section (Page 1)
  "Khushab (Zilladari)": [
    "خوشاب", "منڈل", "تاڑی جٹلی", "ذماک", "قی", "ڈُمل", "ڈُمل نمبر 1", "ڈُمل نمبر 2",
  ],

  // Qaidabad — Mushtar Twana Section (Page 2)
  "Mushtar Twana": [
    "مشتر توانہ", "حسن پر توانہ", "پٹیال جٹلی", "یار", "اوکل سوبہ", "مجازاے رائیٹ",
    "مشتر توانہ نمبر 2", "مشتر توانہ نمبر 3",
  ],

  // Qaidabad — Sanjyal Section (Page 3)
  "Sanjyal": [
    "سنجیال", "اوکل سوبہ", "مشتر توانہ", "رودہ", "رودہ نمبر 1", "8/MB", "آڑمی کٹ",
  ],

  // Qaidabad — Admi Sargal / Waans Section (Page 4)
  "Admi Sargal": [
    "التزام", "آڑمی سرگل", "بندیال", "شادیہ شال", "شادیہ جٹلی", "واں",
    "مظفر شال", "بندیال نمبر 1", "مجازاے لیفٹ", "واں نمبر 1",
  ],
};

export function sectionsFor(subdivision) {
  return SECTIONS[subdivision] || [];
}

export function mouzasFor(section) {
  return SECTION_MOUZAS[section] || [];
}