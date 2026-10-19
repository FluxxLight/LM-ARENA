-- IDEAForge — initial schema
-- Real PostgreSQL (Supabase). No mock database, no AI tables.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Explorer',
  username text unique,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan_id text not null default 'free',
  xp integer not null default 0 check (xp >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_active_on date,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'BRL',
  interval text not null default 'month',
  includes text[] not null default '{}',
  limits jsonb not null default '{}'::jsonb,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.packs (
  id text primary key,
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'BRL',
  credits integer not null default 0,
  bonus_remixes integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'paused')),
  provider text not null default 'none',
  provider_ref text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  source text not null default 'manual',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, feature_key)
);
create index if not exists entitlements_user_idx on public.entitlements(user_id);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_token_hash text,
  category text not null,
  tool text not null default 'project',
  title text not null,
  summary text not null,
  payload jsonb not null,
  fingerprint text not null,
  seed text,
  is_public boolean not null default false,
  remix_of uuid references public.generations(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists generations_user_idx on public.generations(user_id, created_at desc);
create index if not exists generations_category_idx on public.generations(category, created_at desc);
create index if not exists generations_public_idx on public.generations(is_public, created_at desc) where is_public = true;
create index if not exists generations_fingerprint_idx on public.generations(fingerprint);
create index if not exists generations_guest_idx on public.generations(guest_token_hash) where guest_token_hash is not null;

create table if not exists public.shared_results (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null unique references public.generations(id) on delete cascade,
  slug text not null unique,
  views integer not null default 0 check (views >= 0),
  created_at timestamptz not null default now()
);
create index if not exists shared_results_slug_idx on public.shared_results(slug);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  external_id text,
  event_type text not null,
  status text not null default 'processed',
  amount_cents integer not null default 0,
  currency text not null default 'BRL',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);
create index if not exists payment_events_user_idx on public.payment_events(user_id, created_at desc);

create table if not exists public.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  generations integer not null default 0 check (generations >= 0),
  remixes integer not null default 0 check (remixes >= 0),
  shares integer not null default 0 check (shares >= 0),
  primary key (user_id, day)
);

create table if not exists public.guest_usage (
  ip_hash text not null,
  day date not null default current_date,
  generations integer not null default 0 check (generations >= 0),
  primary key (ip_hash, day)
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired')),
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_id)
);

