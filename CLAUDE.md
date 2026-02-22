# CLAUDE.md

Personal blog built with Astro 5 + Tailwind CSS 4. Deployed to GitHub Pages via GitHub Actions.

## Commands

- `bun dev` — local dev server
- `bun run build` — production build (outputs to `dist/`)

## Conventions

- Commits follow conventional commits (`type: description`). No co-author lines or Claude attribution.
- Site config (name, socials, nav) lives in `src/site.ts`.
- OG image (`public/og-image.png`) is generated via sharp SVG-to-PNG, not a design tool. Inter font files in `public/fonts/` are embedded during generation.
