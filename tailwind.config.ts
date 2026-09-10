import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#0E1A14",
        sage: "#EEF2E9",
        lime: "#A8E063",
        deep: "#1F4D3A",
        clay: "#D8672B",
        ink: "#14201A",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-sora)", "sans-serif"],
      },
      borderRadius: {
        blob: "62% 38% 55% 45% / 45% 55% 45% 55%",
      },
      keyframes: {
        scanline: {
          "0%, 100%": { transform: "translateY(-46%)" },
          "50%": { transform: "translateY(46%)" },
        },
        sheetUp: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "100%": { transform: "scale(1.25)", opacity: "0" },
        },
      },
      animation: {
        scanline: "scanline 2.6s ease-in-out infinite",
        sheetUp: "sheetUp 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        pulseRing: "pulseRing 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
