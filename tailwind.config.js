/** @type {import('tailwindcss').Config} */
export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "rgb(var(--ivory) / <alpha-value>)",
          50:  "rgb(var(--ivory) / <alpha-value>)",
          100: "rgb(var(--ivory) / <alpha-value>)",
          200: "rgb(var(--stone-100) / <alpha-value>)",
          300: "rgb(var(--stone-200) / <alpha-value>)",
        },
        stone: {
          50: "rgb(var(--stone-50) / <alpha-value>)",
          100: "rgb(var(--stone-100) / <alpha-value>)",
          200: "rgb(var(--stone-200) / <alpha-value>)",
          300: "rgb(var(--stone-300) / <alpha-value>)",
          400: "rgb(var(--stone-400) / <alpha-value>)",
          500: "rgb(var(--stone-500) / <alpha-value>)",
          600: "rgb(var(--stone-600) / <alpha-value>)",
          700: "rgb(var(--stone-700) / <alpha-value>)",
          800: "rgb(var(--stone-800) / <alpha-value>)",
          900: "rgb(var(--stone-900) / <alpha-value>)",
        },
        indigo: {
          500: "rgb(var(--indigo-500) / <alpha-value>)",
          600: "rgb(var(--indigo-600) / <alpha-value>)",
          700: "rgb(var(--indigo-700) / <alpha-value>)",
        },
        // Brand colors from timer
        brand: {
          burgundy: "#B71234",
          blue: "#006584",
        },
        // Academic blue for CommunityNewsCard headings & Telegram icon
        academic: {
          blue: "#1B4F72",
          "blue-light": "#2874A6",
        },
        // Section accent palette
        finance:  { DEFAULT: "#10b981", light: "#d1fae5", ring: "#6ee7b7" }, // emerald
        schedule: { DEFAULT: "#006584", light: "#e0e7ff", ring: "#a5b4fc" }, // brand teal
        students: { DEFAULT: "#8b5cf6", light: "#ede9fe", ring: "#c4b5fd" }, // violet
        settings: { DEFAULT: "#78716c", light: "#f5f5f4", ring: "#d6d3d1" }, // stone
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.165, 0.84, 0.44, 1)",
      },
      boxShadow: {
        // Neumorphism shadows mapping
        "neu-sm": "4px 4px 10px var(--shadow-dark-color), -4px -4px 10px var(--shadow-light-color)",
        "neu-sm-inset": "inset 3px 3px 8px var(--shadow-dark-color), inset -3px -3px 8px var(--shadow-light-color)",
        "neu-md": "6px 6px 16px var(--shadow-dark-color), -6px -6px 16px var(--shadow-light-color)",
        "neu-md-inset": "inset 5px 5px 12px var(--shadow-dark-color), inset -5px -5px 12px var(--shadow-light-color)",
        "neu-lg": "14px 14px 36px var(--shadow-dark-color), -14px -14px 36px var(--shadow-light-color)",
        "neu-lg-inset": "inset 10px 10px 24px var(--shadow-dark-color), inset -10px -10px 24px var(--shadow-light-color)",
        "neu-xl": "20px 20px 60px var(--shadow-dark-color), -20px -20px 60px var(--shadow-light-color)",
        "neu-focus": "0 0 0 2px #006584", // using brand-blue for focus glow
        "neu-focus-burgundy": "0 0 0 2px #B71234",
        "sidebar": "2px 0 8px rgb(var(--shadow-dark) / 0.5)",
      },
      backdropBlur: {
        xs: "4px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "none" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "none" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        "skeleton-pulse": {
          "0%, 100%": { opacity: "0.35" },
          "50%":      { opacity: "0.8" },
        },
        "card-float-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.99)" },
          to:   { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "fade-in":       "fade-in 0.2s cubic-bezier(0.165, 0.84, 0.44, 1) both",
        "scale-in":      "scale-in 0.15s cubic-bezier(0.165, 0.84, 0.44, 1) both",
        spin:            "spin 0.8s linear infinite",
        "skeleton-pulse": "skeleton-pulse 1.6s ease-in-out infinite",
        "card-float-in": "card-float-in 0.3s cubic-bezier(0.25, 1, 0.5, 1) both",
      },
    },
  },
  plugins: [],
};
