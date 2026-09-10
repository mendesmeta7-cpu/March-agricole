import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f8f4",
          100: "#e1efe6",
          200: "#c4decb",
          300: "#9ec5aa",
          400: "#74a784",
          500: "#4f8961",
          600: "#3b6d4b",
          700: "#2f563d",
          800: "#284532",
          900: "#22392b",
          950: "#0f1f16",
        },
        earth: {
          50: "#faf6f0",
          100: "#f3ebde",
          200: "#e6d5bd",
          300: "#d6bc95",
          400: "#c59f6d",
          500: "#b5874f",
          600: "#9e6f40",
          700: "#7e5435",
          800: "#674530",
          900: "#553a2b",
          950: "#2f1e16",
        },
      },
    },
  },
  plugins: [],
};
export default config;
