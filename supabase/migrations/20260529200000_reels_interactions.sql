begin;

create table if not exists public.reel_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reel_id uuid not null references public.reels (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reel_id, user_id)
);

create table if not exists public.reel_comments (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  content text not null check (char_length(trim(content)) between 2 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_slug text not null references public.campaigns (slug) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, campaign_slug)
);

create index if not exists idx_reel_likes_user_id on public.reel_likes (user_id);
create index if not exists idx_reel_likes_reel_id on public.reel_likes (reel_id);
create index if not exists idx_reel_comments_reel_id on public.reel_comments (reel_id, created_at desc);
create index if not exists idx_reel_comments_user_id on public.reel_comments (user_id);
create index if not exists idx_campaign_follows_user_id on public.campaign_follows (user_id);
create index if not exists idx_campaign_follows_campaign_slug on public.campaign_follows (campaign_slug);

create or replace function public.recalculate_reel_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels
      set likes = likes + 1
      where id = new.reel_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.reels
      set likes = greatest(likes - 1, 0)
      where id = old.reel_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists reel_likes_count_update on public.reel_likes;
create trigger reel_likes_count_update
  after insert or delete on public.reel_likes
  for each row execute function public.recalculate_reel_like_count();

create or replace function public.recalculate_reel_comment_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels
      set comments = comments + 1
      where id = new.reel_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.reels
      set comments = greatest(comments - 1, 0)
      where id = old.reel_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists reel_comments_count_update on public.reel_comments;
create trigger reel_comments_count_update
  after insert or delete on public.reel_comments
  for each row execute function public.recalculate_reel_comment_count();

alter table public.reel_likes enable row level security;
alter table public.reel_comments enable row level security;
alter table public.campaign_follows enable row level security;

drop policy if exists "reel likes readable by owner" on public.reel_likes;
drop policy if exists "reel likes updatable by owner" on public.reel_likes;
create policy "reel likes readable by owner"
  on public.reel_likes for select
  to authenticated
  using (auth.uid() = user_id);
create policy "reel likes updatable by owner"
  on public.reel_likes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reel comments readable" on public.reel_comments;
create policy "reel comments readable"
  on public.reel_comments for select
  to anon, authenticated
  using (true);

drop policy if exists "reel comments writable by owner" on public.reel_comments;
create policy "reel comments writable by owner"
  on public.reel_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "campaign follows readable by owner" on public.campaign_follows;
drop policy if exists "campaign follows updatable by owner" on public.campaign_follows;
create policy "campaign follows readable by owner"
  on public.campaign_follows for select
  to authenticated
  using (auth.uid() = user_id);
create policy "campaign follows updatable by owner"
  on public.campaign_follows for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
