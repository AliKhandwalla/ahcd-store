-- ============================================================================
-- AHCD — Newsletter signup RPC hardening
--
-- Run once in the Supabase SQL Editor. Additive and safe to re-run.
--
-- THE PROBLEM
-- newsletter_request() was granted to `anon`, and the publishable key that
-- authenticates as `anon` is compiled into the client bundle by design. So
-- anybody could call the function directly and skip every protection that
-- lives in the server action: the honeypot, the minimum fill time, the email
-- validation and the consent checkbox.
--
-- The per-address throttle and the global cap did still apply, because they
-- live in the function. But the global cap was the whole exposure: one caller
-- could fill it with junk addresses and every legitimate visitor would then be
-- silently refused for the rest of the hour. The same budget also governs how
-- many confirmation emails the site sends, so exhausting it burns the shared
-- Resend quota.
--
-- THE FIX
-- 1. A server-only shared secret. The function now takes one and verifies it
--    against a SHA-256 hash held in a table nobody can read. The secret lives
--    only in the server environment, never in the client bundle, so holding
--    the publishable key is no longer enough to reach this function.
-- 2. Separate hourly AND daily caps, configurable without a code change, sized
--    against the email provider's quota rather than left at a single large
--    hourly number.
--
-- WHAT IS DELIBERATELY NOT DONE
-- No IP address is recorded or trusted. A client-supplied address can be
-- forged, and a proxy-supplied one would mean storing personal data we have
-- told subscribers we do not collect.
-- ============================================================================

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
  public.newsletter_request(text, text, text, timestamptz, text) to anon, authenticated;

-- ============================================================================
-- OPERATOR STEP — required before signups can work again
--
-- The secret is generated by you and never appears in this file, in the
-- repository, or in the client bundle.
--
-- 1. Generate a secret and its hash locally:
--
--      npm run newsletter:secret
--
--    It prints the secret once and the hash separately.
--
-- 2. Put the SECRET in the server environment as NEWSLETTER_RPC_SECRET
--    (.env.local, and Vercel for all three environments). No NEXT_PUBLIC_
--    prefix — the whole point is that it never reaches the browser.
--
-- 3. Store only the HASH here. The hash is not a credential: it cannot be
--    reversed and cannot be used to call the function.
--
--      insert into public.app_config (key, value)
--      values ('newsletter_rpc_secret_sha256', 'PASTE_THE_HASH_HERE')
--      on conflict (key) do update
--        set value = excluded.value, updated_at = now();
--
-- Until both steps are done, newsletter_request refuses every call and the
-- signup form reports that signups are not open. No email can be sent.
-- ============================================================================
