/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          bg: "#07080c",
          surface: "#0d111a",
          card: "#111724",
          border: "#1c2538",
          borderBright: "#2a3b5a",
          cyan: "#06b6d4",
          cyanDim: "#0891b2",
          red: "#ef4444",
          redDim: "#991b1b",
          amber: "#f59e0b",
          green: "#10b981",
          muted: "#64748b",
          text: "#e2e8f0"
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
