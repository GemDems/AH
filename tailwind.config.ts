import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        // Conversion-optimized semantic colors (complementary blue/orange pair
        // plus supporting urgency/trust/premium accents) — registering these
        // here makes every Tailwind variant (text-, border-, from-/via-/to-,
        // opacity modifiers, hover:/group-hover: etc.) resolve correctly;
        // previously only bg-* worked via hand-written classes in index.css.
        // Each has -light/-dark steps for hover states and dark-bg tints.
        "conversion-blue": {
          DEFAULT: "var(--conversion-blue)",
          light: "var(--conversion-blue-light)",
          dark: "var(--conversion-blue-dark)",
        },
        "urgency-red": {
          DEFAULT: "var(--urgency-red)",
          light: "var(--urgency-red-light)",
          dark: "var(--urgency-red-dark)",
        },
        "action-orange": {
          DEFAULT: "var(--action-orange)",
          light: "var(--action-orange-light)",
          dark: "var(--action-orange-dark)",
        },
        "trust-green": {
          DEFAULT: "var(--trust-green)",
          light: "var(--trust-green-light)",
          dark: "var(--trust-green-dark)",
        },
        "premium-gold": {
          DEFAULT: "var(--premium-gold)",
          light: "var(--premium-gold-light)",
          dark: "var(--premium-gold-dark)",
        },
        // ── L99 palette: override Tailwind's built-in shades so every
        // `text-blue-600`, `bg-green-500`, `from-orange-400`, etc. across ALL
        // components auto-resolves to the complementary-wheel palette without
        // touching each file individually. 50/100/200 light tints are kept for
        // white-card stat-badge backgrounds. 300-900 are vivid palette values.
        blue: {
          50: "#EEF3FF", 100: "#DDEAFF", 200: "#B8D2FF",
          300: "#5BA3FF", 400: "#5BA3FF",
          500: "#1A64FF", 600: "#1A64FF",
          700: "#0041C7", 800: "#0041C7", 900: "#002B8A",
        },
        indigo: {
          50: "#EEF1FF", 100: "#DDEAFF", 200: "#B8CBFF",
          300: "#5BA3FF", 400: "#5BA3FF",
          500: "#1A64FF", 600: "#1A64FF",
          700: "#0041C7", 800: "#0041C7", 900: "#002B8A",
        },
        green: {
          50: "#EDFFF4", 100: "#D4FFE5", 200: "#A3F7C4",
          300: "#00EB5E", 400: "#00EB5E",
          500: "#00B849", 600: "#00B849",
          700: "#008533", 800: "#008533", 900: "#005522",
        },
        emerald: {
          50: "#EDFFF4", 100: "#D4FFE5", 200: "#A3F7C4",
          300: "#00EB5E", 400: "#00EB5E",
          500: "#00B849", 600: "#00B849",
          700: "#008533", 800: "#008533", 900: "#005522",
        },
        orange: {
          50: "#FFF3EC", 100: "#FFE4D0", 200: "#FFC9A3",
          300: "#FF7E33", 400: "#FF7E33",
          500: "#FF5E00", 600: "#FF5E00",
          700: "#CC3D00", 800: "#CC3D00", 900: "#8A2800",
        },
        red: {
          50: "#FFF0F2", 100: "#FFD9DD", 200: "#FFB3BB",
          300: "#FF3F56", 400: "#FF3F56",
          500: "#FF0422", 600: "#FF0422",
          700: "#C2001A", 800: "#C2001A", 900: "#8A0012",
        },
        yellow: {
          50: "#FFFBEB", 100: "#FFF4CC", 200: "#FFE99A",
          300: "#FFCE47", 400: "#FFCE47",
          500: "#FFB800", 600: "#FFB800",
          700: "#C28C00", 800: "#C28C00", 900: "#7A5800",
        },
        amber: {
          50: "#FFFBEB", 100: "#FFF4CC", 200: "#FFE99A",
          300: "#FFCE47", 400: "#FFCE47",
          500: "#FFB800", 600: "#FFB800",
          700: "#C28C00", 800: "#C28C00", 900: "#7A5800",
        },
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      rotate: {
        "60": "60deg",
        "70": "70deg",
      },
      transitionDuration: {
        "2000": "2000ms",
        "4000": "4000ms",
      },
      brightness: {
        "130": "1.30",
        "135": "1.35",
        "140": "1.40",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "spin-slow": {
          from: { transform: "translate(-50%, -50%) rotate(0deg)" },
          to: { transform: "translate(-50%, -50%) rotate(360deg)" },
        },
        barLoader: {
          "0%, 100%": { transform: "scaleY(0.1)", opacity: "0.2" },
          "50%": { transform: "scaleY(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "spin-slow": "spin-slow 4s linear infinite",
        barLoader: "barLoader 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
