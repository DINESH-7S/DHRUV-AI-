---
version: alpha
name: DHRUV
description: >
  DHRUV's design language: an expedition-grade, photograph-led public portal for India's polar and
  Himalayan science. Structure and rules are borrowed from the SpaceX-inspired analysis in
  VoltAgent/awesome-design-md (design-md/spacex/DESIGN.md): near-black canvas, full-bleed real
  expedition photography, condensed uppercase display type with wide tracking, hairlines instead of
  cards, one ghost-outlined pill CTA per band. DHRUV keeps its own name, its navy tint and its single
  glacier accent, and stays accessible first (WCAG 2.1 AA, GIGW) and bilingual (English and Hindi).
  No SpaceX logos, imagery, copy or fonts are used.

colors:
  canvas: "#060e18"          # page background: near-black with DHRUV's navy tint (--navy)
  canvas-deep: "#03080f"     # deepest bands, hero, footer (--ink)
  surface: "#0c1826"         # the rare raised surface (--navy-raised)
  hairline: "#1f2e3f"        # 1px rules between items (--line)
  on-canvas: "#f2f6fa"       # primary text (--snow)
  on-canvas-mute: "#a7b8c8"  # secondary text, well above 7:1 on canvas (--mist)
  accent: "#5bbfe6"          # glacier: links, focus ring, live dot, active nav. Never a fill for large areas.
  accent-deep: "#2d8fbd"
  success: "#6ee7b7"
  danger: "#fda4af"

typography:
  display-xxl: { fontFamily: "Rajdhani", fontSize: 72px, fontWeight: 700, lineHeight: 0.98, letterSpacing: 0.02em, textTransform: uppercase }
  display-xl:  { fontFamily: "Rajdhani", fontSize: 48px, fontWeight: 700, lineHeight: 1.02, letterSpacing: 0.02em, textTransform: uppercase }
  display-lg:  { fontFamily: "Rajdhani", fontSize: 32px, fontWeight: 700, lineHeight: 1.08, letterSpacing: 0.02em, textTransform: uppercase }
  title:       { fontFamily: "Rajdhani", fontSize: 20px, fontWeight: 600, lineHeight: 1.25, letterSpacing: 0.01em }
  body-lg:     { fontFamily: "IBM Plex Sans Devanagari", fontSize: 18px, fontWeight: 400, lineHeight: 1.65 }
  body-md:     { fontFamily: "IBM Plex Sans Devanagari", fontSize: 16px, fontWeight: 400, lineHeight: 1.6 }
  button-cap:  { fontFamily: "Rajdhani", fontSize: 14px, fontWeight: 700, lineHeight: 1, letterSpacing: 0.14em, textTransform: uppercase }
  micro-cap:   { fontFamily: "Rajdhani", fontSize: 13px, fontWeight: 600, lineHeight: 1.6, letterSpacing: 0.16em, textTransform: uppercase }
  data:        { fontFamily: "IBM Plex Mono", fontSize: 14px, fontWeight: 400, fontVariantNumeric: tabular-nums }

rounded:
  xs: 2px
  sm: 4px      # inputs, tags, thumbnails
  md: 6px      # panels, media frames (Tailwind xl / 2xl / 3xl map here)
  pill: 9999px # CTAs and the language switch only

spacing: { base: 8px, section: 96px, band-mobile: 64px }
---

## Overview

The archive is the design. DHRUV's pages are bands of real, credited expedition photographs and
plain text on a near-black canvas, the way an expedition log or a mission site reads, not a
software dashboard. The home page opens on India's first scientific expedition to the South Pole
(2010), not on an illustration.

Every visual choice supports two jobs: make four decades of Indian polar work feel present, and
make every fact traceable to its source.

## Colour

- One canvas family, navy-tinted near-blacks (`canvas`, `canvas-deep`, `surface`). No light
  sections inside a dark page.
- One accent, glacier (`accent`), for links, focus, the live dot and the active nav marker only.
  Buttons are outlined, not glacier-filled.
