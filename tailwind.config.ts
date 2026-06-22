import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0b1f3a",
        accent: "#2563eb",
        cool: "#475569",
        ink: "#0f172a",
        mint: "#10b981",
        cream: "#f8fafc",
        haze: "#f1f5f9",
        surface: "#f8fafc",
        "surface-lowest": "#ffffff",
        "surface-low": "#f1f5f9",
        "surface-container": "#e2e8f0",
        "surface-high": "#cbd5e1",
        "surface-highest": "#94a3b8",
        "surface-variant": "#cbd5e1",
        outline: "#64748b",
        "outline-variant": "#cbd5e1",
        "on-surface": "#0f172a",
        "on-surface-variant": "#475569",
        "on-primary": "#ffffff",
        "primary-fixed": "#dbeafe",
        "primary-container": "#123b66",
        "on-secondary-fixed": "#0f172a",
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "sans-serif"],
        display: [
          "var(--font-space-grotesk)",
          "var(--font-plus-jakarta)",
          "sans-serif",
        ],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      boxShadow: {
        ambient: "0 4px 18px rgba(15, 23, 42, 0.06)",
        card: "0 8px 26px rgba(15, 23, 42, 0.1)",
        glow: "0 0 20px rgba(11, 31, 58, 0.18)",
        soft: "0 4px 18px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
