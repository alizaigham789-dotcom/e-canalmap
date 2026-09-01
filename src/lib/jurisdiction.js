// Jurisdiction hierarchy for Khushab Canal Division.
// Khushab Division → 2 Sub Divisions (Jauharabad, Qaidabad) → 2 Sections each → Mouzas (free text).

export const DIVISIONS = ["Khushab"];

export const SUBDIVISIONS = {
  Khushab: ["Jauharabad", "Qaidabad"],
};

export const SECTIONS = {
  Jauharabad: ["Mithatiwana", "Khushab"],
  Qaidabad: ["Gunjial", "Adhisargal Wan"],
};

export function sectionsFor(subdivision) {
  return SECTIONS[subdivision] || [];
}