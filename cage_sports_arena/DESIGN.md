---
name: Cage Sports Arena
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#cfc6ae'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#98907a'
  outline-variant: '#4c4734'
  surface-tint: '#e4c538'
  primary: '#fff2cc'
  on-primary: '#3a3000'
  primary-container: '#f5d547'
  on-primary-container: '#6d5c00'
  inverse-primary: '#6f5d00'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#f5f2f2'
  on-tertiary: '#303030'
  tertiary-container: '#d8d6d5'
  on-tertiary-container: '#5d5d5c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe166'
  primary-fixed-dim: '#e4c538'
  on-primary-fixed: '#221b00'
  on-primary-fixed-variant: '#544600'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1b1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  surface-base: '#111111'
  surface-elevated: '#161616'
  surface-panel: '#1f1f1f'
  surface-highlight: '#2a2a2a'
  border-subtle: '#333333'
  text-muted: '#9ca3af'
  text-dim: '#a1a1aa'
  status-live: '#22c55e'
  status-booked: '#ef4444'
typography:
  display-hero:
    fontFamily: Oswald
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: 0.02em
  display-hero-mobile:
    fontFamily: Oswald
    fontSize: 38px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Oswald
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: 0.03em
  headline-lg-mobile:
    fontFamily: Oswald
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0.03em
  headline-md:
    fontFamily: Oswald
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0.02em
  headline-sm:
    fontFamily: Oswald
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Oswald
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Oswald
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 0.75rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an electric, athletic, and stadium-grade visual language designed specifically for premium turf venues, match bookings, and sports community engagement. The visual tone mirrors the high-intensity atmosphere of late-night games under bright floodlights: uncompromising, focused, and architecturally resilient.

### Aesthetic Pillars
- **High-Contrast Energy:** Grounded in a subterranean Deep Stadium Black canvas, electrified by high-intensity Turf Yellow accents that channel pitch boundary markings and arena lighting.
- **Architectural Dark Glass & Layering:** Restrained surfaces built from graded dark tones with hairline division, referencing the physical geometry of caged pitches, metal framing, and mesh enclosures.
- **Athletic Precision:** Powerful, condensed uppercase headings deliver decisive urgency, while hyper-legible neutral body text ensures frictionless slot scheduling, venue navigation, and quick checkout flows.
- **Controlled Softness:** Generously filleted container corners (`rounded-xl` to `rounded-2xl`) balance the brutalist athletic discipline with approachable hospitality.

## Colors

The system is engineered from the ground up for low-light legibility and swift visual scanning under active conditions.

### Role Assignments
- **Primary (`#F5D547`):** Electric Turf Yellow. Dedicated strictly to primary calls to action, selected booking slots, live broadcast/match pills, and luminous focus treatments.
- **Secondary (`#FFFFFF`):** Crisp White. Applied to primary headings, key athletic stats, and prominent UI controls requiring instant optical pickup.
- **Tertiary (`#1F1F1F`):** Medium Dark Charcoal. Deployed across interactive tiles, inactive slot buttons, and form inputs.
- **Neutral (`#111111`):** Deep Stadium Black. The foundational root background across all views.

### Named Dark Tokens & Utility Tones
- **Surfaces (`#161616`, `#1F1F1F`, `#2A2A2A`):** Tonal hierarchy for nested layers, glass cards, and sticky side drawers.
- **Structural Borders (`#333333`):** Subdued boundaries that delineate complex booking grids without visual noise.
- **Muted Text (`#9CA3AF`, `#A1A1AA`):** Secondary meta-information, venue amenities, slot availability timings, and terms.

## Typography

The typography pairs authoritative, condensed athletic display with utilitarian body copy.

- **Headlines & Badges (`Oswald`):** Applied in uppercase to match headers, field scoreboards, metric callouts, and primary button labels. Its narrow geometry enables assertive scale without pushing interactive slot tables off screen.
- **Body & Controls (`Inter`):** Delivers clean optical rhythm for slot timings, venue directions, facility terms, and verified reviews.
- **Case Rules:** All headlines, button triggers, and status badges default to uppercase text transforms with tracking values between `0.02em` and `0.08em`.

## Layout & Spacing

Layouts follow a structured fluid 12-column grid designed for rapid scanning on mobile handsets and high-density dashboards on desktop screens.

