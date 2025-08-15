import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // FACET Brand Colors - Unified Design System
        facet: {
          // Primary brand gradient colors
          "blue-primary": "#2C84DB",    // Primary FACET blue
          "wine-primary": "#C41E3A",    // Primary FACET wine red
          
          // Supporting blues
          "blue-light": "#5BA3E8",      // Lighter blue for hover states
          "blue-medium": "#1F6DB8",     // Medium blue for active states
          "blue-dark": "#1A5A96",       // Dark blue for pressed states
          "teal": "#0580B2",            // FACET teal accent
          
          // Supporting wines/reds
          "wine-light": "#D63856",      // Lighter wine for hover states
          "wine-medium": "#B01E36",     // Medium wine for active states
          "wine-dark": "#940011",       // Dark wine from diamond
          "deep-wine": "#73001C",       // Deep wine from diamond
          
          // Supporting colors
          "navy": "#132845",            // Deep navy from diamond
          "navy-light": "#174875",      // Lighter navy variant
          
          // Neutral grays with blue undertones
          "gray-50": "#F8FAFC",
          "gray-100": "#F1F5F9",
          "gray-200": "#E2E8F0",
          "gray-300": "#CBD5E1",
          "gray-400": "#94A3B8",
          "gray-500": "#64748B",
          "gray-600": "#475569",
          "gray-700": "#334155",
          "gray-800": "#1E293B",
          "gray-900": "#0F172A",
        },
        
        // Deprecated - for backward compatibility, remove in future
        therapy: {
          calm: "#2C84DB",     // Map to FACET blue
          peaceful: "#5BA3E8", // Map to FACET light blue
          growth: "#0580B2",   // Map to FACET teal
          wisdom: "#C41E3A",   // Map to FACET wine
          warm: "#D63856",     // Map to FACET light wine
          earth: "#940011",    // Map to FACET dark wine
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;