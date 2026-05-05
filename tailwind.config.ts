import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#a33900",
        accent: "#ffb599",
        cool: "#545c72",
        ink: "#1a1c1c",
        mint: "#10b981",
        cream: "#f9f9f8",
        haze: "#f3f4f3",
        surface: "#f9f9f8",
        "surface-lowest": "#ffffff",
        "surface-low": "#f3f4f3",
        "surface-container": "#eeeeed",
        "surface-high": "#e8e8e7",
        "surface-highest": "#e2e2e2",
        "surface-variant": "#e2e2e2",
        outline: "#8e7166",
        "outline-variant": "#e2bfb2",
        "on-surface": "#1a1c1c",
        "on-surface-variant": "#5a4138",
        "on-primary": "#ffffff",
        "primary-fixed": "#ffdbce",
        "primary-container": "#cc4900",
        "on-secondary-fixed": "#181445",
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
        ambient: "0 4px 20px rgba(30, 27, 75, 0.05)",
        card: "0 8px 30px rgba(30, 27, 75, 0.1)",
        glow: "0 0 20px rgba(163, 57, 0, 0.22)",
        soft: "0 4px 20px rgba(30, 27, 75, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
