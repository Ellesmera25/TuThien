-- TuThien.vn Supabase schema
create extension if not exists pgcrypto;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null,
  target_amount bigint not null check (target_amount >= 0),
  raised_amount bigint not null default 0 check (raised_amount >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  end_date date not null,
  cover_tag text not null default 'Dang cap nhat',
  created_at timestamptz not null default now()
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns (id) on delete set null,
  campaign_slug text,
  user_id uuid references auth.users (id) on delete set null,
  donor_name text not null,
  email text not null,
  amount bigint not null check (amount > 0),
  payment_method text not null,
  payment_provider text not null default 'sepay',
  payment_reference text unique,
  payment_content text,
  payment_qr_url text,
  provider_transaction_id text,
  webhook_payload jsonb,
  message text,
  blockchain_hash text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  confirmed_at timestamptz,
  webhook_received_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists donation_blockchain (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null unique references donations (id) on delete cascade,
  payment_reference text not null unique,
  amount bigint not null check (amount > 0),
  donor_name text not null,
  email text not null,
  hash text not null unique,
  previous_hash text not null,
  timestamp bigint not null,
  created_at timestamptz not null default now()
);

alter table donations
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create table if not exists disbursements (
  id uuid primary key default gen_random_uuid(),
  campaign_slug text not null,
  title text not null,
  description text not null,
  amount bigint not null check (amount > 0),
  spent_at date not null,
  proof_url text,
  created_at timestamptz not null default now()
);

create table if not exists reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  campaign_slug text not null,
  title text not null,
  caption text not null,
  creator_name text not null default 'TuThien.vn',
  location text not null default 'Dang cap nhat',
  video_url text,
  cover_tone text not null default 'warm' check (cover_tone in ('warm', 'cool', 'mint', 'violet')),
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  comments bigint not null default 0 check (comments >= 0),
  created_at timestamptz not null default now()
);

alter table reels
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create table if not exists profiles (
  id uuid not null,
  full_name text,
  role text not null default 'donor'::text check (role = any (array['donor'::text, 'project_owner'::text, 'partner_org'::text, 'admin'::text])),
  created_at timestamptz not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id)
);

create index if not exists idx_donations_user_id on donations (user_id);
create index if not exists idx_donations_created_at on donations (created_at desc);
create index if not exists idx_donation_blockchain_created_at on donation_blockchain (created_at desc);
create index if not exists idx_donation_blockchain_payment_reference on donation_blockchain (payment_reference);
create index if not exists idx_donation_blockchain_donation_id on donation_blockchain (donation_id);
create index if not exists idx_reels_created_at on reels (created_at desc);
create index if not exists idx_reels_campaign_slug on reels (campaign_slug);
create index if not exists idx_reels_user_id on reels (user_id);

alter table campaigns enable row level security;
alter table donations enable row level security;
alter table donation_blockchain enable row level security;
alter table disbursements enable row level security;
alter table reels enable row level security;
alter table profiles enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reel-videos',
  'reel-videos',
  true,
  104857600,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "campaigns are readable" on campaigns;
create policy "campaigns are readable"
  on campaigns for select
  to anon, authenticated
  using (true);

drop policy if exists "disbursements are readable" on disbursements;
create policy "disbursements are readable"
  on disbursements for select
  to anon, authenticated
  using (true);

drop policy if exists "reels are readable" on reels;
create policy "reels are readable"
  on reels for select
  to anon, authenticated
  using (true);

drop policy if exists "reel videos are readable" on storage.objects;
create policy "reel videos are readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'reel-videos');

drop policy if exists "members can upload reel videos" on storage.objects;
create policy "members can upload reel videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'reel-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "members can update own reel videos" on storage.objects;
create policy "members can update own reel videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'reel-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'reel-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "members can delete own reel videos" on storage.objects;
create policy "members can delete own reel videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'reel-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "donations are readable" on donations;
drop policy if exists "donations are readable by owner" on donations;
create policy "donations are readable by owner"
  on donations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "donation_blockchain are readable" on donation_blockchain;
create policy "donation_blockchain are readable"
  on donation_blockchain for select
  to authenticated
  using (true);

drop policy if exists "profiles are readable by owner" on profiles;
create policy "profiles are readable by owner"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles are updatable by owner" on profiles;
create policy "profiles are updatable by owner"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

do $$
begin
  if to_regclass('public.support_offers') is not null
    and to_regclass('public.campaign_phases') is not null then
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
  end if;
end;
$$;

create or replace function public.enforce_max_three_campaign_phases()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.campaign_phases
    where campaign_id = new.campaign_id
      and id <> coalesce(new.id, gen_random_uuid())
  ) >= 3 then
    raise exception 'Moi chien dich chi duoc co toi da 3 giai doan.';
  end if;

  return new;
end;
$$;

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

do $$
begin
  if to_regclass('public.campaign_phases') is not null then
    drop trigger if exists enforce_max_three_campaign_phases on public.campaign_phases;
  end if;

  if to_regclass('public.support_offers') is not null then
    drop trigger if exists enforce_support_offer_phase_campaign on public.support_offers;
    create trigger enforce_support_offer_phase_campaign
      before insert or update of campaign_id, phase_id on public.support_offers
      for each row execute function public.enforce_support_offer_phase_campaign();

    drop trigger if exists enforce_support_offer_round_campaign on public.support_offers;
    create trigger enforce_support_offer_round_campaign
      before insert or update of campaign_id, disbursement_round_id on public.support_offers
      for each row execute function public.enforce_support_offer_round_campaign();
  end if;

  if to_regclass('public.donations') is not null then
    drop trigger if exists enforce_donation_phase_campaign on public.donations;
    create trigger enforce_donation_phase_campaign
      before insert or update of campaign_id, phase_id on public.donations
      for each row execute function public.enforce_donation_phase_campaign();
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
