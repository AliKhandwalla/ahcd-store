-- ============================================================================
-- AHCD — complete database baseline
--
-- Running this file on an EMPTY project reproduces the current production
-- schema in full. Running it on an EXISTING project is a no-op: every
-- statement is guarded, no row is deleted or rewritten, and every function is
-- replaced with the definition already in use.
--
-- This file and supabase/migrations/ describe the same end state by two
-- routes. A new project needs only this file. An existing project takes the
-- migrations in filename order. Neither is a substitute for the other's
-- history, and both are kept in step.
--
-- Contents
--   1. Updates and their images
--   2. Shared functions and Row Level Security
--   3. Products and their images
--   4. Newsletter: pending confirmations and server configuration
--   5. Seed data
--
-- Two things are NOT here because they are deliberately outside version
-- control: the administrator's email, which is written into is_ahcd_admin()
-- below and must match the ADMIN_EMAIL environment variable, and the
-- newsletter signup secret, which the operator generates and stores in
-- app_config (see the README).
-- ============================================================================

-- ============================================================================
-- AHCD — Updates publishing schema
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
--
-- No service-role key is used by the application. All access from the app goes
-- through the publishable key plus the signed-in user's session, so RLS below
-- is the real security boundary.
-- ============================================================================

-- The single admin. Must match the ADMIN_EMAIL server environment variable.
-- Change in both places if the admin ever changes.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.updates (
  id             uuid primary key default gen_random_uuid(),
  title          text        not null,
  slug           text        not null unique,
  description    text        not null,
  status         text        not null default 'draft'
                             check (status in ('draft', 'published')),
  -- News & events (see supabase/migrations/20260925_news_and_events.sql, which
  -- adds these to an existing database without touching its rows).
  category       text        not null default 'announcement'
                             check (category in ('market-event',
                                                 'product-launch',
                                                 'announcement')),
  event_start_at timestamptz,
  event_end_at   timestamptz,
  venue_name     text,
  venue_address  text,
  is_featured    boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  published_at   timestamptz,
  constraint updates_event_range_check check (
    event_end_at is null
    or event_start_at is null
    or event_end_at >= event_start_at
  )
);

create table if not exists public.update_images (
  id           uuid primary key default gen_random_uuid(),
  update_id    uuid        not null references public.updates(id) on delete cascade,
  storage_path text        not null,
  alt_text     text,
  sort_order   integer     not null default 0,
  -- Captured in the browser at upload time so next/image can reserve the correct
  -- aspect ratio. Nullable: the UI falls back to a contained frame when absent.
  width        integer,
  height       integer,
  created_at   timestamptz not null default now()
);

create index if not exists updates_status_published_at_idx
  on public.updates (status, published_at desc);

create index if not exists update_images_update_id_sort_idx
  on public.update_images (update_id, sort_order);

create index if not exists updates_category_published_idx
  on public.updates (category, published_at desc);

create index if not exists updates_event_start_idx
  on public.updates (event_start_at)
  where event_start_at is not null;

-- At most one featured update, guaranteed by the database rather than the UI.
create unique index if not exists updates_single_featured_idx
  on public.updates (is_featured)
  where is_featured;

-- Keep updated_at honest.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists updates_set_updated_at on public.updates;
create trigger updates_set_updated_at
  before update on public.updates
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.updates       enable row level security;
alter table public.update_images enable row level security;

-- True only for the single admin, based on the verified email in the JWT.
create or replace function public.is_ahcd_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'khandwallaali@gmail.com';
$$;

-- --- updates -----------------------------------------------------------------

drop policy if exists "published updates are readable by anyone" on public.updates;
create policy "published updates are readable by anyone"
  on public.updates for select
  using (status = 'published');

drop policy if exists "admin reads all updates" on public.updates;
create policy "admin reads all updates"
  on public.updates for select
  using (public.is_ahcd_admin());

drop policy if exists "admin inserts updates" on public.updates;
create policy "admin inserts updates"
  on public.updates for insert
  with check (public.is_ahcd_admin());

drop policy if exists "admin updates updates" on public.updates;
create policy "admin updates updates"
  on public.updates for update
  using (public.is_ahcd_admin())
  with check (public.is_ahcd_admin());

drop policy if exists "admin deletes updates" on public.updates;
create policy "admin deletes updates"
  on public.updates for delete
  using (public.is_ahcd_admin());

-- --- update_images -----------------------------------------------------------

drop policy if exists "images of published updates are readable" on public.update_images;
create policy "images of published updates are readable"
  on public.update_images for select
  using (
    exists (
      select 1 from public.updates u
      where u.id = update_images.update_id
        and u.status = 'published'
    )
  );

