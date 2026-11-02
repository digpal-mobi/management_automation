import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        navigation: "var(--color-navigation)",
        nav: "var(--color-navigation)",
        column: "var(--color-surface)",
        surface: {
          DEFAULT: "var(--color-surface)",
          muted: "var(--color-elevated)",
          subtle: "var(--color-divider)",
        },
        elevated: "var(--color-elevated)",
        hover: "var(--color-hover)",
        divider: "var(--color-divider)",
        "border-subtle": "var(--color-divider)",

        background: "var(--color-canvas)",
        foreground: "var(--color-text-primary)",

        card: {
          DEFAULT: "var(--color-elevated)",
          foreground: "var(--color-text-primary)",
          muted: "var(--color-surface)",
          border: "var(--color-border)",
        },
        popover: {
          DEFAULT: "var(--color-elevated)",
          foreground: "var(--color-text-primary)",
        },

        primary: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-canvas)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
        },
        secondary: {
          DEFAULT: "var(--color-elevated)",
          foreground: "var(--color-text-primary)",
          hover: "var(--color-hover)",
          subtle: "var(--color-accent-subtle)",
        },
        muted: {
          DEFAULT: "var(--color-elevated)",
          foreground: "var(--color-text-secondary)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-canvas)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
        },
        destructive: {
          DEFAULT: "var(--color-danger)",
          foreground: "var(--color-canvas)",
          hover: "#c96f75",
          subtle: "var(--color-danger-subtle)",
        },

        success: {
          DEFAULT: "var(--color-success)",
          foreground: "var(--color-canvas)",
          subtle: "var(--color-success-subtle)",
          border: "rgba(93, 186, 157, 0.35)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          foreground: "var(--color-canvas)",
          subtle: "var(--color-warning-subtle)",
          border: "rgba(216, 179, 106, 0.35)",
        },
        info: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-canvas)",
          subtle: "var(--color-accent-subtle)",
          border: "rgba(136, 169, 255, 0.35)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          foreground: "var(--color-canvas)",
          subtle: "var(--color-danger-subtle)",
          border: "rgba(217, 130, 135, 0.35)",
        },

        border: "var(--color-border)",
        input: {
          DEFAULT: "var(--color-elevated)",
          border: "var(--color-border)",
          focus: "var(--color-accent)",
        },
        ring: "var(--color-accent)",

        // Typography helpers (use as text-tp / text-ts / text-tm)
        tp: "var(--color-text-primary)",
        ts: "var(--color-text-secondary)",
        tm: "var(--color-text-muted)",

        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
          6: "var(--chart-6)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        lg: "var(--radius-modal)",
        md: "var(--radius-card)",
        sm: "var(--radius-button)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        modal: "var(--radius-modal)",
      },
      height: {
        control: "var(--control-height)",
        "control-sm": "var(--control-height-compact)",
      },
      minHeight: {
        control: "var(--control-height)",
        "control-sm": "var(--control-height-compact)",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0, 0, 0, 0.35)",
        "card-hover": "0 4px 12px -2px rgba(0, 0, 0, 0.45)",
        dropdown: "0 12px 28px -8px rgba(0, 0, 0, 0.55)",
        modal: "0 24px 48px -12px rgba(0, 0, 0, 0.65)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