### Viewport Scaling
- **Mobile (< 768px):** 4-column structure with `margin-sm` (1rem) lateral padding and `gutter-sm` (0.75rem) gap. Booking grids collapse to 2 or 3 columns per time block, allowing single-thumb reservation.
- **Tablet (768px - 1024px):** 8-column system with `gutter` (1.5rem), presenting split-screen turf selection and live cart calculations side by side.
- **Desktop (> 1024px):** 12-column layout max-capped at 1440px with `margin` (2rem) and `space-xl` (2.5rem) section padding.

### Rhythm
Components rely on strict modular multiples of 4px. Card padding uses `space-lg` internally, while tight interactive slot matrices leverage `space-sm` and `space-md` gaps.

## Elevation & Depth

Visual hierarchy uses physical surface layering combined with low-contrast perimeter borders and targeted ambient neon glows.

- **Base Layer (L0):** Solid `#111111` backdrop.
- **Surface Layer (L1):** `#161616` panels with a continuous 1px outline of `#333333`.
- **Raised Interactive Layer (L2):** `#1F1F1F` with `#333333` borders, stepping up to `#2A2A2A` on hover.
- **Dark Glassmorphism:** Modals, sticky booking trays, and flyouts utilize `#161616` at 85% opacity with an 18px backdrop blur and a 1px border of `#333333`.
- **Stadium Yellow Bloom:** Primary active items (e.g., active CTA, selected match slot) cast an ambient glow: `box-shadow: 0 0 24px rgba(245, 213, 71, 0.22)`.

## Shapes

The design system blends rounded architectural chassis with pill-shaped athletic interaction points.

- **Panels & Large Cards:** `rounded-xl` (1rem) to `rounded-2xl` (1.5rem) for main review tickers, venue feature cards, and location briefing panels.
- **Controls & Filters:** Full capsules (`rounded-full`) for CTA buttons, filter pills, rating badges, and status counters.
- **Slot Grids & Form Inputs:** Compact rounded forms (`rounded-lg` / 0.5rem to 0.75rem) to ensure legible internal space for times and prices.

## Components

### Buttons
- **Primary CTA:** Solid `#F5D547` background, `#111111` uppercase label in Oswald, pill radius (`rounded-full`), padded `space-md` vertically and `space-lg` horizontally. Glow effect on hover (`0 0 20px rgba(245, 213, 71, 0.35)`).
- **Secondary Outlined:** Background `#1F1F1F`, 1px border `#333333`, `#FFFFFF` label. On hover, the border shifts to `#F5D547` with text turning `#F5D547`.
- **Tertiary / Ghost:** Transparent background, `#9CA3AF` text, underlines on hover with zero shift in layout height.

### Badges & High-Contrast Pills
- **Turf Status / Live Badge:** Electric yellow background (`#F5D547`), jet black label, pulsing green dot (`#22C55E`), uppercase Oswald typography.
- **Pricing & Dimension Badges:** Dark capsule (`#1F1F1F`), 1px outline `#333333`, text set in `#FFFFFF` with yellow micro-highlights.

### Slot Booking Grid
- **Available Slot:** `#1F1F1F` background, 1px `#333333` border, white time text (`Inter`, 14px), and muted price (`#9CA3AF`). Transitions to `#2A2A2A` on hover.
- **Selected Slot:** Solid `#F5D547` background, `#111111` bold text, yellow ambient shadow.
- **Booked / Unavailable Slot:** Muted `#161616` background, 1px dashed `#262626` border, text in `#52525B` with strikethrough. Interaction disabled.

### Moving Review Ticker Cards
- Continuously scrolling, staggered dual-rail ticker.
- Cards built on `#161616` dark glass with a 1px border in `#333333` and `rounded-xl` geometry.
- Inside each card: 5-star rating in `#F5D547`, verified badge pill, player quote in `#FFFFFF` (`body-md`), and author/match type in `#9CA3AF`.

### Venue Info Panel (Seerapalayam Facility)
- Hero spec panel detailing verified ground dimensions, FIFA-grade turf specs, floodlight coverage, parking, and live navigation links.
- Uses `rounded-2xl` structural framing, `#1F1F1F` interior surface, high-contrast white header, and clear operational hours displayed in athletic tabular columns.

### Form Inputs & Date Selectors
- `#161616` fill, 1px `#333333` border, `rounded-lg` corners, crisp `#FFFFFF` input characters.
- Active focus state immediately replaces the border with an intense 1px `#F5D547` halo without layout shift.