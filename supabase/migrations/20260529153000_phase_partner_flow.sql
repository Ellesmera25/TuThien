-- Migration: phase-based partner flow
-- Run this in Supabase SQL Editor, or with `supabase db push`.

begin;

alter table public.support_offers
  add column if not exists phase_id uuid references public.campaign_phases(id) on delete cascade;

alter table public.support_offers
  add column if not exists approved_budget bigint check (approved_budget is null or approved_budget >= 0);

create table if not exists public.disbursement_rounds (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  round_number integer not null check (round_number between 1 and 3),
  percent integer not null check (percent > 0 and percent <= 100),
  planned_amount bigint not null default 0 check (planned_amount >= 0),
  status text not null default 'locked'
    check (status in ('locked', 'open', 'requested', 'disbursed', 'completed', 'needs_admin_review')),
  requested_by uuid references auth.users(id),
  requested_at timestamp with time zone,
  approved_by uuid references auth.users(id),
  approved_at timestamp with time zone,
  disbursed_at date,
  proof_status text not null default 'pending'
    check (proof_status in ('pending', 'approved', 'overdue')),
  proof_due_at timestamp with time zone,
  proof_submitted_at timestamp with time zone,
  proof_url text,
  proof_note text,
  proof_reviewed_by uuid references auth.users(id),
  proof_reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  unique (campaign_id, round_number)
);

alter table public.support_offers
  add column if not exists disbursement_round_id uuid references public.disbursement_rounds(id) on delete set null;

alter table public.donations
  add column if not exists phase_id uuid references public.campaign_phases(id) on delete set null;

alter table public.campaign_phases
  add column if not exists raised_amount bigint not null default 0 check (raised_amount >= 0);

create index if not exists idx_support_offers_phase_id
  on public.support_offers (phase_id);

create index if not exists idx_support_offers_disbursement_round_id
  on public.support_offers (disbursement_round_id);

create index if not exists idx_donations_phase_id
  on public.donations (phase_id);

create index if not exists idx_disbursement_rounds_campaign_status
  on public.disbursement_rounds (campaign_id, status);

create index if not exists idx_campaign_phases_campaign_sort
  on public.campaign_phases (campaign_id, sort_order);

create unique index if not exists idx_support_offers_one_approved_per_phase
  on public.support_offers (phase_id)
  where status = 'approved' and phase_id is not null;

create unique index if not exists idx_support_offers_one_locked_per_phase
  on public.support_offers (phase_id)
  where status in ('owner_pending', 'approved') and phase_id is not null;

create unique index if not exists idx_support_offers_one_approved_per_round
  on public.support_offers (disbursement_round_id)
  where status = 'approved' and disbursement_round_id is not null;

create unique index if not exists idx_support_offers_one_locked_per_round
  on public.support_offers (disbursement_round_id)
  where status in ('owner_pending', 'approved') and disbursement_round_id is not null;

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

create or replace function public.enforce_support_offer_round_campaign()
returns trigger
language plpgsql
as $$
begin
  if new.disbursement_round_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.disbursement_rounds round
    where round.id = new.disbursement_round_id
      and round.campaign_id = new.campaign_id
  ) then
    raise exception 'Dot giai ngan khong thuoc chien dich da chon.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_support_offer_round_campaign on public.support_offers;
create trigger enforce_support_offer_round_campaign
  before insert or update of campaign_id, disbursement_round_id on public.support_offers
  for each row execute function public.enforce_support_offer_round_campaign();

create or replace function public.enforce_donation_phase_campaign()
returns trigger
language plpgsql
as $$
begin
  if new.phase_id is null then
    return new;
  end if;

  if new.campaign_id is null then
    raise exception 'Donation co giai doan phai thuoc mot chien dich.';
  end if;

  if not exists (
    select 1
    from public.campaign_phases phase
    where phase.id = new.phase_id
      and phase.campaign_id = new.campaign_id
  ) then
    raise exception 'Giai doan donation khong thuoc chien dich da chon.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_donation_phase_campaign on public.donations;
create trigger enforce_donation_phase_campaign
  before insert or update of campaign_id, phase_id on public.donations
  for each row execute function public.enforce_donation_phase_campaign();

commit;
