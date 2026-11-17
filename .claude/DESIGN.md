---
name: MEND GROUP — Calm, crafted
description: Software company site. Sober and credible, with presence. One teal accent (mint on dark), real screens in the hero, soft layered depth.
recorded: 2026-11-17
source: styles.css (the one stylesheet; every page links it)
status: direction chosen by Jakote on 17 Nov 2026 ("calm, more crafted"). Replaces the flat teal look shipped before.
colors:
  ink: "#121a19"
  ink-2: "#3a4745"      # body text, 9.0:1 on paper
  ink-3: "#586664"      # secondary text, 5.6:1 on paper
  paper: "#f6f7f6"
  paper-2: "#eef1f0"    # alternate sections
  card: "#ffffff"
  line: "#dde3e1"
  teal: "#00685f"       # the accent on light; 6.2:1 on paper; white on it passes
  teal-2: "#005a52"     # hover: darker, never lighter
  teal-soft: "#e2f3ef"  # tag background
  mint: "#7ad8ca"       # the accent on dark; 11.1:1 on dark
  dark: "#0d1413"       # hero, case heroes, footer
  dark-2: "#1b2524"
  on-dark: "#eef3f2"
  on-dark-2: "#a9b8b5"  # secondary text on dark, 9.1:1
  gold: "#e8c877"       # pilot status on dark only
typography:
  display: { family: Plus Jakarta Sans, weight: 800, tracking: "-0.02em to -0.035em" }
  body: { family: Inter, weight: 400-700, size: 16px, line-height: 1.6 }
  labels: { family: Space Grotesk, weight: 500, size: 11.5-12.5px, transform: uppercase, tracking: "0.08-0.12em" }
rounded: { card: 14px, control: 10px, tag: 999px }
---

# mendgroup.co.za design record

This file lives under `.claude/` because GitHub Pages publishes the repo root. It records the
look in `styles.css` so that later edits start from it, not from memory.

## Overview

**North star: calm, crafted.** A company with no employees and one founder has to look
careful, not loud. The site shows real work and lets it carry the page: the hero holds two
real screens (TM Stone's live site in a browser frame, Matsema on a phone) beside the claim
"Software you can open and check." Everything else is quiet: one accent, generous space, white
cards with a hairline and a soft shadow.

## Colours

- **One accent.** Teal `#00685f` on light grounds, mint `#7ad8ca` on dark. No second brand
  colour. Gold appears only as pilot status on dark; amber tags mark pilots on light.
- **Dark grounds:** the home hero, the case-page heroes, the register card header and the footer.
  Everything else is paper and white.
- **Text greys** are tinted toward the teal, never pure grey. Every pair passes WCAG AA; checked
  on 17 Nov 2026 across the home page and three case pages at 1440, 1024, 900, 390 and 320px.

## Typography

Plus Jakarta Sans 800 for headings with tight negative tracking; Inter for body; Space Grotesk
uppercase for small labels (section kickers with a short rule before them, fact labels, tags).
Headings use `text-wrap: balance`, paragraphs `pretty`.

## Layout

1160px container, 16px phone gutter (24px from 640px). Sections 56px tall padding on phones,
96px from 900px. Breakpoints: 640px (two-column facts), 900px (three-column grids), 1024px (the
full nav; below it, the menu button), 1200px (the two-column hero with the screen showcase;
below it, one column). The showcase is `aria-hidden` and hidden below 1200px; its images are
the same files the work cards use, so smaller screens download nothing extra.

## Elevation and depth

Cards (`.case`, `.cap`, `.steps li`, `.founder`, `.register`, the contact form) share one
surface: white, 1px hairline at 8% ink, `--shadow-1`. Case cards lift 2px to `--shadow-2` on
hover (pointer devices, motion allowed). The dark heroes carry a faint 48px drafting grid,
masked to fade out, and one soft mint glow. Both are decorative pseudo-elements.

## Motion

Quiet and optional. Buttons press to `scale: 0.96`; colours ease over 150ms. The hero showcase
rises 16px once on load. **Position only, never opacity**, so the screens and all text are
visible wherever animations do not run (crawlers, print, throttled tabs). The headline and copy
never animate. All motion is off under `prefers-reduced-motion: reduce`.

## Components

- **Primary button:** teal fill, white text; on dark grounds mint fill, dark text.
- **Outline button:** 1.5px current-colour border on dark.
- **Fact strip:** hairline-separated cells on the dark hero (registration, incorporation, head
  office, contact); the case pages use the same pattern (`.cs-facts`).
- **Tag:** pill, Space Grotesk uppercase, teal on teal-soft; amber for pilots.
- **Steps:** large teal two-digit numerals (01, 02, 03) above each step.
- **Capability card:** a 3px teal rule that fades out along the top edge.

## Do's and don'ts

- **Do** keep one accent. Teal on light, mint on dark.
- **Do** show real screens. Never stock imagery or illustrations of work not done.
- **Do** keep focus visible: 3px teal outline on light, mint on dark.
- **Don't** animate opacity on content.
- **Don't** add a colour for emphasis. Use weight, size or space.
- **Don't** change copy as part of a style change. Claims go through `claims-auditor`.
