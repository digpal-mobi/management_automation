import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#FFFFFF",
        mono: {
          bg: "#000000",
          surface: "#0A0A0A",
          elevated: "#141414",
          border: "#2A2A2A",
          strong: "#404040",
          text: "#FFFFFF",
          muted: "#A3A3A3",
          subtle: "#525252",
          white: "#FFFFFF",
          light: "#F5F5F5",
        },
        card: {
          DEFAULT: "#0A0A0A",
          foreground: "#FFFFFF",
          muted: "#141414",
        },
        popover: {
          DEFAULT: "#141414",
          foreground: "#FFFFFF",
        },
        primary: {
          DEFAULT: "#FFFFFF",
          foreground: "#000000",
          hover: "#E5E5E5",
        },
        secondary: {
          DEFAULT: "#141414",
          foreground: "#A3A3A3",
        },
        muted: {
          DEFAULT: "#141414",
          foreground: "#A3A3A3",
        },
        accent: {
          DEFAULT: "#2A2A2A",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#2A2A2A",
          foreground: "#FFFFFF",
        },
        border: "#2A2A2A",
        input: "#141414",
        ring: "#FFFFFF",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
