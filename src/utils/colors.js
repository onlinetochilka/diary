/**
 * Premium pastel color palette for entities (Students, Groups).
 * Provides consistent coloring based on an entity's ID or Name.
 */

const palettes = [
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200", lightBg: "bg-indigo-50", hex: "#4f46e5", ring: "ring-indigo-100" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", lightBg: "bg-rose-50", hex: "#e11d48", ring: "ring-rose-100" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", lightBg: "bg-emerald-50", hex: "#10b981", ring: "ring-emerald-100" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", lightBg: "bg-amber-50", hex: "#d97706", ring: "ring-amber-100" },
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200", lightBg: "bg-sky-50", hex: "#0ea5e9", ring: "ring-sky-100" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200", lightBg: "bg-fuchsia-50", hex: "#c026d3", ring: "ring-fuchsia-100" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200", lightBg: "bg-teal-50", hex: "#0d9488", ring: "ring-teal-100" },
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", lightBg: "bg-violet-50", hex: "#7c3aed", ring: "ring-violet-100" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", lightBg: "bg-orange-50", hex: "#ea580c", ring: "ring-orange-100" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200", lightBg: "bg-cyan-50", hex: "#0891b2", ring: "ring-cyan-100" },
];

/**
 * Returns a consistent color palette object based on a string (ID or Name).
 * We use a better hash function to ensure even distribution across 10 colors.
 * @param {string} str - The identifier string.
 * @returns {Object} The color palette object.
 */
export function getEntityColor(str) {
  if (!str) return palettes[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}
