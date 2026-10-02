/**
 * Tokens mirror the `tailwind.config` embedded in the Stitch exports
 * (../*_mobile_revised/code.html) and ../cage_sports_arena/DESIGN.md,
 * so the exported class names render identically here.
 *
 * Every colour is emitted as a CSS variable so the same class names serve both
 * themes: `DARK` below is the default (and exactly the exported palette);
 * `LIGHT` lists only what differs when <html data-theme="light"> is set.
 */
const plugin = require("tailwindcss/plugin");

const DARK = {
  "surface": "#131313",
  "surface-dim": "#131313",
  "surface-bright": "#3a3939",
  "surface-container-lowest": "#0e0e0e",
  "surface-container-low": "#1c1b1b",
  "surface-container": "#201f1f",
  "surface-container-high": "#2a2a2a",
  "surface-container-highest": "#353534",
  "on-surface": "#e5e2e1",
  "on-surface-variant": "#cfc6ae",
  "inverse-surface": "#e5e2e1",
  "inverse-on-surface": "#313030",
  "outline": "#98907a",
  "outline-variant": "#4c4734",
  "surface-tint": "#e4c538",
  "primary": "#fff2cc",
  "on-primary": "#3a3000",
  "primary-container": "#f5d547",
  "on-primary-container": "#6d5c00",
  "inverse-primary": "#6f5d00",
  "secondary": "#c6c6c7",
  "on-secondary": "#2f3131",
  "secondary-container": "#454747",
  "on-secondary-container": "#b4b5b5",
  "tertiary": "#f5f2f2",
  "on-tertiary": "#303030",
  "tertiary-container": "#d8d6d5",
  "on-tertiary-container": "#5d5d5c",
  "error": "#ffb4ab",
  "on-error": "#690005",
  "error-container": "#93000a",
  "on-error-container": "#ffdad6",
  "primary-fixed": "#ffe166",
  "primary-fixed-dim": "#e4c538",
  "on-primary-fixed": "#221b00",
  "on-primary-fixed-variant": "#544600",
  "secondary-fixed": "#e2e2e2",
  "secondary-fixed-dim": "#c6c6c7",
  "on-secondary-fixed": "#1a1c1c",
  "on-secondary-fixed-variant": "#454747",
  "tertiary-fixed": "#e5e2e1",
  "tertiary-fixed-dim": "#c8c6c5",
  "on-tertiary-fixed": "#1b1b1c",
  "on-tertiary-fixed-variant": "#474746",
  "background": "#131313",
  "on-background": "#e5e2e1",
  "surface-variant": "#353534",
  "surface-base": "#111111",
  "surface-elevated": "#161616",
  "surface-panel": "#1f1f1f",
  "surface-highlight": "#2a2a2a",
  "border-subtle": "#333333",
  "text-muted": "#9ca3af",
  "text-dim": "#a1a1aa",
  "status-live": "#22c55e",
  "status-booked": "#ef4444",
  // Named stand-ins for hex values the pages used inline, so they can follow the theme.
  "hairline": "#262626",
  "hairline-strong": "#2c2c2c",
  "hairline-hover": "#444444",
  "text-disabled": "#52525b",
  // Yellow used as text / outline. Same as primary-container in the dark theme.
  "accent": "#f5d547",
  "accent-line": "#f5d547"
};

const LIGHT = {
  "surface-base": "#f3f3f0",
  "surface-elevated": "#f7f7f4",
  "surface-panel": "#ffffff",
  "surface-highlight": "#e9e9e4",
  "surface-variant": "#dededa",
  "surface-container-lowest": "#e8e8e3",
  "surface-container-low": "#ffffff",
  "surface-container": "#f0f0ec",
  "surface-container-high": "#eeeeea",
  "surface-container-highest": "#e3e3dd",
  "on-surface": "#1b1b1b",
  "secondary-fixed": "#3f3f46",
  "text-dim": "#5f5f68",
  "text-muted": "#5b6370",
  "border-subtle": "#d3d3cc",
  "hairline": "#dcdcd5",
  "hairline-strong": "#d3d3cc",
  "hairline-hover": "#a8a8a0",
  "text-disabled": "#a1a1aa",
  // Brand yellow stays as the fill for buttons, pills and selected states (dark text on it).
  // As text or a thin outline on a light surface it would be unreadable, so those use a deep gold.
  "accent": "#7a5c00",
  "accent-line": "#a07c00",
  // Status colours darkened to stay legible as text on white.
  "status-live": "#166534",
  "status-booked": "#b91c1c"
};

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const variables = (palette) => Object.fromEntries(Object.entries(palette).map(([name, hex]) => [`--c-${name}`, channels(hex)]));
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
const colors = Object.fromEntries(Object.keys(DARK).map((name) => [name, token(name)]));

module.exports = {
  darkMode: "class",
  content: ["./*.html", "./assets/js/*.js"],
  theme: {
    extend: {
      colors,
      // Yellow as text, border or focus ring follows the readable accent of the active theme;
      // `bg-primary-container` keeps the brand yellow in both.
      textColor: { "primary-container": token("accent") },
      borderColor: { "primary-container": token("accent-line") },
      ringColor: { "primary-container": token("accent-line") },
      boxShadow: {
        header: "var(--shadow-header)",
        tabbar: "var(--shadow-tabbar)"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        "gutter": "1.5rem",
        "gutter-sm": "0.75rem",
        "margin": "2rem",
        "margin-sm": "1rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem"
      },
      maxWidth: {
        // DESIGN.md: desktop layout is capped at 1440px
        site: "1440px"
      },
      fontFamily: {
        "display-hero": ["Oswald", "sans-serif"],
        "display-hero-mobile": ["Oswald", "sans-serif"],
        "headline-lg": ["Oswald", "sans-serif"],
        "headline-lg-mobile": ["Oswald", "sans-serif"],
        "headline-md": ["Oswald", "sans-serif"],
        "headline-sm": ["Oswald", "sans-serif"],
        "label-lg": ["Oswald", "sans-serif"],
        "label-caps": ["Oswald", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"]
      },
      fontSize: {
        "display-hero": ["64px", { lineHeight: "72px", letterSpacing: "0.02em", fontWeight: "700" }],
        "display-hero-mobile": ["38px", { lineHeight: "44px", letterSpacing: "0.02em", fontWeight: "700" }],
        "headline-lg": ["36px", { lineHeight: "44px", letterSpacing: "0.03em", fontWeight: "600" }],
        "headline-lg-mobile": ["26px", { lineHeight: "32px", letterSpacing: "0.03em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "0.02em", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "24px", letterSpacing: "0.02em", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["15px", { lineHeight: "24px", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "20px", fontWeight: "400" }],
        "label-lg": ["15px", { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" }],
        "label-caps": ["13px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "500" }]
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms"),
    plugin(({ addBase }) => {
      const dark = {
        ...variables(DARK),
        "--shadow-header": "0 1px 8px rgba(0,0,0,0.4)",
        "--shadow-tabbar": "0 -2px 12px rgba(0,0,0,0.5)",
        "color-scheme": "dark"
      };
      addBase({
        ":root": dark,
        'html[data-theme="light"]': {
          ...variables(LIGHT),
          "--shadow-header": "0 1px 6px rgba(0,0,0,0.08)",
          "--shadow-tabbar": "0 -2px 10px rgba(0,0,0,0.08)",
          "color-scheme": "light"
        },
        // Photos with captions keep their dark scrim and light text in both themes.
        ".theme-fixed-dark": dark
      });
    })
  ]
};
