import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#07070b", 900: "#0b0b12", 850: "#101018", 800: "#14141e", 700: "#1c1c29" },
        forge: { 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
      },
      fontFamily: { sans: ["var(--font-geist)", "system-ui", "sans-serif"] },
      boxShadow: { glow: "0 0 60px -20px rgba(139,92,246,.55)" },
      animation: { "fade-up": "fadeUp .5s ease both", shimmer: "shimmer 2s linear infinite" },
      keyframes: {
        fadeUp: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
    },
  },
  plugins: [],
};
export default config;
