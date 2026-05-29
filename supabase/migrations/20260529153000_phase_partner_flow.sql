-- Migration: phase-based partner flow
-- Run this in Supabase SQL Editor, or with `supabase db push`.

begin;

alter table public.support_offers
  add column if not exists phase_id uuid references public.campaign_phases(id) on delete cascade;

create index if not exists idx_support_offers_phase_id
  on public.support_offers (phase_id);

create index if not exists idx_campaign_phases_campaign_sort
  on public.campaign_phases (campaign_id, sort_order);

create unique index if not exists idx_support_offers_one_approved_per_phase
  on public.support_offers (phase_id)
  where status = 'approved' and phase_id is not null;

create or replace function public.enforce_max_three_campaign_phases()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.campaign_phases
    where campaign_id = new.campaign_id
      and id <> new.id
  ) >= 3 then
    raise exception 'Moi chien dich chi duoc co toi da 3 giai doan.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_max_three_campaign_phases on public.campaign_phases;
create trigger enforce_max_three_campaign_phases
  before insert or update of campaign_id on public.campaign_phases
  for each row execute function public.enforce_max_three_campaign_phases();

create or replace function public.enforce_support_offer_phase_campaign()
returns trigger
language plpgsql
as $$
begin
  if new.phase_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.campaign_phases phase
    where phase.id = new.phase_id
      and phase.campaign_id = new.campaign_id
  ) then
    raise exception 'Giai doan khong thuoc chien dich da chon.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_support_offer_phase_campaign on public.support_offers;
create trigger enforce_support_offer_phase_campaign
  before insert or update of campaign_id, phase_id on public.support_offers
  for each row execute function public.enforce_support_offer_phase_campaign();

commit;
