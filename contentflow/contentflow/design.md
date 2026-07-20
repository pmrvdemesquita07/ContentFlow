# SocialFlow design system

The visual identity for SocialFlow: a creator-economy tool, so it should feel energetic and
personal rather than corporate/enterprise-grey, while staying legible for dense data screens
(Analytics, Dashboard, campaign ROI tables).

## Brand

- **Wordmark**: `SocialFlow`, set in the display typeface at extrabold weight with the brand
  gradient applied as text color. Text-only, no image asset - `components/brand/logo.tsx`
  renders it at three sizes (`sm`/`md`/`lg`). Never re-color it per-page; it's the one constant.
- **Voice**: direct, a little playful, never jargon-heavy ("Contratos" not "Vendor Relationship
  Management"). Matches the existing empty-state copy tone already used across the app.

## Color

Two token layers, both defined in `app/globals.css`:

1. **Semantic tokens** (`--primary`, `--background`, `--success`, etc.) - drive every component
   via shadcn's CSS-variable convention. Light and dark values are both defined; the app already
   ships a dark-mode toggle (`ThemeToggle`), so every screen works in both without extra code.
2. **Brand gradient** (`--gradient-from` / `--gradient-to`) - a vivid magenta-to-coral diagonal,
   used only for the wordmark and hero/marketing chrome via the `.text-gradient-brand` /
   `.bg-gradient-brand` utility classes. It is *not* used for data (chart colors are a separate,
   already-validated categorical palette - see the `--chart-*` tokens and the dataviz skill) and
   not used for large surface fills, since a full-page gradient would fight with dense data
   tables.

Primary hue sits around 322° (magenta-violet) in both themes - vivid enough to feel like a
creator-economy product, but kept at a lightness/chroma that still passes contrast against its
`-foreground` pair. Dashboards default to whichever theme the user has chosen; dark mode was
tuned first since data-heavy screens (Analytics, campaign ROI, Dashboard charts) are where users
spend the most time and dark backgrounds make chart lines and stat numbers pop more than on
white.

## Typography

- **Display** (`--font-display`, Poppins 600-800): all `h1`/`h2`/`h3` elements automatically get
  this via a base-layer rule in `globals.css` - no per-page class needed. Bold, slightly tight
  tracking, for page titles and card section headers.
- **Body/data** (`--font-sans`, Inter): everything else - form labels, table cells, numbers.
  Inter's numeral spacing reads better in dense stat grids than a display face would.

## Components

No new component library - the existing hand-built shadcn/ui set (`components/ui/*`) stays as
the base. The rebrand is a token-level change (colors, fonts, wordmark), not a rebuild: buttons,
cards, badges, and charts all pick up the new palette automatically since they reference the
CSS variables rather than hardcoded colors.

## Dashboards specifically

Analytics/Dashboard/Campaign-detail screens are data-first: stat cards, bar charts, line charts.
Guidance for those screens:

- Keep the brand gradient out of chart marks entirely - charts use the validated `--chart-1..5`
  categorical palette so series stay distinguishable and colorblind-safe.
- Stat numbers stay `font-sans` (not display) at `font-semibold`, so a page of a dozen stat
  tiles doesn't feel like a dozen headlines.
- Section headers (`<h2>`) inside cards pick up the display font automatically via the base-layer
  rule, giving each section a clear visual anchor without extra markup.
