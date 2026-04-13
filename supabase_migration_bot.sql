-- BR Simulator: Telegram Bot migration
-- Safe to run multiple times (idempotent where possible).

begin;

-- =============================================
-- 1) players: Telegram binding + promo usage
-- =============================================
alter table if exists public.players
  add column if not exists telegram_id bigint,
  add column if not exists telegram_username text,
  add column if not exists used_promos jsonb not null default '[]'::jsonb,
  add column if not exists "usedPromos" jsonb not null default '[]'::jsonb;

-- Keep both promo columns in sync for old/new app code.
update public.players
set used_promos = coalesce(used_promos, "usedPromos", '[]'::jsonb),
    "usedPromos" = coalesce("usedPromos", used_promos, '[]'::jsonb)
where used_promos is null or "usedPromos" is null;

-- Optional backfill: if player id is tg_<digits>, fill telegram_id.
update public.players
set telegram_id = nullif(regexp_replace(id, '^tg_', ''), '')::bigint
where telegram_id is null
  and id ~ '^tg_[0-9]+$';

create index if not exists idx_players_telegram_id on public.players(telegram_id);
create index if not exists idx_players_nick on public.players(nick);

-- Enforce uniqueness for non-null telegram_id.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_telegram_id_unique'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_telegram_id_unique unique (telegram_id);
  end if;
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- =============================================
-- 2) promocodes table for bot/admin panel
-- =============================================
create table if not exists public.promocodes (
  id bigserial primary key,
  code text not null,
  reward integer not null check (reward > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique promo code (exact match).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'promocodes_code_unique'
      and conrelid = 'public.promocodes'::regclass
  ) then
    alter table public.promocodes
      add constraint promocodes_code_unique unique (code);
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_promocodes_active on public.promocodes(is_active);

-- =============================================
-- 3) config extensions for bot runtime config
-- =============================================
alter table if exists public.config
  add column if not exists admin_ids jsonb not null default '[]'::jsonb,
  add column if not exists topic_ids jsonb not null default '{}'::jsonb,
  add column if not exists promocodes jsonb not null default '[]'::jsonb;

-- Ensure global config row exists.
insert into public.config (id)
values ('global')
on conflict (id) do nothing;

-- Default topic_ids template (only if empty object).
update public.config
set topic_ids = jsonb_build_object(
  'actions', 0,
  'support', 0,
  'broadcasts', 0,
  'errors', 0,
  'admin', 0
)
where id = 'global'
  and coalesce(topic_ids, '{}'::jsonb) = '{}'::jsonb;

-- =============================================
-- 4) updated_at trigger for promocodes
-- =============================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_promocodes_updated_at on public.promocodes;
create trigger trg_promocodes_updated_at
before update on public.promocodes
for each row
execute function public.set_updated_at();

commit;

-- =============================================
-- Optional RLS note:
-- If RLS is enabled, add policies allowing your bot flow.
-- With Apps Script + anon key, prefer strict policies by telegram_id or disabled RLS only for testing.
-- =============================================
