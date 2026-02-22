# davidmks.github.io

My personal blog and website, built with [Astro](https://astro.build).

**Live site**: [davidmks.github.io](https://davidmks.github.io)

## Tech stack

- [Astro 5](https://astro.build) — static site generator
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [GitHub Pages](https://pages.github.com) — hosting

## Getting started

```bash
bun install
bun run dev
```

Open [localhost:4321](http://localhost:4321).

## Available scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build locally |

## Project structure

```
src/
├── components/     # Reusable UI components
├── data/blog/      # Blog posts (Markdown)
├── layouts/        # Page layouts
├── pages/          # File-based routing
└── styles/         # Global styles
```

## Adding a blog post

Create a `.md` file in `src/data/blog/` with this frontmatter:

```markdown
---
title: Post Title
description: A short description.
pubDate: 2026-02-22
---

Your content here.
```

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via [GitHub Actions](.github/workflows/deploy.yml).

## License

All rights reserved.
