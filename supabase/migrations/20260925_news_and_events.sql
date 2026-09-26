-- ============================================================================
-- AHCD — News & Events expansion
--
-- Run once in the Supabase SQL Editor. Purely ADDITIVE and safe to re-run:
-- every statement is guarded, nothing is dropped, and no existing row is
-- deleted, rewritten or re-keyed.
--
-- Adds to the existing `updates` table:
--   * category          market-event | product-launch | announcement
--   * event_*, venue_*  optional structured details for market events
--   * is_featured       at most one, enforced by a partial unique index
--
-- No RLS or Storage policy changes are required. The existing policies are
-- row-level and already cover every column, so the new columns inherit them:
-- the public still reads only status = 'published', and only the admin email
-- may write.
-- ============================================================================

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
