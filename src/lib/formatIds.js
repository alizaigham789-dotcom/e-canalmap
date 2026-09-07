// CNIC format: XXXXX-XXXXXXX-X (5 digits - 7 digits - 1 digit = 13 digits + 2 dashes)
export const formatCnic = (v) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return d.slice(0, 5) + "-" + d.slice(5);
  return d.slice(0, 5) + "-" + d.slice(5, 12) + "-" + d.slice(12);
};

// Phone format: 03XX-XXXXXXX (03 fixed, 4 digits - dash - 7 digits = 11 digits + 1 dash)
export const formatPhone = (v) => {
  let d = (v || "").replace(/\D/g, "");
  if (!d) return "";
  // Force "03" prefix — it's fixed and counts as the first two digits
  if (d.length >= 2 && (d[0] !== "0" || d[1] !== "3")) {
    if (d[0] === "0") d = "03" + d.slice(1);
    else d = "03" + d;
  } else if (d.length === 1 && d[0] !== "0") {
    d = "03" + d;
  }
  d = d.slice(0, 11);
  if (d.length <= 4) return d;
  return d.slice(0, 4) + "-" + d.slice(4);
};