- No gradients as decoration (the old aurora glow is gone). The only gradients allowed are
  functional fades that let a photograph meet the canvas.
- Status colours (success, danger) appear only in data and review states.

## Typography

- **Display: Rajdhani** (Indian Type Foundry, SIL OFL, Google Fonts), a squared, DIN-like
  engineering face with Latin and Devanagari. It stands in for the reference's condensed DIN.
  English display text is uppercase with wide tracking.
- **Hindi rule:** Devanagari has no capitals and breaks when tracked (the shirorekha line splits).
  Under `:lang(hi)` display and caps styles drop `text-transform` and `letter-spacing`.
- **Body: IBM Plex Sans Devanagari**; data and figures use tabular numerals.
- Sentence case for body and headings inside content (asset titles, questions, answers) stays as
  written: only page and section display headings, eyebrows and buttons are uppercase.

## Layout

- Container 1280px (`max-w-7xl`), 16px gutters on phones.
- Bands, not boxes: sections are separated by space and 1px `hairline` rules. Cards appear only
  where an item is a link to something (an archive item, a station).
- Hero: split. Copy on the canvas at left; the photograph bleeds to the right edge and fades into
  the canvas. On phones the photograph sits above the copy, full width.
- Section rhythm: 96px between bands on desktop, 64px on phones.

## Components

- **Ghost pill CTA** (`.btn-ghost`): transparent, 1px `on-canvas` border, `button-cap` text,
  18px × 26px padding, pill radius; hover fills `on-canvas` with `canvas-deep` text. One per band.
  A second action is a plain text link with an arrow.
- **Eyebrow** (`.eyebrow`): `micro-cap` in `accent`.
- **Display heading** (`.display`): uppercase Rajdhani 700 as above.
- **Nav:** transparent over the hero, caps links in `micro-cap`, a 2px glacier underline for the
  current page; solid `canvas` with hairline once scrolled.
- **Photo credit:** every photograph shown large carries its credit and licence in `micro-cap`
  at the bottom edge, linking to the item page.
- **Stats band:** large Rajdhani figures in a single hairline-ruled row.

## Motion

Short, functional, transform and opacity only (framer-motion is already in the stack): staggered
entrances, the hiding nav, hover lifts of 1–2px. Everything respects `prefers-reduced-motion`.

## Accessibility (overrides the reference)

- WCAG 2.1 AA contrast everywhere; text never sits on an ungraded photograph.
- Visible glacier focus ring on every control; skip link first.
- Touch targets ≥ 44px; the ghost pill is ≥ 48px tall.

## Do and don't

- Do lead with real, credited NCPOR-related photography; grade it, credit it.
- Do keep the accent rare.
- Don't add new accent colours, gradient text, glow shadows or glassmorphism on scrolling content.
- Don't track or uppercase Devanagari.
- Don't use SpaceX's name, logos, photographs or copy; this file borrows only structure and rules.

## Built components (27 Sep 2026)

- `components/public/PageBand.tsx`: every public page opens with a toned, credited archive photograph
  (`lib/content/bands.json`, images in `public/bands/`) or, without one, the polar graticule. Title in
  display capitals rising in over the band; credit bottom right, linking to the item.
- `components/graphics/PolarGraticule.tsx`: the signature graphic. Polar stereographic rings and
  meridians that draw in and turn slowly, with India's stations at their true coordinates.
- `components/public/home/StationTicker.tsx`: an endless band of stations and coordinates.
- `components/public/home/ExpeditionScroller.tsx`: pinned horizontal timeline of sourced expeditions
  (framer-motion `useScroll`, transform only); a swipeable row on phones and for reduced motion.
- `.btn-ghost` (marketing CTA), `.btn-solid` (app actions), `.chip` (filters), `.micro-cap`,
  `.display`, `.ghost-text` (decorative numerals drawn from `data-text`, so they are not read or
  contrast-checked; the same information is always present as real text).
- Accessibility check: `npm run a11y` (axe-core, WCAG 2.1 AA, English and Hindi). 0 violations on
  15 pages on 27 Sep 2026.
