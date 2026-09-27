-- ============================================================================
-- AHCD — Newsletter confirmation: split peek / consume
--
-- Run once in the Supabase SQL Editor. Additive and safe to re-run.
--
-- WHY
-- The original newsletter_confirm() deleted the pending row BEFORE the Resend
-- contact was created. Any failure after that point — a provider error, a
-- timeout, a rejected payload — destroyed the subscriber's confirmation token
-- permanently, so clicking the link again could only ever say "expired".
--
-- This replaces it with two operations so the token is preserved until the
-- contact genuinely exists:
--
--   newsletter_peek     non-destructive lookup
--   newsletter_consume  atomic, single-use delete
--
-- Neither function leaks subscriber data: both take a SHA-256 hash of a
-- 32-byte random token, and return nothing for an unknown or expired one.
-- RLS on newsletter_pending is unchanged (no public policies; admin SELECT
-- only), and these SECURITY DEFINER functions remain the only way in.
-- ============================================================================

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

-- ----------------------------------------------------------------------------
-- Remove the audit probe row created during the Phase 1 audit.
--
-- Matched on BOTH the exact address and the consent_version the probe wrote,
-- so this cannot touch a legitimate pending subscriber even if someone later
-- signs up with a similar address.
-- ----------------------------------------------------------------------------

delete from public.newsletter_pending
 where email = 'audit-probe@example.com'
   and consent_version = 'audit';
