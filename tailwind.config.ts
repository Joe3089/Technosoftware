import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          deep: "#080e1a",
          DEFAULT: "#0e1628",
          mid: "#152040",
          card: "rgba(15,24,56,0.7)",
        },
        blue: {
          DEFAULT: "#1e3573",
          bright: "#2a4aad",
          accent: "#4d7fff",
        },
        cyan: {
          DEFAULT: "#00cfff",
          glow: "rgba(0,207,255,0.15)",
        },
        silver: "#9aafd4",
        glass: "rgba(77,127,255,0.2)",
        "status-green": "#00e676",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        ui: ["var(--font-ui)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        DEFAULT: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
      },
      boxShadow: {
        glass: "0 4px 32px rgba(0,0,0,0.4), 0 0 60px rgba(77,127,255,0.06)",
        glow: "0 0 20px rgba(77,127,255,0.4)",
        "glow-cyan": "0 0 20px rgba(0,207,255,0.4)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(77,127,255,0.15)",
      },
      keyframes: {
        "spin-3d": {
          "0%": { transform: "rotateY(0deg) scale(0.96)" },
          "50%": { transform: "rotateY(180deg) scale(1.04)" },
          "100%": { transform: "rotateY(360deg) scale(0.96)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.3)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        "spin-3d": "spin-3d 7s linear infinite",
        "spin-3d-slow": "spin-3d 9s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease both",
        blink: "blink 1.8s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-dark":
          "radial-gradient(ellipse at 20% 20%, rgba(46,82,173,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(30,53,115,0.1) 0%, transparent 60%)",
        "gradient-hero":
          "linear-gradient(135deg, rgba(42,74,173,0.9) 0%, rgba(30,53,115,0.9) 100%)",
        "gradient-card":
          "linear-gradient(135deg, #152040 0%, rgba(30,53,115,0.5) 100%)",
        "gradient-cta":
          "linear-gradient(135deg, #2a4aad 0%, #1e3573 100%)",
        "gradient-accent":
          "linear-gradient(90deg, #4d7fff 0%, #00cfff 100%)",
      },
      borderColor: {
        glass: "rgba(77,127,255,0.2)",
        "glass-subtle": "rgba(255,255,255,0.07)",
      },
      gridTemplateAreas: {},
    },
  },
  plugins: [animate],
};

export default config;
