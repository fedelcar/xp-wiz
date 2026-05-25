import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        af: {
          // Official Air France palette
          navy: "#001E62",       // dark header bg
          blue: "#002395",       // primary AF blue (French flag)
          red: "#E2001A",        // primary AF red
          "blue-mid": "#1A3FA6", // lighter blue for hover states
          "blue-light": "#4D79FF", // light accent
          sky: "#009BDE",        // sky blue for secondary elements
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
