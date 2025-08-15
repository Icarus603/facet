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
        // FACET Brand Colors
        facet: {
          "blue-primary": "#2C84DB",
          "wine-primary": "#C41E3A",
          "blue-light": "#5BA3E8",
          "blue-medium": "#1F6DB8",
          "blue-dark": "#1A5A96",
          "teal": "#0580B2",
          "wine-light": "#D63856",
          "wine-medium": "#B01E36",
          "wine-dark": "#940011",
          "deep-wine": "#73001C",
          "navy": "#132845",
          "navy-light": "#174875",
        },
        therapy: {
          calm: "#2C84DB",
          peaceful: "#5BA3E8",
          growth: "#0580B2",
          wisdom: "#C41E3A",
          warm: "#D63856",
          earth: "#940011",
        },
      },
    },
  },
  plugins: [],
};

export default config;