/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a111f",
          900: "#121c31"
        },
        mist: {
          50: "#f7f8fc",
          100: "#eef1f7",
          200: "#dce4f0"
        },
        accent: {
          500: "#0f766e",
          600: "#0d9488"
        },
        coral: {
          500: "#f97316"
        },
        gold: {
          400: "#fbbf24"
        }
      },
      boxShadow: {
        panel: "0 24px 60px rgba(18, 28, 49, 0.10)"
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "fade-up": "fadeUp 0.45s ease-out",
        "pop-in": "popIn 0.2s ease-out"
      }
    }
  },
  plugins: []
};
