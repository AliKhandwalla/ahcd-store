-- ============================================================================
-- AHCD — Administrative cleanup of expired pending confirmations
--
-- Run once in the Supabase SQL Editor. Additive and safe to re-run.
--
-- Expired rows are already pruned opportunistically at the start of every
-- newsletter_request. That is enough in normal use, but it means a quiet
-- period leaves expired rows sitting in the table indefinitely, inflating the
-- admin's pending count and keeping addresses that never confirmed for longer
-- than they should be kept.
--
-- WHY A FUNCTION RATHER THAN A DELETE POLICY
-- A DELETE policy gated on is_ahcd_admin() would let the admin session delete
-- ANY row in newsletter_pending, including people who are legitimately waiting
-- to confirm. A compromised or mistaken admin session could wipe the table.
--
-- This function can only ever delete rows that have already expired. The
-- predicate is fixed in the function body and takes no arguments, so there is
-- no input that could widen it. newsletter_pending keeps no DELETE policy at
-- all, so this is the only way an administrator can remove anything.
-- ============================================================================

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
