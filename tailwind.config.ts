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
        // Custom theme colors
        theme: {
          primary: '#000000',
          secondary: '#04d9ff',
          accent: '#ff6ec7',
          highlight: '#a3f1ff',
        }
      },
      backgroundColor: {
        'theme-primary': '#000000',
        'theme-secondary': '#04d9ff',
        'theme-accent': '#ff6ec7',
        'theme-highlight': '#a3f1ff',
        'theme-card': '#ffffff',
      },
      textColor: {
        'theme-primary': '#000000',
        'theme-secondary': '#ffffff',
        'theme-accent': '#ff6ec7',
        'theme-blue': '#04d9ff',
      },
      borderColor: {
        'theme-primary': '#04d9ff',
        'theme-accent': '#ff6ec7',
        'theme-highlight': '#a3f1ff',
      }
    },
  },
  plugins: [],
};

export default config;
