import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F3EDE0",
        forest: "#2D4A1F",
        "warm-gray": "#E8E0CE",
        amber: "#C9A84C",
      },
      fontFamily: {
        sans: ["var(--font-ui)"],
        ui: ["var(--font-ui)"],
        ja: ["var(--font-ja)"],
        brand: ["var(--font-brand)"],
        serif: ["var(--font-brand)"],
      },
    },
  },
  plugins: [],
};
export default config;
