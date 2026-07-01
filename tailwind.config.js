/** @type {import('tailwindcss').Config} */
export default {
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
        // Section accent palette
        finance:  { DEFAULT: "#10b981", light: "#d1fae5", ring: "#6ee7b7" }, // emerald
        schedule: { DEFAULT: "#6366f1", light: "#e0e7ff", ring: "#a5b4fc" }, // indigo
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
        float:  "0 4px 6px -1px rgb(0 0 0 / .06), 0 10px 24px -4px rgb(0 0 0 / .08)",
        card:   "0 1px 2px rgb(0 0 0 / .04), 0 4px 12px -2px rgb(0 0 0 / .06)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / .08), 0 12px 28px -4px rgb(0 0 0 / .10)",
        sidebar: "2px 0 8px rgb(0 0 0 / .05)",
      },
      backdropBlur: {
        xs: "4px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in":  "fade-in 0.2s cubic-bezier(0.165, 0.84, 0.44, 1) both",
        "scale-in": "scale-in 0.15s cubic-bezier(0.165, 0.84, 0.44, 1) both",
        spin: "spin 0.8s linear infinite",
      },
    },
  },
  plugins: [],
};
