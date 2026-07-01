// Script to generate CSS variables for themes
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

const themes = {
  light: {
    name: "tochilka",
    ivory: "#faf8f5",
    stone: ["#fafaf9", "#f5f5f4", "#e7e5e4", "#d6d3d1", "#a8a29e", "#78716c", "#57534e", "#44403c", "#292524", "#1c1917"], // 50 to 900
    indigo: ["#6366f1", "#4f46e5", "#4338ca"], // 500, 600, 700
  },
  dark: {
    name: "dark",
    ivory: "#121212",
    stone: ["#1c1917", "#292524", "#44403c", "#57534e", "#78716c", "#a8a29e", "#d6d3d1", "#e7e5e4", "#f5f5f4", "#fafaf9"],
    indigo: ["#818cf8", "#6366f1", "#4f46e5"],
  },
  girly: {
    name: "girly",
    ivory: "#fff1f2",
    stone: ["#ffe4e6", "#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239", "#881337", "#4c0519"], // rose palette
    indigo: ["#f472b6", "#db2777", "#be185d"], // pink primary
  },
  academic: {
    name: "academic",
    ivory: "#f8fafc",
    stone: ["#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b", "#0f172a", "#020617"], // slate palette
    indigo: ["#2563eb", "#1d4ed8", "#1e40af"], // blue primary
  },
  coffee: {
    name: "coffee",
    ivory: "#fdf8f6",
    stone: ["#f5ebe0", "#e3d5ca", "#d5bdaf", "#c8b09b", "#b2967d", "#9a7b4f", "#805c38", "#6b4c2a", "#54381e", "#3d2613"], // custom brown
    indigo: ["#d97706", "#b45309", "#92400e"], // amber primary
  },
  cringe: {
    name: "cringe",
    ivory: "#000000",
    stone: ["#0a0a0a", "#1a1a1a", "#262626", "#404040", "#525252", "#737373", "#a3a3a3", "#d4d4d4", "#e5e5e5", "#39ff14"], // dark + neon green text
    indigo: ["#ff003c", "#ff003c", "#cc0030"], // neon red
  }
};

let css = "";
for (const [key, t] of Object.entries(themes)) {
  css += `\n[data-theme="${t.name}"] {\n`;
  css += `  --ivory: ${hexToRgb(t.ivory)};\n`;
  t.stone.forEach((hex, i) => {
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    css += `  --stone-${shades[i]}: ${hexToRgb(hex)};\n`;
  });
  css += `  --indigo-500: ${hexToRgb(t.indigo[0])};\n`;
  css += `  --indigo-600: ${hexToRgb(t.indigo[1])};\n`;
  css += `  --indigo-700: ${hexToRgb(t.indigo[2])};\n`;
  css += `}\n`;
}
console.log(css);