-- ------------------------------------------------------- content / engine
create table if not exists public.categories (
  id text primary key,
  label text not null,
  description text,
  emoji text,
  accent text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.question_sets (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  name text not null,
  version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  category_id text not null references public.categories(id) on delete cascade,
  id text not null,
  set_id text references public.question_sets(id) on delete cascade,
  prompt text not null,
  hint text,
  type text not null check (type in ('single', 'multi')),
  min_select integer,
  max_select integer,
  requires_tags text[] not null default '{}',
  excludes_tags text[] not null default '{}',
  tool_id text,
  follow_up_only boolean not null default false,
  priority integer not null default 1,
  sort_order integer not null default 0,
  active boolean not null default true,
  primary key (category_id, id)
);
create index if not exists questions_category_idx on public.questions(category_id, sort_order);

create table if not exists public.question_options (
  question_id text not null,
  category_id text not null,
  id text not null,
  label text not null,
  hint text,
  tags text[] not null default '{}',
  weight numeric not null default 1,
  conflicts text[] not null default '{}',
  follow_ups text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  primary key (category_id, question_id, id),
  foreign key (category_id, question_id) references public.questions(category_id, id) on delete cascade
);
create index if not exists question_options_q_idx on public.question_options(category_id, question_id);

create table if not exists public.generation_templates (
  id uuid primary key default gen_random_uuid(),
  category_id text references public.categories(id) on delete cascade,
  slot text not null,
  template text not null,
  tags text[] not null default '{}',
  weight numeric not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists generation_templates_slot_idx on public.generation_templates(category_id, slot);

create table if not exists public.content_items (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  slot text not null,
  text text not null,
  tags text[] not null default '{}',
  weight numeric not null default 1,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists content_items_slot_idx on public.content_items(category_id, slot) where active = true;

create table if not exists public.generation_rules (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  when_tags text[] not null default '{}',
  boost jsonb not null default '{}'::jsonb,
  forbid text[] not null default '{}',
  reason text,
  active boolean not null default true
);
create index if not exists generation_rules_cat_idx on public.generation_rules(category_id) where active = true;

create table if not exists public.generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  tool text not null default 'project',
  name text not null,
  fingerprint text not null,
  created_at timestamptz not null default now()
);
create index if not exists generation_history_user_idx on public.generation_history(user_id, created_at desc);
create index if not exists generation_history_fp_idx on public.generation_history(fingerprint);

-- ---------------------------------------------------------- gamification
create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  title text not null,
  description text not null,
  category text not null,
  constraint_text text,
  xp_reward integer not null default 25,
  active boolean not null default true,
  unique (day)
);

create table if not exists public.user_challenges (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  amount integer not null check (amount >= 0),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_idx on public.xp_events(user_id, created_at desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_name_idx on public.analytics_events(name, created_at desc);

-- ------------------------------------------------------------ functions
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Explorer'))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Server-only usage counter. The caller (server) supplies the plan limit, but
-- this function can only be executed by service_role, never by a browser.
create or replace function public.consume_usage(p_user uuid, p_kind text, p_limit integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_count integer;
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
  end into v_count;

  if v_count > p_limit then
    raise exception 'USAGE_LIMIT_REACHED';
  end if;
  return v_count;
end;
$$;
revoke all on function public.consume_usage(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.consume_usage(uuid, text, integer) to service_role;

create or replace function public.consume_guest_usage(p_ip_hash text, p_limit integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
  insert into public.guest_usage (ip_hash, day, generations)
  values (p_ip_hash, current_date, 1)
  on conflict (ip_hash, day) do update set generations = public.guest_usage.generations + 1
  returning generations into v_count;

  if v_count > p_limit then
    raise exception 'USAGE_LIMIT_REACHED';
  end if;
  return v_count;
end;
$$;
revoke all on function public.consume_guest_usage(text, integer) from public, anon, authenticated;
grant execute on function public.consume_guest_usage(text, integer) to service_role;

create or replace function public.award_xp(p_user uuid, p_kind text, p_amount integer, p_meta jsonb default '{}'::jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_xp integer;
begin
  insert into public.xp_events (user_id, kind, amount, meta) values (p_user, p_kind, p_amount, p_meta);
  update public.profiles set xp = xp + p_amount where id = p_user returning xp into v_xp;
  return coalesce(v_xp, 0);
end;
$$;
revoke all on function public.award_xp(uuid, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, text, integer, jsonb) to service_role;

create or replace function public.touch_streak(p_user uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_streak integer;
begin
  update public.profiles
  set streak_days = case
        when last_active_on = current_date then streak_days
        when last_active_on = current_date - 1 then streak_days + 1
        else 1
      end,
      last_active_on = current_date
  where id = p_user
  returning streak_days into v_streak;
  return coalesce(v_streak, 0);
end;
$$;
revoke all on function public.touch_streak(uuid) from public, anon, authenticated;
grant execute on function public.touch_streak(uuid) to service_role;

-- --------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.generations enable row level security;
alter table public.shared_results enable row level security;
alter table public.payment_events enable row level security;
alter table public.usage_daily enable row level security;
alter table public.guest_usage enable row level security;
alter table public.referrals enable row level security;
alter table public.generation_history enable row level security;
alter table public.user_challenges enable row level security;
alter table public.user_achievements enable row level security;
alter table public.xp_events enable row level security;
alter table public.analytics_events enable row level security;
alter table public.plans enable row level security;
alter table public.packs enable row level security;
alter table public.categories enable row level security;
alter table public.question_sets enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.generation_templates enable row level security;
alter table public.content_items enable row level security;
alter table public.generation_rules enable row level security;
alter table public.daily_challenges enable row level security;

-- profiles: read own, update only safe columns; write/role/xp via service role
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, username) on public.profiles to authenticated;
revoke insert on public.profiles from authenticated;
revoke delete on public.profiles from authenticated;

-- subscriptions / entitlements: read own only; no writes from clients
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists entitlements_select on public.entitlements;
create policy entitlements_select on public.entitlements for select
  using (auth.uid() = user_id or public.is_admin());

revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.entitlements from anon, authenticated;

-- generations: owner read only. Public reads are served server-side with a
-- service-role client and sanitized payloads, so user_id is never exposed.
drop policy if exists generations_select on public.generations;
create policy generations_select on public.generations for select
  using (auth.uid() = user_id or public.is_admin());

revoke insert, update, delete on public.generations from anon, authenticated;

drop policy if exists shared_results_select on public.shared_results;
create policy shared_results_select on public.shared_results for select
  using (public.is_admin());
revoke insert, update, delete on public.shared_results from anon, authenticated;

drop policy if exists payment_events_select on public.payment_events;
create policy payment_events_select on public.payment_events for select
  using (auth.uid() = user_id or public.is_admin());
revoke insert, update, delete on public.payment_events from anon, authenticated;

drop policy if exists usage_select on public.usage_daily;
create policy usage_select on public.usage_daily for select
  using (auth.uid() = user_id or public.is_admin());
revoke insert, update, delete on public.usage_daily from anon, authenticated;

-- guest_usage: no client access whatsoever
revoke all on public.guest_usage from anon, authenticated;

drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id or public.is_admin());
revoke insert, update, delete on public.referrals from anon, authenticated;

drop policy if exists generation_history_select on public.generation_history;
create policy generation_history_select on public.generation_history for select
  using (auth.uid() = user_id or public.is_admin());
revoke insert, update, delete on public.generation_history from anon, authenticated;

drop policy if exists user_challenges_select on public.user_challenges;
create policy user_challenges_select on public.user_challenges for select
  using (auth.uid() = user_id or public.is_admin());
revoke insert, update, delete on public.user_challenges from anon, authenticated;

drop policy if exists user_achievements_select on public.user_achievements;
create policy user_achievements_select on public.user_achievements for select
  using (auth.uid() = user_id or public.is_admin());
revoke insert, update, delete on public.user_achievements from anon, authenticated;

drop policy if exists xp_events_select on public.xp_events;
create policy xp_events_select on public.xp_events for select
  using (auth.uid() = user_id or public.is_admin());
revoke insert, update, delete on public.xp_events from anon, authenticated;

drop policy if exists analytics_events_select on public.analytics_events;
create policy analytics_events_select on public.analytics_events for select
  using (public.is_admin());
revoke insert, update, delete on public.analytics_events from anon, authenticated;

-- public catalogue content: read-only for everyone, writable by admin only
do $$
declare t text;
begin
  foreach t in array array['plans','packs','categories','question_sets','questions','question_options','generation_templates','content_items','generation_rules','daily_challenges']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (true)', t, t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
    execute format('drop policy if exists %I_admin_write on public.%I', t, t);
    execute format('create policy %I_admin_write on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

grant select on public.plans, public.packs, public.categories, public.question_sets,
  public.questions, public.question_options, public.generation_templates,
  public.content_items, public.generation_rules, public.daily_challenges
  to anon, authenticated;

grant select on public.profiles, public.subscriptions, public.entitlements,
  public.generations, public.payment_events, public.usage_daily, public.referrals,
  public.generation_history, public.user_challenges, public.user_achievements,
  public.xp_events, public.shared_results, public.analytics_events
  to authenticated;

-- Explicitly prevent privilege escalation through the API.
revoke all on public.daily_challenges from anon, authenticated;
grant select on public.daily_challenges to anon, authenticated;

comment on table public.generations is 'Stores full deterministic generator payloads. Public reads are sanitized server-side.';
comment on column public.generations.payload is 'GeneratedProject JSON produced by /lib/generator. Contains no AI output.';
