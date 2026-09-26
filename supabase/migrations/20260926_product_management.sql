-- ============================================================================
-- AHCD — Product management
--
-- Run once in the Supabase SQL Editor. Additive and safe to re-run: nothing is
-- dropped, no existing table is recreated, and the product seed uses
-- ON CONFLICT DO NOTHING so re-running never duplicates or overwrites a row.
--
-- The `updates` / `update_images` tables and their policies are NOT touched.
--
-- ----------------------------------------------------------------------------
-- SOURCE-OF-TRUTH BOUNDARY (important for the eventual Square integration)
--
--   Supabase owns WEBSITE EDITORIAL CONTENT:
--     slug, name, summary, description, about, images, alt text,
--     display order, visibility, informational details (e.g. T-shirt sizes)
--
--   Square will eventually own COMMERCIAL DATA:
--     price, SKU, inventory, tax
--
-- `products.price_cents` is the single field that migrates to Square. Until
-- that integration exists, Supabase is authoritative for price. Keep it that
-- way: do not add a second price column or cache Square prices here, or the
-- two systems will disagree.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text        not null unique,
  name          text        not null,
  summary       text        not null default '',
  description   text        not null default '',
  about         text        not null default '',
  -- MIGRATES TO SQUARE. Integer minor units, matching Square's money shape.
  price_cents   integer     not null default 0 check (price_cents >= 0),
  currency      text        not null default 'USD',
  visibility    text        not null default 'published'
                            check (visibility in ('published', 'hidden', 'archived')),
  sort_order    integer     not null default 0,
  media_padding text        not null default 'default'
                            check (media_padding in ('tight', 'default')),
  -- Short ordered list, e.g. [{"label":"Sizes","value":"Small, Medium, Large, XL"}].
  -- JSONB rather than a table: always edited with the product, never queried alone.
  details       jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid        not null references public.products(id) on delete cascade,
  -- 'local'   -> `path` is a public repo path such as /images/ahcd-jar.png
  -- 'storage' -> `path` is an object key in the private product-images bucket
  source     text        not null default 'storage'
                         check (source in ('local', 'storage')),
  path       text        not null,
  alt_text   text,
  sort_order integer     not null default 0,
  -- Captured at upload so next/image reserves the right aspect ratio.
  width      integer,
  height     integer,
  created_at timestamptz not null default now()
);

create index if not exists products_visibility_sort_idx
  on public.products (visibility, sort_order, created_at);

create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order);

-- Reuses the trigger function created by the base schema.
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security — reuses the existing public.is_ahcd_admin()
-- ----------------------------------------------------------------------------

alter table public.products       enable row level security;
alter table public.product_images enable row level security;

drop policy if exists "published products are readable by anyone" on public.products;
create policy "published products are readable by anyone"
  on public.products for select
  using (visibility = 'published');

drop policy if exists "admin reads all products" on public.products;
create policy "admin reads all products"
  on public.products for select
  using (public.is_ahcd_admin());

drop policy if exists "admin writes products" on public.products;
create policy "admin writes products"
  on public.products for all
  using (public.is_ahcd_admin())
  with check (public.is_ahcd_admin());

drop policy if exists "images of published products are readable" on public.product_images;
create policy "images of published products are readable"
  on public.product_images for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.visibility = 'published'
    )
  );

drop policy if exists "admin reads all product images" on public.product_images;
create policy "admin reads all product images"
  on public.product_images for select
  using (public.is_ahcd_admin());

drop policy if exists "admin writes product images" on public.product_images;
create policy "admin writes product images"
  on public.product_images for all
  using (public.is_ahcd_admin())
  with check (public.is_ahcd_admin());

-- ----------------------------------------------------------------------------
-- Storage: private bucket for newly uploaded product photographs
--
-- The three original product photos stay in the repo under public/images and
-- are referenced with source = 'local'. Only new uploads land here.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do update set public = false;

