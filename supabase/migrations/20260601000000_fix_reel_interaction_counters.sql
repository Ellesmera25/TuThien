begin;

create or replace function public.recalculate_reel_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels
      set likes = (
        select count(*)::integer
        from public.reel_likes
        where reel_id = new.reel_id
      )
      where id = new.reel_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.reels
      set likes = (
        select count(*)::integer
        from public.reel_likes
        where reel_id = old.reel_id
      )
      where id = old.reel_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.recalculate_reel_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels
      set comments = (
        select count(*)::integer
        from public.reel_comments
        where reel_id = new.reel_id
      )
      where id = new.reel_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.reels
      set comments = (
        select count(*)::integer
        from public.reel_comments
        where reel_id = old.reel_id
      )
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

drop trigger if exists reel_comments_count_update on public.reel_comments;
create trigger reel_comments_count_update
  after insert or delete on public.reel_comments
  for each row execute function public.recalculate_reel_comment_count();

update public.reels reel
set
  likes = (
    select count(*)::integer
    from public.reel_likes
    where reel_id = reel.id
  ),
  comments = (
    select count(*)::integer
    from public.reel_comments
    where reel_id = reel.id
  );

commit;
