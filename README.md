# Ali's Heat Crunch Delight — Store

Landing page for **Ali's Heat Crunch Delight (AHCD)**, a homemade chilli oil made in
small batches by Ali.

This is the first Lumos Fellows MVP milestone: *a simple page that shows your product
moment, deployed to a real URL.* It is a **landing page only**.

## Not built yet (intentionally)

No authentication, customer accounts, Stripe, Supabase, database, functional cart,
functional checkout, admin dashboard, APIs, or inventory management. The product section
shows an "Online ordering coming soon" state and links to Instagram.

## Stack

- [Next.js 15](https://nextjs.org) (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Fonts via `next/font/google` (Anton for display, Inter for body)
- Deployed on Vercel

No UI component library is used — the page is small enough that plain Tailwind plus
semantic HTML is simpler and ships fewer dependencies.

## Local development

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

| Script              | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm run build`     | Production build                |
| `npm start`         | Serve the production build      |
| `npm run lint`      | ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | `tsc --noEmit`                  |

> **Don't run `npm run build` while `npm run dev` is running.** Both write to `.next`,
> and mixing their output causes runtime errors like `Cannot find module './232.js'`.
> If you hit that, stop the dev server, delete `.next`, and start again:
>
> ```bash
> rm -rf .next && npm run dev
> ```

## Structure

```
app/
  layout.tsx        fonts + site metadata
  page.tsx          composes the sections
  globals.css       Tailwind v4 import + brand tokens
components/
  Navbar.tsx        sticky nav, mobile menu (the only client component)
  Hero.tsx          split hero, product photo
  AccentStrip.tsx   electric-blue info strip
  ProductSection.tsx
  BenefitsStrip.tsx
  FoodGallery.tsx
  StorySection.tsx
  Footer.tsx
lib/
  site.ts           the few verified brand facts, in one place
public/
  images/           real AHCD logo, product and food photography
design-references/
  achd-homepage-reference.png   visual inspiration only — see note below
```

> **Why `design-references/` is not inside `public/`:** anything in `public/` is served
> at a public URL. The generated homepage reference contains placeholder branding, a
> made-up price, invented ingredients and a fake shipping promise, so it must not be
> reachable on the live domain. It is kept outside `public/` deliberately.

## Brand tokens

Defined in `app/globals.css` under `@theme`, derived from the real logo:

| Token                | Value     | Use                                        |
| -------------------- | --------- | ------------------------------------------ |
| `--color-navy`       | `#030e29` | Primary background — sampled from the logo |
| `--color-cream`      | `#f5f1e8` | Warm off-white content background          |
| `--color-orange`     | `#f26b1d` | Primary accent / CTA                       |
| `--color-flame`      | `#ffc13b` | Fiery yellow highlight                     |
| `--color-blue`       | `#1e6bff` | Electric blue secondary accent             |

`ahcd-logo.png` has an **opaque** `#030e29` background rather than transparency, which is
why the navy token matches it exactly — the logo is only ever placed on navy surfaces so
it reads as a clean crest with no visible box.

## Image handling

Each photo is framed to its own subject rather than blanket `object-cover`:

| Image                        | Native      | Treatment                                                             |
| ---------------------------- | ----------- | --------------------------------------------------------------------- |
| `ahcd-product-jar.jpg`       | 1280×617    | Framed at `aspect-[1280/617]`, `object-contain` — effectively uncropped |
| `ali-founder-with-jar.jpg`   | 1280×1707   | Portrait `aspect-[3/4]` only; a landscape crop would cut Ali's face or the jars |
| `ahcd-tikka-ramen.png`       | 1222×880    | Wide band; only trims tablecloth, so both dishes always stay in frame |
| `ahcd-avocado-egg-toast.png` | 1154×880    | `aspect-[4/3]`, `object-left` so the jar at the left edge is never cut |
| `achd-eggs-and-rice.png`     | 1594×1602   | `aspect-square`, `object-[50%_55%]` to centre the bowl                 |

Note the filename typo `achd-` (rather than `ahcd-`) on the eggs-and-rice photo and the
reference image — they are referenced by their real names.

## Content accuracy

Everything on the page is something AHCD can stand behind. The page deliberately does
**not** state a price, jar size, heat level, ingredient list, nutrition, allergens, shelf
life, shipping or return terms, variants, stock, reviews, ratings, customer numbers,
certifications, awards, or a founding date. The only contact channel shown is the real
Instagram account. Add facts to `lib/site.ts` and the relevant section as they become
true.

## Deployment

Pushing to `main` triggers a Vercel production deployment. No environment variables are
required — the page is fully static.

## License

Source code is MIT licensed (see [LICENSE](LICENSE)). The AHCD brand, logo, and the
photography in `public/images/` are not covered by that license.
