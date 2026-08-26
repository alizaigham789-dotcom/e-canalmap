-- ============================================================
-- ChakLand GIS PRO — Land Record Survey Data
-- Canal & Moga (outlet) property records schema
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. Canal property records
-- ------------------------------------------------------------
create table if not exists public.canals (
  id              uuid primary key default gen_random_uuid(),
  canal_name      text        not null,
  canal_type      text        check (canal_type in ('major','minor','rajbah','distributary','watercourse')),
  parent_canal_id uuid        references public.canals(id) on delete set null,
  village         text,
  tehsil          text,
  district        text,
  division        text,
  rd_start        text,                       -- reduced distance (start)
  rd_end          text,                       -- reduced distance (end)
  length_ft       numeric,                     -- length in feet
  width_ft        numeric,                     -- bed width in feet
  discharge_cusecs numeric,                    -- design discharge (cusecs)
  side            text        check (side in ('L','R','')),
  notes           text,
  created_by      uuid        references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.canals is 'Canal / rajbah property records for the land record survey';

-- ------------------------------------------------------------
-- 2. Moga (outlet) property records
-- ------------------------------------------------------------
create table if not exists public.mogas (
  id              uuid primary key default gen_random_uuid(),
  moga_number     text        not null,
  mogha_side      text        check (mogha_side in ('L','R')),
  canal_id        uuid        not null references public.canals(id) on delete cascade,
  village         text,
  mouza           text,
  rd              text,                       -- reduced distance along the parent canal
  cca_acres       numeric,                     -- Culturable Command Area (acres)
  gca_acres       numeric,                     -- Gross Command Area (acres)
  width_in        numeric,                     -- outlet width (inches)
  discharge_cusecs numeric,                    -- authorised discharge (cusecs)
  status          text        check (status in ('active','closed','damaged')) default 'active',
  notes           text,
  created_by      uuid        references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.mogas is 'Moga / outlet property records, linked to a canal';
comment on column public.mogas.cca_acres is 'Culturable Command Area in acres';
comment on column public.mogas.gca_acres is 'Gross Command Area in acres';

-- ------------------------------------------------------------
-- 3. Indexes
-- ------------------------------------------------------------
create index if not exists idx_canals_district    on public.canals(district);
create index if not exists idx_canals_parent      on public.canals(parent_canal_id);
create index if not exists idx_mogas_canal_id     on public.mogas(canal_id);
create index if not exists idx_mogas_moga_number  on public.mogas(moga_number);
create index if not exists idx_mogas_village      on public.mogas(village);

-- ------------------------------------------------------------
-- 4. auto-updated updated_at trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_canals_updated_at on public.canals;
create trigger trg_canals_updated_at
  before update on public.canals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_mogas_updated_at on public.mogas;
create trigger trg_mogas_updated_at
  before update on public.mogas
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 5. Row-Level Security
--    Everyone can read; only the owner can write their rows.
--    (Remove the SELECT policy if records must be private.)
-- ------------------------------------------------------------
alter table public.canals enable row level security;
alter table public.mogas  enable row level security;

drop policy if exists "canals_read" on public.canals;
create policy "canals_read" on public.canals
  for select using (true);

drop policy if exists "canals_owner_write" on public.canals;
create policy "canals_owner_write" on public.canals
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "mogas_read" on public.mogas;
create policy "mogas_read" on public.mogas
  for select using (true);

drop policy if exists "mogas_owner_write" on public.mogas;
create policy "mogas_owner_write" on public.mogas
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());