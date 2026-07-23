/**
 * Premium pastel color palette generator for entities (Students, Groups, Programs).
 * Generates dynamic OKLCH values mapped to CSS variables for infinite, strictly non-colliding colors.
 */

// 3 layers of lightness: 0.88 (bright), 0.84 (mid), 0.80 (deep)
// 12 hues per layer, shifted to avoid vertical stacking
const OKLCH_LAYERS = [
  { l: 0.88, shift: 0 },
  { l: 0.84, shift: 15 },
  { l: 0.80, shift: 7.5 }
];

export const OKLCH_PALETTE = [];
for (const layer of OKLCH_LAYERS) {
  for (let i = 0; i < 12; i++) {
    OKLCH_PALETTE.push({
      l: layer.l,
      h: (i * 30 + layer.shift) % 360
    });
  }
} // 36 perfect colors

/**
 * Checks if two OKLCH colors are mathematically identical.
 */
function isSameColor(c1, c2) {
  return c1 && c2 && Math.abs(c1.l - c2.l) < 0.001 && Math.abs(c1.h - c2.h) < 0.001;
}

/**
 * Returns a strictly globally distinct OKLCH color {l, h} that doesn't collide with any in `usedColors`.
 * Prioritizes the 36-color matrix using Coprime Stepping (11), then falls back to Golden Angle generation.
 * @param {Array<{l: number, h: number}>} usedColors 
 */
export function getNextDistinctColor(usedColors = []) {
  // 1. Try to find an unused color in the 36-color base matrix
  // Step 17 is coprime to 36, guaranteeing a full traversal with high visual contrast between neighbors
  for (let i = 0; i < OKLCH_PALETTE.length; i++) {
    const candidate = OKLCH_PALETTE[(i * 17) % OKLCH_PALETTE.length];
    
    const isUsed = usedColors.some(u => isSameColor(u, candidate));
    if (!isUsed) {
      return candidate;
    }
  }
  
  // 2. Fallback: Golden Angle generation if > 36 entities exist
  // We start from the last used hue (or 0) and add the golden angle until we find a unique pair.
  let lastH = 0;
  if (usedColors.length > 0) {
    lastH = usedColors[usedColors.length - 1].h;
  }

  // Iterate to find a mathematically unique (H, L) combo
  for (let i = 1; i <= 360; i++) {
    const candidateH = (lastH + i * 137.508) % 360;
    // Cycle through 3 lightness layers to maintain variety
    const candidateL = 0.86 - (i % 3) * 0.04; 
    
    const candidate = { l: candidateL, h: candidateH };
    const isUsed = usedColors.some(u => isSameColor(u, candidate));
    
    if (!isUsed) {
      return candidate;
    }
  }

  // Absolute safety fallback (should never mathematically happen with floats)
  return { l: 0.85, h: Math.floor(Math.random() * 360) };
}

export function getEntityColorClasses() {
  return {
    bg: "entity-bg",
    text: "entity-text",
    border: "entity-border",
    lightBg: "entity-light-bg",
    ring: "entity-ring"
  };
}

/**
 * Returns CSS variables for the given entity.
 */
export function getEntityStyle(entityOrString) {
  if (!entityOrString) return { '--card-h': '0', '--card-l': '0.88' };
  
  if (typeof entityOrString === 'object' && entityOrString.colorOklch) {
    return {
      '--card-h': entityOrString.colorOklch.h,
      '--card-l': entityOrString.colorOklch.l
    };
  }

  // Fallback string hashing for preview/temp states
  const str = typeof entityOrString === 'string' ? entityOrString : entityOrString.name || "";
  if (!str) return { '--card-h': '0', '--card-l': '0.88' };
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const l = 0.88 - (Math.abs(hash) % 3) * 0.04;
  return {
    '--card-h': h,
    '--card-l': l
  };
}