drop policy if exists "admin reads all images" on public.update_images;
create policy "admin reads all images"
  on public.update_images for select
  using (public.is_ahcd_admin());

drop policy if exists "admin writes images" on public.update_images;
create policy "admin writes images"
  on public.update_images for all
  using (public.is_ahcd_admin())
  with check (public.is_ahcd_admin());

-- ----------------------------------------------------------------------------
-- Storage: private bucket + signed URLs
-- ----------------------------------------------------------------------------

-- public = false: nothing is reachable by raw URL. The app mints short-lived
-- signed URLs server-side, and signing is authorised by the SELECT policy below.
insert into storage.buckets (id, name, public)
values ('update-images', 'update-images', false)
on conflict (id) do update set public = false;

-- Anyone may read (and therefore sign) an object ONLY while it is attached to a
-- published update. Unpublishing an update immediately stops its images being
-- signable, and a file at a temporary path with no update_images row matches
-- nothing here, so it is unreachable by the public.
drop policy if exists "read images of published updates" on storage.objects;
create policy "read images of published updates"
  on storage.objects for select
  using (
    bucket_id = 'update-images'
    and exists (
      select 1
      from public.update_images ui
      join public.updates u on u.id = ui.update_id
      where ui.storage_path = storage.objects.name
        and u.status = 'published'
    )
  );

drop policy if exists "admin reads update images" on storage.objects;
create policy "admin reads update images"
  on storage.objects for select
  using (bucket_id = 'update-images' and public.is_ahcd_admin());

drop policy if exists "admin uploads update images" on storage.objects;
create policy "admin uploads update images"
  on storage.objects for insert
  with check (bucket_id = 'update-images' and public.is_ahcd_admin());

drop policy if exists "admin replaces update images" on storage.objects;
create policy "admin replaces update images"
  on storage.objects for update
  using (bucket_id = 'update-images' and public.is_ahcd_admin())
  with check (bucket_id = 'update-images' and public.is_ahcd_admin());

drop policy if exists "admin deletes update images" on storage.objects;
create policy "admin deletes update images"
  on storage.objects for delete
  using (bucket_id = 'update-images' and public.is_ahcd_admin());

-- ############################################################################
-- 1b. Updates: News & Events columns
-- ############################################################################

-- ----------------------------------------------------------------------------
-- Columns
-- ----------------------------------------------------------------------------

alter table public.updates
  add column if not exists category       text not null default 'announcement',
  add column if not exists event_start_at timestamptz,
  add column if not exists event_end_at   timestamptz,
  add column if not exists venue_name     text,
  add column if not exists venue_address  text,
  add column if not exists is_featured    boolean not null default false;

-- Existing rows take the column default ('announcement') without being touched.

-- ----------------------------------------------------------------------------
-- Constraints (guarded so re-running is harmless)
-- ----------------------------------------------------------------------------

do $$
begin
  alter table public.updates
    add constraint updates_category_check
    check (category in ('market-event', 'product-launch', 'announcement'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.updates
    add constraint updates_event_range_check
    check (
      event_end_at is null
      or event_start_at is null
      or event_end_at >= event_start_at
    );
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

-- At most one featured update, guaranteed by the database rather than the UI.
create unique index if not exists updates_single_featured_idx
  on public.updates (is_featured)
  where is_featured;

create index if not exists updates_category_published_idx
  on public.updates (category, published_at desc);

create index if not exists updates_event_start_idx
  on public.updates (event_start_at)
  where event_start_at is not null;

-- ----------------------------------------------------------------------------
-- Classify the existing Bellaire market post
--
-- Targets one known slug and only reclassifies it while it still holds the
-- migration default, so this cannot overwrite a category chosen later in the
-- admin. A no-op if the post does not exist.
-- ----------------------------------------------------------------------------

update public.updates
   set category = 'market-event'
 where slug = 'ahcd-is-coming-to-the-bellaire-open-air-fall-market'
   and category = 'announcement';

-- ############################################################################
-- 3. Products and their images
-- ############################################################################

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
  -- 'local'   -> `path` is a public repo path such as /images/ahcd-jar.webp
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
   '/images/ahcd-jar.webp',
   'A jar of Ali''s Heat Crunch Delight chilli oil, filled with chilli in oil and labelled with the AHCD crest.',
   1254, 1254),
  ('t-shirt',
   '/images/ahcd-shirt.webp',
   'A black Ali''s Heat Crunch Delight T-shirt printed with the AHCD crest and the words Homemade Chilli Oil.',
   1086, 1448)
) as v(slug, path, alt_text, width, height)
join public.products p on p.slug = v.slug
where not exists (
  select 1 from public.product_images existing
  where existing.product_id = p.id
);

