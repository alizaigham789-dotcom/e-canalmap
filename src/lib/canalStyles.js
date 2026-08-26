// ============================================================
// CANAL STYLES & SHAPES — shared visual config
// Style/Shape change ONLY the visual appearance. Canal width, points,
// geometry, editing, saving and exports stay exactly as before.
// Used by GISRenderer (editor canvas) and PrintPreview (print/SVG).
// ============================================================

// 10 professional canal styles — the original 2 (Flat, 3D Ribbon) plus 8 more.
// `water` = channel fill, `bank` = side bank colour, `grass` = outer grass edge
// (earth style only). `defaultShape` folds a shape into each style so one click
// in the properties grid changes both style AND shape together.
export const CANAL_STYLES = [
  { key: "classic",         label: "Flat",            water: "#29A9E8", bank: "#1688C7", defaultShape: "curved" },
  { key: "3d",              label: "3D Ribbon",       water: "#29A9E8", bank: "#1688C7", defaultShape: "curved" },
  { key: "concrete",        label: "Concrete",        water: "#29A9E8", bank: "#9aa7b4", concrete: "#7d8a99", defaultShape: "straight" },
  { key: "earth",           label: "Earth",           water: "#29A9E8", bank: "#795548", grass: "#4caf50", defaultShape: "curved" },
  { key: "water",           label: "Water",           water: "#2196f3", bank: "#1976d2", defaultShape: "curved" },
  { key: "3dwater",         label: "3D Water",         water: "#2196f3", bank: "#1976d2", defaultShape: "curved" },
  { key: "green",           label: "Green",           water: "#29A9E8", bank: "#2e7d32", defaultShape: "curved" },
  { key: "engineeringBlue", label: "Engineering Blue", water: "#00aaff", bank: "#00aaff", defaultShape: "straight" },
  { key: "dashed",          label: "Dashed",          water: "#29A9E8", bank: "#1688C7", defaultShape: "straight" },
  { key: "custom",          label: "Custom",          water: "#29A9E8", bank: "#1688C7", defaultShape: "curved" },
];

// The shape folded into a given style key (used by the properties grid so one
// click sets both canalStyle and canalShape together).
export function canalDefaultShape(styleKey) {
  const s = STYLE_MAP[normalizeCanalStyle(styleKey)];
  return s?.defaultShape || "curved";
}

const STYLE_MAP = Object.fromEntries(CANAL_STYLES.map(s => [s.key, s]));

// Normalize legacy values: "flat" -> "classic", "3d" -> "3d"
export function normalizeCanalStyle(style) {
  if (!style || style === "flat") return "classic";
  if (style === "3d") return "3d";
  return STYLE_MAP[style] ? style : "classic";
}

export function canalStyleOf(obj) {
  return STYLE_MAP[normalizeCanalStyle(obj.canalStyle)] || STYLE_MAP.classic;
}

export function canalWaterColor(obj) {
  const s = canalStyleOf(obj);
  if (s.key === "custom" && obj.canalCustomColor) return obj.canalCustomColor;
  return s.water;
}

export function canalBankColor(obj) {
  const s = canalStyleOf(obj);
  if (s.key === "custom" && obj.canalCustomColor) return obj.canalCustomColor;
  return s.bank;
}

// 10 canal shapes — controls path smoothing + end-cap termination.
// `smooth` = use curved interpolation (false = straight segments).
// `cap` = end-cap style: square | bevel | round | arrow | open
// `cap`: square (perpendicular end line) | bevel | round | arrow | open (no end line).
// Default "curved" uses cap "open" so existing flat canals keep their original look
// (water fill closes the end; no extra bank line across the end).
export const CANAL_SHAPES = [
  { key: "straight",  label: "Straight",  smooth: false, cap: "open" },
  { key: "curved",    label: "Curved",    smooth: true,  cap: "open" },
  { key: "scurve",    label: "S-Curve",   smooth: true,  cap: "open" },
  { key: "angled",    label: "Angled",    smooth: false, cap: "open" },
  { key: "zigzag",    label: "Zigzag",    smooth: false, cap: "open" },
  { key: "vshape",    label: "V-Shape",   smooth: true,  cap: "bevel" },
  { key: "ushape",    label: "U-Shape",   smooth: true,  cap: "round" },
  { key: "trapezoid", label: "Trapezoid", smooth: true,  cap: "open" },
  { key: "square",    label: "Square",    smooth: true,  cap: "square" },
  { key: "rounded",   label: "Rounded",   smooth: true,  cap: "round" },
];

const SHAPE_MAP = Object.fromEntries(CANAL_SHAPES.map(s => [s.key, s]));

export function canalShapeOf(obj) {
  return SHAPE_MAP[obj.canalShape] || SHAPE_MAP.curved;
}

// Side boundary defaults — 0 width means no band on that side
export const SIDE_BOUNDARY_DEFAULTS = {
  enabled: false,
  leftWidth: 5,
  rightWidth: 5,
  color: "#c9a86a",      // earthy tan — clearly distinct from the blue canal
  edgeColor: "#8a6d3b",
};

export function sideBoundaryOf(obj) {
  return {
    enabled: !!obj.sideBoundary,
    leftWidth: Math.max(0, obj.leftBoundaryWidth || 0),
    rightWidth: Math.max(0, obj.rightBoundaryWidth || 0),
    color: obj.boundaryColor || SIDE_BOUNDARY_DEFAULTS.color,
    edgeColor: obj.boundaryEdgeColor || SIDE_BOUNDARY_DEFAULTS.edgeColor,
  };
}