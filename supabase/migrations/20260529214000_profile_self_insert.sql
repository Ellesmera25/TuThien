begin;

drop policy if exists "profiles are insertable by owner" on public.profiles;
create policy "profiles are insertable by owner"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

commit;
