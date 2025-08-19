import type { Config } from "tailwindcss"

const config = {
  mode: 'jit',
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
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
        // Semantic colors based on content purpose
        "text-heading": "rgb(var(--color-text-heading))",
        "text-subheading": "rgb(var(--color-text-subheading))",
        "border-card": "rgb(var(--color-border-card))",
        "border-interactive": "rgb(var(--color-border-interactive))",
        "border-highlight": "rgb(var(--color-border-highlight))",
        "bg-table-header": "rgb(var(--color-bg-table-header))",
        "bg-hover": "rgb(var(--color-bg-hover))",
        "bg-button-hover": "rgb(var(--color-bg-button-hover))",
        "link": "rgb(var(--color-link))",
        "button-primary": "rgb(var(--color-button-primary))",
        "accent-pink": "rgb(var(--color-accent-pink))",
        "highlight": "rgb(var(--color-highlight))",
        
        // Core brand colors using CSS variables (legacy support)
        maroon: "rgb(var(--color-maroon))",
        pastyblue: "rgb(var(--color-pastyblue))",
        pastypink: "rgb(var(--color-pastypink))",
        jellygreen: "rgb(var(--color-jellygreen))",
        "primary-pink": "rgb(var(--color-primary-pink))",
        "title-pink": "rgb(var(--color-title-pink))",
        subtitle: "rgb(var(--color-subtitle))",
        
        // Design system colors
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        koho: ["var(--font-family-koho)", "sans-serif"],
      },
      fontSize: {
        'title-responsive': [
          'clamp(var(--title-font-size-min), calc(var(--title-font-size-min) + (var(--title-font-size-max) - var(--title-font-size-min)) * ((100vw - 360px) / (1440 - 360))), var(--title-font-size-max))',
          {
            lineHeight: 'clamp(var(--title-line-height-min), calc(var(--title-line-height-min) + (var(--title-line-height-max) - var(--title-line-height-min)) * ((100vw - 360px) / (1440 - 360))), var(--title-line-height-max))',
            letterSpacing: 'clamp(var(--title-letter-spacing-min), calc(var(--title-letter-spacing-min) + (var(--title-letter-spacing-max) - var(--title-letter-spacing-min)) * ((100vw - 360px) / (1440 - 360))), var(--title-letter-spacing-max))',
          }
        ],
      },
      spacing: {
        'nav-padding': 'var(--nav-padding)',
        'nav-padding-mobile': 'var(--nav-padding-mobile)',
        'home-text-padding': 'var(--home-text-padding)',
        'home-text-padding-mobile': 'var(--home-text-padding-mobile)',
        'button-padding-x': 'var(--button-padding-x)',
        'button-padding-y': 'var(--button-padding-y)',
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slow-spin": "slow-spin var(--animation-slow-spin) linear infinite",
        "scroll-left": "scroll-left var(--animation-scroll) linear infinite",
        "scroll-right": "scroll-right var(--animation-scroll) linear infinite",
        "hover-spin": "spin var(--animation-hover-spin) linear infinite",
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
        "slow-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "scroll-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "scroll-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(50%)" },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwind-scrollbar")
  ],
} satisfies Config

export default config