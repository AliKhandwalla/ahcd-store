-- ============================================================================
-- AHCD — Newsletter double opt-in
--
-- Run once in the Supabase SQL Editor. Additive, guarded, safe to re-run.
-- Existing tables (updates, update_images, products, product_images) are not
-- touched.
--
-- ----------------------------------------------------------------------------
-- SOURCE OF TRUTH
--
--   Resend is authoritative for subscription status (subscribed / unsubscribed)
--   and stores consent version + timestamp as contact properties.
--
--   This table holds ONLY unconfirmed signup requests — the one thing Resend
--   cannot do, since it has no double opt-in. A row is deleted the moment the
--   address confirms, so there is never a second subscription database and no
--   permanent copy of subscriber emails here.
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

-- ----------------------------------------------------------------------------
-- newsletter_request
--
-- Records a signup request and reports whether a confirmation email should be
-- sent. Returns the same shape regardless of whether the address was already
-- pending, so the caller can never distinguish a new address from a repeat —
-- which is what stops the endpoint leaking who is subscribed.
--
-- Throttling lives here rather than in application code so it cannot be
-- bypassed by calling the RPC directly.
-- ----------------------------------------------------------------------------

create or replace function public.newsletter_request(
  p_email           text,
  p_token_hash      text,
  p_consent_version text,
  p_expires_at      timestamptz
)
returns table (should_send boolean)
language plpgsql
security definer
-- Pinned search_path: a SECURITY DEFINER function without this can be hijacked
-- by a caller-controlled search_path.
set search_path = public, pg_temp
as $$
declare
  v_email        text := lower(trim(p_email));
  v_existing     public.newsletter_pending%rowtype;
  v_recent_count integer;
begin
  -- Housekeeping: drop anything that has already expired.
  delete from public.newsletter_pending where expires_at < now();

  -- Global hourly cap. Refuses quietly rather than erroring, so a flood cannot
  -- be distinguished from normal use either.
  select count(*) into v_recent_count
  from public.newsletter_pending
  where created_at > now() - interval '1 hour';

  if v_recent_count >= 200 then
    return query select false;
    return;
  end if;

  select * into v_existing
  from public.newsletter_pending
  where email = v_email;

  if found then
    -- Per-address throttle: a repeat within 10 minutes sends nothing, which
    -- prevents using the form to mail-bomb one person.
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

  insert into public.newsletter_pending
    (email, token_hash, consent_version, expires_at)
  values
    (v_email, p_token_hash, p_consent_version, p_expires_at);

  return query select true;
end;
$$;

-- ----------------------------------------------------------------------------
-- newsletter_confirm
--
-- Exchanges a token hash for the address it belongs to, and deletes the row so
-- the token is single-use. Returns null for unknown, expired or already-used
-- tokens — the caller cannot tell which.
-- ----------------------------------------------------------------------------

create or replace function public.newsletter_confirm(p_token_hash text)
returns table (email text, consent_version text, consented_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.newsletter_pending%rowtype;
begin
  select * into v_row
  from public.newsletter_pending
  where token_hash = p_token_hash
    and expires_at >= now();

  if not found then
    return;
  end if;

  delete from public.newsletter_pending where id = v_row.id;

  return query select v_row.email, v_row.consent_version, v_row.consented_at;
end;
$$;

-- Only these two entry points are reachable by the anonymous role.
revoke all on function public.newsletter_request(text, text, text, timestamptz) from public;
revoke all on function public.newsletter_confirm(text) from public;

grant execute on function public.newsletter_request(text, text, text, timestamptz)
  to anon, authenticated;
grant execute on function public.newsletter_confirm(text)
  to anon, authenticated;
