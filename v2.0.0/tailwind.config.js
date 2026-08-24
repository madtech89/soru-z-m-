/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Outfit", "system-ui", "sans-serif"],
        sans: ["Figtree", "system-ui", "sans-serif"],
        editorial: ["Playfair Display", "Georgia", "serif"],
      },
      colors: {
        ink: "#18181B",
        paper: "#FBFBF9",
        subject: {
          matematik: "#4F46E5",
          turkce: "#F43F5E",
          fen: "#10B981",
          sosyal: "#F59E0B",
          ai: "#EC4899",
          general: "#0F172A",
        },
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-14px)" } },
      },
      animation: {
        marquee: "marquee 45s linear infinite",
        floaty: "floaty 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
