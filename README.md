# Ali's Heat Crunch Delight

**[alisheatcrunchdelight.com](https://alisheatcrunchdelight.com)**

A custom website and operations platform built for **Ali's Heat Crunch Delight (AHCD)**,
a real homemade chilli oil business. Ali makes the oil in small batches at home and sells
it in person at markets around Houston.

This is not a template or a demo. It was built for a working family business that needed
somewhere to point customers, a way to announce which markets they will be at, and a
private place to manage all of it without touching code. Everything on the site — the
photography, the copy, the products, the prices — is real.

**The site is deliberately browse-only.** The family has not authorised online payments,
and there is no cart, checkout, order submission or payment integration anywhere in the
codebase. Prices are shown because they are what you pay in person.

Built with Next.js and Supabase, deployed on Vercel, with transactional email through
Resend.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Limitations](#limitations)
- [Content policy](#content-policy)
- [Licence](#licence)

## Features

**Public storefront.** A responsive, product-focused landing page built around real
photography: a split hero, product detail, serving suggestions and the founder's story.
No account is needed to browse.

**Product catalogue.** Three products — the original chilli oil, Mediterranean Crunch and
a T-shirt — each with its own page, price, description, photography and social preview
image. The catalogue is stored in Supabase and edited from the admin area; changes appear
publicly with no redeployment.

**Authentication.** Google sign-in through Supabase Auth. Sessions persist across
navigation and refresh, and the navigation bar reflects the signed-in state on desktop
and mobile. Sessions are revalidated against Supabase rather than trusted from a cookie.

**Account area.** A protected page at `/account` showing the signed-in user's Google
profile.

**Administration.** A dashboard at `/admin` restricted to a single administrator,
presenting business metrics grouped by commerce, customers, conversion, products,
operations and content. **Figures with no data source behind them are labelled as such**
rather than populated with invented values.

**Product management.** Products are created and edited at `/admin/products`: names,
copy, prices, photographs with alt text, display order, informational details such as
T-shirt sizes, and published / hidden / archived visibility. Unpublished products can be
previewed before going live.

**News & Events.** A publishing system for posting news. Each update has a title, body,
ordered images, a category (market event, product launch or announcement) and a draft or
published status. Market events carry optional date, time and venue details shown in
Houston local time, correct across daylight-saving boundaries, and one update may be
featured. Drafts are visible only to the administrator.

**Newsletter.** Double opt-in signup on the homepage and the Updates page. Visitors give
an email address and explicit consent, receive a confirmation link that expires in 24
hours and works once, and become subscribers only after clicking it. Resend is
authoritative for subscription status; Supabase holds only unconfirmed requests. The
administrator can preview any published update as a branded email and send it to
themselves. **Broadcasting to subscribers is not implemented.**

## Technology

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org) (App Router, React Server Components) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4 with CSS custom properties |
| Fonts | `next/font/google` — Anton for display, Inter for body |
| Authentication | Supabase Auth with Google OAuth |
| Database | Supabase Postgres with Row Level Security |
| File storage | Supabase Storage (private buckets, signed URLs) |
| Email | [Resend](https://resend.com) transactional email on a sending subdomain |
| DNS and inbound mail | Cloudflare, including Email Routing |
| Hosting | Vercel |
| Tests | Node's built-in test runner — no test dependency |

The project deliberately uses no UI component library. The interface is small enough that
Tailwind and semantic HTML are simpler and ship fewer dependencies. Native elements are
preferred throughout — keyboard accessibility in menus and dialogs is handled directly
rather than through a library.

The `server-only` package marks modules that must never be bundled for the browser. An
accidental client-side import of the administrator gate is a build failure rather than a
silent credential leak.

## Getting started

### Prerequisites

- Node.js 20 or newer
- A Supabase project
- A Resend account and a verified sending domain, if you want the newsletter

### Installation

```bash
npm install
```

### Configure environment variables

Copy [`.env.example`](.env.example) to `.env.local` and fill it in. Every variable, what
it does and where it comes from is documented in
[DEPLOYMENT.md](DEPLOYMENT.md#environment-variables).

Never commit `.env.local`. It is gitignored, and no real credential belongs in any
tracked file.

### Set up the database

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor, then generate
the newsletter signup secret:

```bash
npm run newsletter:secret
```

Full instructions, including the authentication and storage configuration, are in
[DEPLOYMENT.md](DEPLOYMENT.md#supabase).

### Run the development server

```bash
npm run dev
```

> **Do not run `npm run build` while the development server is running.** Both write to
> `.next`, and the result is a corrupted build directory. If it happens, stop the server,
> delete `.next`, and start again.

### Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve a production build |
| `npm run lint` | Run ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run the automated tests |
| `npm run newsletter:secret` | Generate the newsletter signup secret and its database hash |
| `npm run images:optimise` | Convert oversized PNG photographs to WebP |

## Testing

```bash
npm test
```

Node's built-in test runner, no test dependency. Four suites live in [`tests/`](tests).

**Always run, no setup:**

- **`newsletter.logic.test.ts`** — `NEWSLETTER_ENABLED` parsing (including that every
  ambiguous value fails closed), token generation and hashing, email validation.
- **`content.logic.test.ts`** — update slugs, event times across a daylight-saving
  boundary, the product catalogue, and a guard asserting no payment dependency has crept
  in. It also checks every product photograph referenced in code exists on disk, which is
  what catches a renamed image.

**Opt-in, because they need something running:**

- **`newsletter.rpc.test.ts`** and **`newsletter.security.test.ts`** — the confirmation
  lifecycle and the signup function's defences, against a real database. Enable with
  `NEWSLETTER_RPC_TESTS=1`. They send no email and call no email provider, and every
  fixture uses a unique `.invalid` address that can never be delivered to.
- **`routes.smoke.test.ts`** — every public route renders, admin routes serve nothing to a
  signed-out visitor, the security headers are present, no secret appears in the markup,
  and the site offers no way to buy anything. Needs a running server:

  ```bash
  npm run build
  npm start
  SMOKE_BASE_URL=http://localhost:3000 npm test
  ```

## Project structure

```
app/
  (site)/          Public pages: home, products, updates, privacy, account, newsletter
  admin/           Administrator-only dashboard, products, updates, newsletter
  auth/            OAuth callback and error handling
  og/              Stable image proxy routes for social cards
  robots.ts        Crawler directives
  sitemap.ts       Database-driven sitemap
components/        Presentational and interactive components
lib/
  admin/           Authorisation gate and metrics
  newsletter/      Config, tokens, Resend client, actions, email templates
  products/        Queries, admin queries, actions, types
  supabase/        Browser and server clients
  updates/         Queries, actions, slugs, timezone handling
scripts/           Operational scripts (signup secret, image conversion)
supabase/
  schema.sql       Complete database baseline
  migrations/      Ordered, additive, idempotent changes
tests/             Automated tests
public/images/     The family's own photography
```

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — how the application is put together: the
  authentication model, administrator authorisation, the data model, Row Level Security
  and storage, the design system and image handling.
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Vercel, Supabase, Cloudflare and Resend setup,
  environment variables, and the release checklist.
- **[CHANGELOG.md](CHANGELOG.md)** — release history.

### Why the newsletter needs two Resend keys

Resend API keys have exactly two permission levels — `sending_access` and `full_access` —
with no contacts-only scope. A sending key genuinely cannot manage contacts; the API
replies *"This API key is restricted to only send emails"*.

So the project uses both: `RESEND_API_KEY` (`sending_access`) for the confirmation and
test emails, and `RESEND_CONTACTS_API_KEY` (`full_access`) for creating and counting
subscribers. Splitting them keeps the key exercised on every public signup at least
privilege; the powerful key is only used at confirmation time and by the admin dashboard.

**Public signups stay disabled until the full-access key is set.** Without it a visitor
could confirm and still not become a subscriber, which is worse than saying signups
aren't open yet.

## Limitations

Honest scope boundaries, not bugs:

- **No online payments, cart, checkout or order submission.** Deliberately excluded at the
  business owners' decision. A Square integration is *planned* for a future phase; the
  data model leaves room for it, but nothing is implemented.
- **No shipping.** Prices are what you pay in person.
- **No newsletter broadcasts.** Subscribers can be collected and previewed; no sending
  code path exists. Before broadcasts could be enabled, the family would need to approve
  the sender identity and supply a business postal address, which commercial email law
  requires in the footer.
- **No automated coverage of signed-in administrator behaviour**, because the test runner
  has no Google session. The authorisation boundary is tested from the outside; the
  behaviour behind it is not.
- **A fresh install from `schema.sql` has not been executed** against an empty project.
  Object parity with the migrations is verified; the run itself is not.
- **The administrator's email is hard-coded in `supabase/schema.sql`.** It is an
  identifier rather than a credential — authorisation still requires a verified Google
  session for that account — but moving it into configuration is
  [planned](DEPLOYMENT.md#planned-improvement-move-the-administrator-email-out-of-the-schema).
- **The Content Security Policy allows `'unsafe-inline'` for scripts.** Next.js injects
  inline bootstrap scripts, and the strict alternative is per-request nonces, which needs
  middleware. It does not stop injected inline script.
- **Abuse protection has a known ceiling.** Per-address throttling and global signup caps
  are enforced in the database, but a distributed bot using many different addresses could
  still trigger confirmation emails up to the daily cap. Blocking that properly needs
  IP-based limiting, which would mean storing personal data the privacy notice says is not
  collected.

## Content policy

Everything on the site is real. Product names, prices, descriptions and photographs come
from the business. Nothing about ingredients, sourcing, shipping, reviews or availability
is invented, and no generated imagery stands in for the family's own photographs.

Where information does not exist yet, the site says so plainly rather than filling the
space — the same rule the admin dashboard follows for metrics it cannot measure.

The site deliberately states no jar size, heat level, ingredient list, nutritional
information, allergen declaration, shelf life, shipping or returns terms, stock level,
review, rating, customer count, certification, award or founding date. Prices are shown
because they are what you pay in person. The only contact channel published is the
brand's Instagram account.

Verified brand facts are centralised in [`lib/site.ts`](lib/site.ts). A claim belongs
there, and in the relevant section, only once it is true.

## Licence

The source code is released under the MIT Licence; see [LICENSE](LICENSE).

The AHCD name, logo and photography are **not** covered by that licence and remain the
property of Ali Khandwalla.