-- ############################################################################
-- 4a. Newsletter: pending confirmations
-- ############################################################################

-- ----------------------------------------------------------------------------

create table if not exists public.newsletter_pending (
  id              uuid primary key default gen_random_uuid(),
  -- Always stored lowercased by the application.
  email           text        not null unique,
  -- SHA-256 of the confirmation token. The raw token exists only in the
  -- emailed link, so a database leak cannot be used to confirm addresses.
  token_hash      text        not null,
  consent_version text        not null,
  consented_at    timestamptz not null default now(),
  expires_at      timestamptz not null,
  send_count      integer     not null default 1,
  last_sent_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists newsletter_pending_token_idx
  on public.newsletter_pending (token_hash);

create index if not exists newsletter_pending_expires_idx
  on public.newsletter_pending (expires_at);

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Enabled with NO public policies: nobody may read or write this table
-- directly, so subscriber addresses cannot be enumerated even with the
-- publishable key. The application reaches it only through the two
-- SECURITY DEFINER functions below.
--
-- The admin gets SELECT so the dashboard can count pending confirmations.
-- ----------------------------------------------------------------------------

alter table public.newsletter_pending enable row level security;

drop policy if exists "admin reads pending newsletter requests" on public.newsletter_pending;
create policy "admin reads pending newsletter requests"
  on public.newsletter_pending for select
  using (public.is_ahcd_admin());

-- ############################################################################
-- 4b. Newsletter: confirmation peek / consume
-- ############################################################################

-- ----------------------------------------------------------------------------
-- newsletter_peek — read without deleting
--
-- `language sql` rather than plpgsql, and the table aliased as `p`, so the
-- RETURNS TABLE output names cannot shadow the column names (a latent
-- ambiguity in the previous plpgsql version).
-- ----------------------------------------------------------------------------

create or replace function public.newsletter_peek(p_token_hash text)
returns table (email text, consent_version text, consented_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.email, p.consent_version, p.consented_at
  from public.newsletter_pending p
  where p.token_hash = p_token_hash
    and p.expires_at >= now();
$$;

-- ----------------------------------------------------------------------------
-- newsletter_consume — atomic single-use delete
--
-- A single DELETE ... RETURNING inside a CTE. Concurrent callers are
-- serialised by the row lock, so exactly one receives true and the others
-- receive false. Callers treat false as "someone else already finished this",
-- not as an error.
-- ----------------------------------------------------------------------------

create or replace function public.newsletter_consume(p_token_hash text)
returns table (consumed boolean)
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  with deleted as (
    delete from public.newsletter_pending
    where token_hash = p_token_hash
    returning 1
  )
  select count(*) > 0 from deleted;
$$;

-- ----------------------------------------------------------------------------
-- Retire the destructive RPC so no caller — including an old cached bundle —
-- can reach it again.
-- ----------------------------------------------------------------------------

drop function if exists public.newsletter_confirm(text);

revoke all on function public.newsletter_peek(text)    from public;
revoke all on function public.newsletter_consume(text) from public;

grant execute on function public.newsletter_peek(text)    to anon, authenticated;
grant execute on function public.newsletter_consume(text) to anon, authenticated;

-- ############################################################################
-- 4c. Newsletter: signup gating and rate limits
-- ############################################################################

-- ----------------------------------------------------------------------------
-- app_config — server-side configuration the application must not be able to
-- read or write through the public API.
--
-- RLS on with NO policies: unreadable and unwritable by anon, authenticated
-- and the admin alike. Only SECURITY DEFINER functions can see inside it.
-- ----------------------------------------------------------------------------

create table if not exists public.app_config (
  key        text primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Caps, seeded with conservative defaults. Raise them with an UPDATE if the
-- list genuinely grows; they are data, not code, so no deploy is needed.
--
--   signup_cap_hour   new pending rows accepted per rolling hour
--   signup_cap_day    new pending rows accepted per rolling day
--
-- The daily figure is the one that matters: it is the ceiling on confirmation
-- emails the site can be made to send in a day, so keep it comfortably below
-- the Resend plan's daily allowance.
insert into public.app_config (key, value)
values ('signup_cap_hour', '20'), ('signup_cap_day', '60')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- newsletter_request — now gated on a shared secret.
--
-- The old four-argument version is dropped at the end of this file, so there
-- is no ungated entry point left behind.
--
-- Returns should_send = false for every refusal — throttled, capped, or a bad
-- secret. The caller cannot tell which, and cannot tell any of them apart from
-- "this address was already pending", which is what stops the endpoint
-- revealing who is subscribed.
-- ----------------------------------------------------------------------------

create or replace function public.newsletter_request(
  p_email           text,
  p_token_hash      text,
  p_consent_version text,
  p_expires_at      timestamptz,
  p_app_secret      text
)
returns table (should_send boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email       text := lower(trim(p_email));
  v_expected    text;
  v_existing    public.newsletter_pending%rowtype;
  v_cap_hour    integer;
  v_cap_day     integer;
  v_count_hour  integer;
  v_count_day   integer;
begin
  -- --- shared secret ---------------------------------------------------
  -- sha256() is built into PostgreSQL 11+, so this needs no extension.
  select value into v_expected
  from public.app_config
  where key = 'newsletter_rpc_secret_sha256';

  -- Fail closed. An unconfigured secret refuses every request rather than
  -- falling back to the old ungated behaviour.
  if v_expected is null or p_app_secret is null then
    return query select false;
    return;
  end if;

  if encode(sha256(convert_to(p_app_secret, 'UTF8')), 'hex') <> v_expected then
    return query select false;
    return;
  end if;

  -- --- housekeeping ----------------------------------------------------
  delete from public.newsletter_pending where expires_at < now();

  -- --- caps -------------------------------------------------------------
  select coalesce(max(case when key = 'signup_cap_hour' then value::integer end), 20),
         coalesce(max(case when key = 'signup_cap_day'  then value::integer end), 60)
    into v_cap_hour, v_cap_day
  from public.app_config
  where key in ('signup_cap_hour', 'signup_cap_day');

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*) filter (where created_at > now() - interval '1 day')
    into v_count_hour, v_count_day
  from public.newsletter_pending;

  select * into v_existing
  from public.newsletter_pending
  where email = v_email;

  if found then
    -- Per-address throttle: a repeat within 10 minutes sends nothing, which
    -- prevents using the form to mail-bomb one person. Checked before the
    -- caps because refreshing an existing row creates no new row and so must
    -- not be blocked by a cap it does not contribute to.
    if v_existing.last_sent_at > now() - interval '10 minutes' then
      return query select false;
      return;
    end if;

    update public.newsletter_pending
       set token_hash      = p_token_hash,
           consent_version = p_consent_version,
           consented_at    = now(),
           expires_at      = p_expires_at,
           send_count      = v_existing.send_count + 1,
           last_sent_at    = now()
     where email = v_email;

    return query select true;
    return;
  end if;

  -- Caps apply only to genuinely new addresses.
  if v_count_hour >= v_cap_hour or v_count_day >= v_cap_day then
    return query select false;
    return;
  end if;

  insert into public.newsletter_pending
    (email, token_hash, consent_version, expires_at)
  values
    (v_email, p_token_hash, p_consent_version, p_expires_at);

  return query select true;
end;
$$;

-- ----------------------------------------------------------------------------
-- Retire the ungated four-argument version.
-- ----------------------------------------------------------------------------

drop function if exists public.newsletter_request(text, text, text, timestamptz);

revoke all on function
  public.newsletter_request(text, text, text, timestamptz, text) from public;
grant execute on function

-- ############################################################################
-- 4d. Newsletter: administrative cleanup
-- ############################################################################

create or replace function public.newsletter_prune_expired()
returns table (deleted integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  -- The authorisation check is inside the SECURITY DEFINER body, so it runs
  -- with the caller's JWT before any privileged work happens.
  if not public.is_ahcd_admin() then
    raise exception 'not authorised'
      using errcode = '42501';
  end if;

  with removed as (
    delete from public.newsletter_pending
    -- The ONLY predicate. Not parameterised, so it cannot be widened by a
    -- caller to reach a subscriber who is still legitimately pending.
    where expires_at < now()
    returning 1
  )
  select count(*)::integer into v_deleted from removed;

  return query select v_deleted;
end;
$$;

-- Not granted to anon: an expired-row sweep is administrative, and leaving it
-- open would let anyone probe how the table is changing over time.
revoke all on function public.newsletter_prune_expired() from public;
grant execute on function public.newsletter_prune_expired() to authenticated;

-- ----------------------------------------------------------------------------
-- A count of expired rows, so the admin page can say how many WOULD be removed
-- before anyone clicks. Read-only, same authorisation rule.
-- ----------------------------------------------------------------------------

create or replace function public.newsletter_expired_count()
returns table (expired integer)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_ahcd_admin() then
    raise exception 'not authorised'
      using errcode = '42501';
  end if;

  return query
    select count(*)::integer
    from public.newsletter_pending
    where expires_at < now();
end;
$$;

revoke all on function public.newsletter_expired_count() from public;
grant execute on function public.newsletter_expired_count() to authenticated;
