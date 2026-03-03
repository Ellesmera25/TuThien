-- Enable UUID helper
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
  message text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
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

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists idx_donations_user_id on donations (user_id);
create index if not exists idx_donations_created_at on donations (created_at desc);

alter table campaigns enable row level security;
alter table donations enable row level security;
alter table disbursements enable row level security;
alter table profiles enable row level security;

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

drop policy if exists "donations are readable" on donations;
create policy "donations are readable"
  on donations for select
  to anon, authenticated
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

insert into campaigns (slug, title, summary, target_amount, raised_amount, status, end_date, cover_tag)
values
  ('nuoc-sach-lin-ho', 'Nuoc sach cho ban Lin Ho', 'Lap be loc va duong ong cho 120 ho dan.', 150000000, 92000000, 'active', '2026-04-15', 'Y Ty, Lao Cai'),
  ('hoc-bong-em-den-truong-2026', 'Hoc bong Em den truong 2026', 'Trao hoc bong va bo dung cu hoc tap cho 500 hoc sinh.', 300000000, 145000000, 'active', '2026-06-30', 'Mien Trung'),
  ('bep-an-0-dong-nhi-dong-2', 'Bep an 0 dong - Benh vien Nhi Dong 2', 'Cung cap suat an cho benh nhi va gia dinh.', 200000000, 210000000, 'completed', '2026-01-20', 'TP.HCM')
on conflict (slug) do nothing;

insert into disbursements (campaign_slug, title, description, amount, spent_at, proof_url)
values
  ('bep-an-0-dong-nhi-dong-2', 'Mua thuc pham dot 1', 'Nhap thuc pham cho 1.600 suat an.', 52300000, '2026-01-06', '#'),
  ('nuoc-sach-lin-ho', 'Mua ong dan nuoc PE', 'Ong PE 32mm cho cum dan cu so 2.', 37000000, '2026-02-10', '#'),
  ('hoc-bong-em-den-truong-2026', 'Dat may dong phuc', '200 bo dong phuc cho hoc sinh tieu hoc.', 28500000, '2026-02-21', '#')
on conflict do nothing;
