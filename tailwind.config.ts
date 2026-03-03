import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#f54a00",
        accent: "#ff9f2e",
        cool: "#1fb6ff",
        ink: "#121629",
        mint: "#10b981",
        cream: "#fff7ef",
        haze: "#eef3ff",
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
        card: "0 24px 50px -30px rgba(18, 22, 41, 0.45)",
        glow: "0 20px 60px -28px rgba(245, 74, 0, 0.5)",
        soft: "0 16px 38px -22px rgba(17, 20, 38, 0.32)",
      },
    },
  },
  plugins: [],
};

export default config;
