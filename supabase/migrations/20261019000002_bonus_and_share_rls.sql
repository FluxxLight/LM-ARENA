-- 20261019000002 — bonus credits, revocation column and public share reads
alter table public.usage_daily
  add column if not exists bonus_generations integer not null default 0 check (bonus_generations >= 0),
  add column if not exists bonus_remixes integer not null default 0 check (bonus_remixes >= 0);

alter table public.entitlements
  add column if not exists revoked_at timestamptz;

create index if not exists entitlements_active_idx
  on public.entitlements(user_id, feature_key) where revoked_at is null;

create or replace function public.consume_usage(p_user uuid, p_kind text, p_limit integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_count integer; v_bonus integer;
begin
  if p_kind not in ('generations', 'remixes', 'shares') then
    raise exception 'invalid_usage_kind';
  end if;
  if p_limit < 0 then raise exception 'invalid_limit'; end if;

  insert into public.usage_daily (user_id, day, generations, remixes, shares)
  values (
    p_user, current_date,
    case when p_kind = 'generations' then 1 else 0 end,
    case when p_kind = 'remixes' then 1 else 0 end,
    case when p_kind = 'shares' then 1 else 0 end
  )
  on conflict (user_id, day) do update set
    generations = public.usage_daily.generations + case when p_kind = 'generations' then 1 else 0 end,
    remixes = public.usage_daily.remixes + case when p_kind = 'remixes' then 1 else 0 end,
    shares = public.usage_daily.shares + case when p_kind = 'shares' then 1 else 0 end
  returning case
    when p_kind = 'generations' then generations
    when p_kind = 'remixes' then remixes
    else shares
  end,
  case
    when p_kind = 'generations' then bonus_generations
    when p_kind = 'remixes' then bonus_remixes
    else 0
  end
  into v_count, v_bonus;

  if v_count > p_limit + coalesce(v_bonus, 0) then
    raise exception 'USAGE_LIMIT_REACHED';
  end if;
  return v_count;
end;
$$;
revoke all on function public.consume_usage(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.consume_usage(uuid, text, integer) to service_role;

-- Owners can read their share rows; public share rows are needed by the
-- gallery/dashboard joins. No columns beyond slug/views are exposed.
drop policy if exists shared_results_select on public.shared_results;
create policy shared_results_select on public.shared_results for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.generations g
      where g.id = shared_results.generation_id
        and (g.user_id = auth.uid() or g.is_public)
    )
  );

create index if not exists generations_public_category_idx
  on public.generations(category, created_at desc) where is_public = true;
