begin;

update public.reels
set
  likes = coalesce(likes, 0),
  comments = coalesce(comments, 0)
where likes is null or comments is null;

alter table public.reels
  alter column likes set default 0,
  alter column comments set default 0,
  alter column likes set not null,
  alter column comments set not null;

create or replace function public.recalculate_reel_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels
      set likes = coalesce(likes, 0) + 1
      where id = new.reel_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.reels
      set likes = greatest(coalesce(likes, 0) - 1, 0)
      where id = old.reel_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.recalculate_reel_comment_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels
      set comments = coalesce(comments, 0) + 1
      where id = new.reel_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.reels
      set comments = greatest(coalesce(comments, 0) - 1, 0)
      where id = old.reel_id;
    return old;
  end if;

  return null;
end;
$$;

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
