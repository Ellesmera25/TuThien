begin;

alter table public.reel_comments
  drop constraint if exists reel_comments_user_id_fkey;

alter table public.reel_comments
  add constraint reel_comments_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;

commit;
