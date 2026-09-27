# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-09-27

First public release. Phase 1 of the AHCD platform: a production website and a private
operations area for a real homemade chilli oil business.

### Added

**Landing page.** Responsive product-focused homepage built around the family's own
photography, with navigation, food gallery, updates strip and footer. Open Graph metadata
for social sharing.

**Authentication.** Google sign-in through Supabase Auth, with a callback route, session
persistence via cookies, sign-out, and a personal account page. Sessions are validated
against Supabase on every request rather than trusted from a cookie.

**Administration.** A single-administrator area at `/admin`, authorised by verified email.
Every page and every server action re-checks authorisation independently.

**Updates publishing.** Draft and published states, editing, deletion, image galleries
backed by private Supabase Storage, and automatic appearance on the public site.

**Product catalogue.** Three products with prices, descriptions, photography and
individual pages. Browse-only by design — see *Not included* below.

**News & Events.** Categories, filtering, structured event details with venue and
address, correct timezone handling across daylight-saving boundaries, expired-event
behaviour, and a featured update enforced as at most one by a database index.

**Business dashboard.** Supabase-backed product management — create, edit, reorder,
publish, hide, archive — with image management and real metrics. Figures with no data
source behind them say so explicitly rather than displaying a misleading zero.

**Newsletter.** Public signup with explicit consent, double opt-in over single-use hashed
tokens, confirmation email through Resend, consent evidence stored on the Resend contact,
subscriber counts in the admin area, and branded email previews. Broadcast sending is not
implemented.

**Documentation.** [README](README.md), [ARCHITECTURE.md](ARCHITECTURE.md),
[DEPLOYMENT.md](DEPLOYMENT.md), a complete `supabase/schema.sql` baseline, and a migration
history.

**Tests.** 73 automated tests using Node's built-in runner and no test dependency. Pure
logic always runs; database and live-site suites are opt-in.

### Security

- Row Level Security on every table, with no public policies on subscriber data. The
  application reaches restricted tables only through `SECURITY DEFINER` functions with a
  pinned `search_path`. **No service-role key exists anywhere in the project.**
- The newsletter signup function is bound to the server by a shared secret. The
  publishable key is in the client bundle by design, so without this anyone could call the
  function directly and bypass the consent checkbox, honeypot and fill-time checks.
- Per-address throttling plus separate hourly and daily signup caps, enforced in the
  database rather than in application code. No IP address is recorded or trusted.
- Confirmation is ordered peek → create contact → consume, so a provider failure leaves
  the link usable instead of burning it. Consumption is atomic and single-use.
- Administrative cleanup of expired confirmations is a function with a fixed predicate
  rather than a DELETE policy, so it cannot reach a subscriber who is still waiting.
- Content Security Policy, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
  and `Permissions-Policy`; `X-Powered-By` disabled.
- Admin pages gate themselves. Layouts and pages render in parallel in the App Router, so
  a layout's redirect does not stop a page component executing.
- `robots.txt` and a database-driven `sitemap.xml` that can only list published content.

### Not included

Deliberately out of scope for Phase 1, at the business owners' decision:

- **Online payments** — no Stripe, Square, or any payment integration
- **Online ordering, shopping cart or checkout**
- **Shipping** — prices shown are what you pay in person
- **Newsletter broadcasts** — subscriber collection works; no sending code exists

A Square integration is planned for a future phase. The data model reserves room for it,
but nothing is implemented.

### Known limitations

- A fresh install from `supabase/schema.sql` has not been executed against an empty
  project; object parity with the migrations is verified, the run itself is not.
- Signed-in administrator behaviour has no automated coverage, because the test runner has
  no Google session.
- Two dependency advisories remain, both requiring Next.js 16 to clear. Exploiting either
  requires untrusted CSS to be processed at build time, which does not happen here.
- The Content Security Policy allows `'unsafe-inline'` for scripts. Next.js injects inline
  bootstrap scripts and the strict alternative is per-request nonces, which needs
  middleware. The policy does not stop injected inline script.
- Email authentication is configured — SPF, DKIM and DMARC. The DMARC policy is
  `p=none` with no reporting address, so it monitors nothing yet; adding `rua=` and then
  tightening the policy is future work.
- The administrator's email address is hard-coded in `supabase/schema.sql` inside
  `is_ahcd_admin()`, and the repository is public. It is an identifier rather than a
  credential, but moving it to configuration is a planned improvement.

[1.0.0]: https://github.com/AliKhandwalla/ahcd-store/releases/tag/v1.0.0
