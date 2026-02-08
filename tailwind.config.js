/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C0E12",
        fog: "#F5F6F8",
        wave: "#7BE0D9",
        ember: "#FF6B4A",
        tide: "#2B6CB0"
      },
      boxShadow: {
        glow: "0 0 40px rgba(123, 224, 217, 0.35)",
        lift: "0 14px 40px rgba(12, 14, 18, 0.18)"
      }
    }
  },
  plugins: []
};
