# Architecture

How AHCD is put together, and why. The [README](README.md) is the front door;
this is the detail behind it.

For hosting, DNS and email setup, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

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

**`products`** — `id`, `slug`, `name`, `summary`, `description`, `about`, `price_cents`,
`currency`, `visibility` (`published`, `hidden` or `archived`), `sort_order`,
`media_padding`, `details` (JSONB), `created_at`, `updated_at`.

**`product_images`** — `id`, `product_id`, `source`, `path`, `alt_text`, `sort_order`,
`width`, `height`, `created_at`. Deleting a product cascades to its image records.

`product_images.source` distinguishes the two kinds of photograph. `local` means a file
committed to `public/images` and referenced by path — the three original product photos
are stored this way and are never re-uploaded or deleted. `storage` means an object in the
private `product-images` bucket, uploaded through the admin and served via a signed URL.

### The Supabase / Square boundary

Supabase owns **website editorial content**: slug, name, summary, description, the
"what it's like" paragraph, images, alt text, display order, visibility, and informational
details such as T-shirt sizes.

Square, if it is connected later, would own **commercial data**: price, SKU, inventory and
tax.

`products.price_cents` is the single field that would migrate. It is stored as integer
minor units — the same shape Square uses — and is read only through `formatPrice()`, so
handing pricing over means changing where that one value comes from rather than reworking
the interface. Do not add a second price column or cache Square prices in Supabase, or the
two systems will disagree. **No Square code exists in this project.**

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
| `ahcd-tikka-ramen.webp` | 1222 × 880 | Wide band trimming only tablecloth, keeping both dishes in frame at every width |
| `ahcd-avocado-egg-toast.webp` | 1154 × 880 | Near-native 4:3, anchored left so the jar at the frame's edge survives |
| `ahcd-eggs-and-rice.webp` | 1594 × 1602 | Square, with the focal point shifted slightly downwards to centre the bowl |

Images attached to updates are rendered at their stored intrinsic dimensions, so they
appear at their true proportions rather than being cropped to a uniform shape.
