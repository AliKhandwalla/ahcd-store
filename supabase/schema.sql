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
  id           uuid primary key default gen_random_uuid(),
  title        text        not null,
  slug         text        not null unique,
  description  text        not null,
  status       text        not null default 'draft'
                           check (status in ('draft', 'published')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
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