-- Readable (and therefore signable) only while attached to a PUBLISHED product,
-- so hiding or archiving a product immediately stops its photos being served.
drop policy if exists "read images of published products" on storage.objects;
create policy "read images of published products"
  on storage.objects for select
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.product_images pi
      join public.products p on p.id = pi.product_id
      where pi.source = 'storage'
        and pi.path = storage.objects.name
        and p.visibility = 'published'
    )
  );

drop policy if exists "admin reads product images" on storage.objects;
create policy "admin reads product images"
  on storage.objects for select
  using (bucket_id = 'product-images' and public.is_ahcd_admin());

drop policy if exists "admin uploads product images" on storage.objects;
create policy "admin uploads product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_ahcd_admin());

drop policy if exists "admin replaces product images" on storage.objects;
create policy "admin replaces product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_ahcd_admin())
  with check (bucket_id = 'product-images' and public.is_ahcd_admin());

drop policy if exists "admin deletes product images" on storage.objects;
create policy "admin deletes product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_ahcd_admin());

-- ----------------------------------------------------------------------------
-- Seed the three existing products
--
-- Values copied verbatim from the previous lib/products.ts so public URLs,
-- copy, prices and photographs are unchanged. ON CONFLICT DO NOTHING means a
-- re-run is a no-op and never overwrites edits made in the admin.
-- ----------------------------------------------------------------------------

insert into public.products
  (slug, name, summary, description, about, price_cents, currency,
   visibility, sort_order, media_padding, details)
values
  (
    'original',
    'Ali''s Heat Crunch Delight',
    'The original — bold heat, serious crunch.',
    'The original AHCD homemade chilli oil — bold heat, serious crunch, and made in small batches.',
    'This is the jar AHCD started with. Ali makes it at home in small batches and fills and labels the jars by hand, so no two runs are ever quite identical. It''s built to go on top of food you''re already cooking — eggs, rice, noodles, whatever''s in front of you.',
    1200, 'USD', 'published', 0, 'tight', '[]'::jsonb
  ),
  (
    'mediterranean',
    'Mediterranean Crunch',
    'Our signature heat and crunch, Mediterranean-inspired.',
    'A Mediterranean-inspired take on AHCD, combining our signature heat and crunch with Mediterranean flavors.',
    'A newer addition to the range, taking the same heat and crunch in a Mediterranean-inspired direction. Made the same way as the original — small batches, jarred by hand. We haven''t photographed this one yet, so the crest is standing in until we do.',
    1500, 'USD', 'published', 1, 'default', '[]'::jsonb
  ),
  (
    't-shirt',
    'Ali''s Heat Crunch T-Shirt',
    'Official AHCD T-shirt featuring the brand crest.',
    'Official Ali''s Heat Crunch Delight T-shirt featuring the AHCD brand.',
    'The same crest that''s on every jar, printed on a black tee. It''s for anyone who wants to carry a bit of AHCD around with them, and it''s how you''ll spot us at a market. Available in Small, Medium, Large and XL.',
    2500, 'USD', 'published', 2, 'tight',
    '[{"label":"Sizes","value":"Small, Medium, Large, XL"}]'::jsonb
  )
on conflict (slug) do nothing;

-- Attach the existing repo images. Mediterranean intentionally has none, so the
-- branded placeholder keeps rendering until a real photo is uploaded.
insert into public.product_images
  (product_id, source, path, alt_text, sort_order, width, height)
select p.id, 'local', v.path, v.alt_text, 0, v.width, v.height
from (values
  ('original',
   '/images/ahcd-jar.png',
   'A jar of Ali''s Heat Crunch Delight chilli oil, filled with chilli in oil and labelled with the AHCD crest.',
   1254, 1254),
  ('t-shirt',
   '/images/ahcd-shirt.png',
   'A black Ali''s Heat Crunch Delight T-shirt printed with the AHCD crest and the words Homemade Chilli Oil.',
   1086, 1448)
) as v(slug, path, alt_text, width, height)
join public.products p on p.slug = v.slug
where not exists (
  select 1 from public.product_images existing
  where existing.product_id = p.id
);
