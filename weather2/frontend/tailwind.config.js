/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        tactical: {
          bg: '#07080c',
          card: '#0d111a',
          surface: '#121724',
          border: '#1c2538',
          'border-highlight': '#2d3b55',
          text: '#e2e8f0',
          muted: '#818cf8',
        },
        radar: {
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          cyan: '#06b6d4',
          violet: '#a855f7',
        }
      },
      boxShadow: {
        'tactical-sm': '0 0 0 1px #1c2538',
        'tactical-glow-green': '0 0 15px -3px rgba(16, 185, 129, 0.25)',
        'tactical-glow-red': '0 0 15px -3px rgba(239, 68, 68, 0.25)',
        'tactical-glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
