# Ali's Heat Crunch Delight

The website for **Ali's Heat Crunch Delight (AHCD)**, a homemade chilli oil made in small
batches by Ali.

The application combines a public storefront with a private operations area. Visitors can
browse the product and read published updates without an account. Signing in with Google
provides a personal account page. A single administrator has access to an internal
dashboard and a small publishing system for posting news to the site.

Built with Next.js and Supabase, and deployed on Vercel.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Design system](#design-system)
- [Image handling](#image-handling)
- [Content policy](#content-policy)
- [Deployment](#deployment)
- [Licence](#licence)

## Features

**Public storefront.** A single-page presentation of the product, built around real
photography: a split hero, product detail, serving suggestions and the founder's story.
Fully responsive and accessible. No account is required to browse.

**Authentication.** Google sign-in through Supabase Auth. Sessions persist across
navigation and page refresh, and the navigation bar reflects the signed-in state on both
desktop and mobile.

**Account area.** A protected page at `/account` showing the signed-in user's Google
profile, with placeholders for features that arrive in later work.

**Administration.** A dashboard at `/admin` restricted to one administrator, presenting
business metrics grouped by commerce, customers, conversion, products, operations and
content. Figures that have no data source yet are labelled explicitly rather than
populated with invented values.

**Updates publishing.** A small content system for posting news. Each update has a title,
body text, ordered images and a draft or published status. Drafts are visible only to the
administrator. Published updates appear automatically at `/updates` and at a permanent
per-update URL, rendered through one consistent template.

Commerce functionality — payments, checkout, cart, orders and inventory — is not part of
the current application.

## Technology

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org) (App Router, React Server Components) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4 with CSS custom properties |
| Fonts | `next/font/google` — Anton for display, Inter for body |
| Authentication | Supabase Auth with Google OAuth |
| Database | Supabase Postgres with Row Level Security |
| File storage | Supabase Storage (private bucket, signed URLs) |
| Hosting | Vercel |

The project deliberately uses no UI component library. The interface is small enough that
Tailwind and semantic HTML are simpler and ship fewer dependencies. Native elements are
preferred throughout — for example, keyboard accessibility in menus and dialogs is
handled directly rather than through a library.

The `server-only` package marks modules that must never be bundled for the browser. An
accidental client-side import of the administrator gate is therefore a build failure
rather than a silent credential leak.

## Getting started

### Prerequisites

- Node.js 20 or later
- A Supabase project with Google configured as an authentication provider

### Installation

```bash
npm install
```

### Configure environment variables

Copy the example file and fill in the values from your Supabase project:

```bash
cp .env.example .env.local
```

See [Environment variables](#environment-variables) for what each value does.

### Set up the database

Open the Supabase dashboard, go to **SQL Editor**, and run the contents of
[`supabase/schema.sql`](supabase/schema.sql). The script is idempotent and safe to re-run.
It creates the tables, indexes and triggers, provisions the private storage bucket, and
applies every Row Level Security policy.

The administrator's email address is written into the `is_ahcd_admin()` function in that
script. It must match the `ADMIN_EMAIL` environment variable exactly; if the two diverge,
the application will admit a user that the database then refuses to serve.

### Run the development server

```bash
npm run dev
```

The site is then available at <http://localhost:3000>.

### Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve a production build |
| `npm run lint` | Run ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | Run `tsc --noEmit` |

> **Do not run `npm run build` while the development server is running.** Both write to
> `.next`, and interleaving their output produces misleading runtime errors such as
> `Cannot find module './232.js'`. If this occurs, stop the development server, remove the
> build directory and start again:
>
> ```bash
> rm -rf .next && npm run dev
> ```

## Environment variables

| Variable | Exposed to browser | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key |
| `ADMIN_EMAIL` | **No** | The email address permitted to access `/admin` |

The two `NEXT_PUBLIC_` values are compiled into the client bundle by design. The
publishable key is intended to be public; access control is enforced by Row Level
Security, not by concealing it.

`ADMIN_EMAIL` must **not** carry the `NEXT_PUBLIC_` prefix. It is read exclusively on the
server, and an unset value denies access to everyone rather than granting it to anyone.

No secret or service-role key is used anywhere in this project.

## Project structure

```
app/
  layout.tsx                    document shell, fonts, metadata
  globals.css                   Tailwind import and brand tokens
  (site)/                       public storefront, sharing one layout
    layout.tsx                  navigation bar and footer
    page.tsx                    home page
    login/                      sign-in
    account/                    protected account page
    auth/                       OAuth callback and error pages
    updates/                    public updates index and detail pages
  admin/                        internal area, separate chrome
    layout.tsx                  authorisation gate and admin navigation
    page.tsx                    dashboard
    updates/                    list, create and edit screens
components/
  Navbar.tsx, Hero.tsx, …       storefront sections
  admin/                        dashboard and editor components
  updates/                      public update rendering
lib/
  site.ts                       verified brand facts
  auth-user.ts                  narrow user projection for client components
  auth-actions.ts               sign-out
  supabase/                     browser, server and middleware clients
  admin/                        authorisation gate and metrics
  updates/                      queries, server actions, slug and types
supabase/
  schema.sql                    tables, policies, storage bucket
public/images/                  brand photography
design-references/              design inspiration, intentionally not served
middleware.ts                   refreshes the Supabase session per request
```

The `(site)` route group exists so that the storefront's navigation bar and footer apply
to public pages only. Because a nested layout cannot remove a parent's chrome, the admin
area needs its own top-level layout. The parentheses do not appear in any URL.

`design-references/` sits outside `public/` on purpose. Anything inside `public/` is
served at a public URL, and the design reference contains placeholder branding, an
invented price and a fictitious shipping promise. It must never be reachable on the live
domain.

## Architecture

### Authentication

Sign-in uses Supabase Auth with Google as the only provider. The redirect target is
derived from the live origin at call time, so the same code works on localhost, on
preview deployments and on the production domain without hard-coded hosts.

`middleware.ts` refreshes the Supabase session cookie on every request, which is what
keeps a session valid across navigation and page refresh. Static assets are excluded from
the matcher.

Every check that decides access calls `supabase.auth.getUser()`, which revalidates the
token with Supabase. `getSession()` is never used for authorisation, because it reads the
cookie without verifying it.

### Administrator authorisation

Access to `/admin` is gated in three independent places:

1. **The admin layout** verifies the caller before rendering any part of the subtree.
2. **Every server action** re-verifies on its own. Server actions are publicly reachable
   endpoints, so a layout check does not protect them.
3. **Row Level Security** is the final authority at the database.

An unauthenticated visitor is redirected to sign in. An authenticated user who is not the
administrator receives a plain access-denied page that reveals nothing about who the
administrator is. Hiding the admin link in the navigation is a convenience, not a control.

Only a narrow projection of the user — display name, email and avatar URL — is passed from
the server to client components. The full Supabase user object, which carries identity
records and provider metadata, never enters the browser payload.

### Metrics

`lib/admin/metrics.ts` is the single source of every figure on the dashboard. Each metric
declares whether it is tracked; untracked metrics render as "Not tracked yet" alongside a
note naming the work that will supply them. No placeholder values are written into
components, and no analytics SDK or visitor tracking is installed.

At present the content figures are real and derived from the database. Commerce, customer,
conversion, product and operations figures are placeholders awaiting the systems that will
produce them.

## Data model

### Tables

**`updates`** — `id`, `title`, `slug`, `description`, `status` (`draft` or `published`),
`created_at`, `updated_at`, `published_at`.

**`update_images`** — `id`, `update_id`, `storage_path`, `alt_text`, `sort_order`,
`width`, `height`, `created_at`. Deleting an update cascades to its image records.

Image dimensions are captured in the browser at upload time so that `next/image` can
reserve the correct aspect ratio. This is what allows each image to render at its natural
proportions without cropping or layout shift.

### Publishing behaviour

A slug is generated from the title when an update is first created and then fixed
permanently. Editing a title never changes the URL, so links shared previously continue to
resolve. Collisions are resolved by the database's unique constraint rather than by
checking in advance, which keeps concurrent creation safe.

`published_at` is set the first time an update is published and retained thereafter, so
unpublishing and republishing does not make older content appear new.

Body text is stored and rendered as plain text, split into paragraphs on blank lines. It is
never inserted as HTML, so stored content cannot introduce markup or scripts.

### Row Level Security and storage

RLS is enabled on both tables. Anonymous readers may select published updates and their
images; the administrator may read and write everything. Drafts are therefore invisible to
the public at the database level, not merely filtered in the interface.

The `update-images` bucket is private. Public pages render images through short-lived
signed URLs generated on the server, and the storage read policy matches an object only
while it belongs to a published update. Unpublishing an update immediately revokes the
ability to sign its images.

One consequence is worth stating plainly: because signing is authorised through the same
read policy, a holder of the publishable key can also read those objects directly without
a signature. This applies solely to images of **published** updates, which are public
content by definition. Draft images can be neither read nor signed. Making signatures
strictly mandatory would require signing with a service-role key, which this project does
not use.

Uploads are written to a temporary path and are recorded in `update_images` only when the
update is saved, so an unsaved upload belongs to no published update and is unreachable.

Deleting an update removes the database record first and then clears its storage objects
on a best-effort basis. Should storage cleanup fail, the result is an unreferenced file
rather than a live page pointing at missing images.

## Design system

Brand tokens are defined in `app/globals.css` under `@theme` and derived from the logo:

| Token | Value | Use |
| --- | --- | --- |
| `--color-navy` | `#030e29` | Primary background, sampled from the logo |
| `--color-navy-soft` | `#0b1a3a` | Raised surfaces |
| `--color-cream` | `#f5f1e8` | Warm off-white content background |
| `--color-orange` | `#f26b1d` | Primary accent and calls to action |
| `--color-flame` | `#ffc13b` | Highlight |
| `--color-blue` | `#1e6bff` | Secondary accent |
| `--color-ink` | `#0a1020` | Body text on light surfaces |

`ahcd-logo.png` has an opaque `#030e29` background rather than transparency. The navy
token matches it exactly, so the logo reads as a clean crest wherever it appears on a navy
surface.

The public site and the admin area follow deliberately different rules. Public pages carry
the full brand identity: condensed display type, the navy and cream palette, and generous
editorial spacing. The admin area is a plain internal tool — dense tables, compact cards,
ordinary interface typography and restrained accents — because legibility and speed matter
more there than presentation.

## Image handling

Each photograph is framed around its own subject rather than forced into a shared crop:

| Image | Dimensions | Treatment |
| --- | --- | --- |
| `ahcd-product-jar.jpg` | 1280 × 617 | Framed at its native ratio with `object-contain`, so neither the jar nor the labelled lid is ever cut |
| `ali-founder-with-jar.jpg` | 1280 × 1707 | Portrait only; any landscape crop would remove either Ali's face or the jars |
| `ahcd-tikka-ramen.png` | 1222 × 880 | Wide band trimming only tablecloth, keeping both dishes in frame at every width |
| `ahcd-avocado-egg-toast.png` | 1154 × 880 | Near-native 4:3, anchored left so the jar at the frame's edge survives |
| `ahcd-eggs-and-rice.png` | 1594 × 1602 | Square, with the focal point shifted slightly downwards to centre the bowl |

Images attached to updates are rendered at their stored intrinsic dimensions, so they
appear at their true proportions rather than being cropped to a uniform shape.

## Content policy

Everything published on the public site is something AHCD can stand behind.

The storefront deliberately states no price, jar size, heat level, ingredient list,
nutritional information, allergen declaration, shelf life, shipping or returns terms,
product variants, stock level, review, rating, customer count, certification, award or
founding date. The only contact channel shown is the brand's Instagram account.

Verified brand facts are centralised in `lib/site.ts`. Claims should be added there, and
to the relevant section, only once they are true.

## Deployment

The application is hosted on Vercel and deploys automatically when `main` is updated.

Before the first deployment, add all three environment variables in **Settings →
Environment Variables** for the Production, Preview and Development environments. They are
read at build time, so a deployment created before they were added must be rebuilt.

In the Supabase dashboard, under **Authentication → URL Configuration**, set the site URL
to the production origin and add every origin the application is served from — local
development, the Vercel domain and the custom domain — to the redirect allow list.

In Google Cloud, the authorised redirect URI points at Supabase, not at this application,
and therefore does not change when the site's domain changes.

## Licence

The source code is released under the MIT Licence; see [LICENSE](LICENSE).

The AHCD name, logo and photography are not covered by that licence and remain the
property of Ali Khandwalla.
