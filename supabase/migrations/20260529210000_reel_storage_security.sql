begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'reel-videos',
  'reel-videos',
  true,
  104857600,
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "reel videos public read" on storage.objects;
create policy "reel videos public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'reel-videos');

drop policy if exists "reel videos owner upload" on storage.objects;
create policy "reel videos owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'reel-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "reel videos owner update" on storage.objects;
create policy "reel videos owner update"
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

drop policy if exists "reel videos owner delete" on storage.objects;
create policy "reel videos owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'reel-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
