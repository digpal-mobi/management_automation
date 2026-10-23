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
        // Approved Brand Colors
        brand: {
          deep: "#003049",      // Deep Space Blue
          steel: "#669BBC",     // Steel Blue
          flag: "#C1121F",      // Flag Red
          lava: "#780000",      // Molten Lava
          papaya: "#FDF0D5",    // Papaya Whip
        },
        // Supporting Neutrals & Semantic Tokens
        background: "#F7F8FA",  // Main page background
        foreground: "#17212B",  // Primary text
        surface: {
          DEFAULT: "#FFFFFF",   // Primary surface
          muted: "#F1F4F7",     // Muted surface
          subtle: "#E2E8F0",    // Divider / subtle border
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#17212B",
          muted: "#F1F4F7",
          border: "#E2E8F0",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#17212B",
        },
        primary: {
          DEFAULT: "#003049",   // Deep Space Blue
          foreground: "#FFFFFF",
          hover: "#002437",
          subtle: "#E6EEF3",
        },
        secondary: {
          DEFAULT: "#669BBC",   // Steel Blue
          foreground: "#FFFFFF",
          hover: "#5385A3",
          subtle: "#EFF5F9",
        },
        muted: {
          DEFAULT: "#F1F4F7",
          foreground: "#526174",
        },
        accent: {
          DEFAULT: "#669BBC",
          foreground: "#FFFFFF",
          hover: "#5385A3",
        },
        destructive: {
          DEFAULT: "#C1121F",   // Flag Red
          foreground: "#FFFFFF",
          hover: "#9E0E19",
          subtle: "#FDF2F2",
        },
        lava: {
          DEFAULT: "#780000",   // Molten Lava
          foreground: "#FFFFFF",
        },
        papaya: {
          DEFAULT: "#FDF0D5",   // Papaya Whip
          foreground: "#17212B",
          border: "#F7DFAB",
        },
        success: {
          DEFAULT: "#15803D",
          foreground: "#FFFFFF",
          subtle: "#F0FDF4",
          border: "#BBF7D0",
        },
        warning: {
          DEFAULT: "#B45309",
          foreground: "#FFFFFF",
          subtle: "#FFFBEB",
          border: "#FDE68A",
        },
        info: {
          DEFAULT: "#0284C7",
          foreground: "#FFFFFF",
          subtle: "#F0F9FF",
          border: "#BAE6FD",
        },
        border: "#E2E8F0",
        input: {
          DEFAULT: "#FFFFFF",
          border: "#E2E8F0",
          focus: "#003049",
        },
        ring: "#003049",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 48, 73, 0.05), 0 1px 2px -1px rgba(0, 48, 73, 0.05)",
        "card-hover": "0 4px 6px -1px rgba(0, 48, 73, 0.08), 0 2px 4px -2px rgba(0, 48, 73, 0.06)",
        dropdown: "0 10px 15px -3px rgba(0, 48, 73, 0.08), 0 4px 6px -4px rgba(0, 48, 73, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
