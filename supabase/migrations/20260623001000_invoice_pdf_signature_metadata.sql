-- Store extracted digital-signature metadata for invoice/document PDFs.

begin;

alter table public.disbursement_rounds
  add column if not exists invoice_signature_status text not null default 'not_checked',
  add column if not exists invoice_signature_signature_count integer not null default 0,
  add column if not exists invoice_signature_signer_name text,
  add column if not exists invoice_signature_signer_organization text,
  add column if not exists invoice_signature_signer_tax_code text,
  add column if not exists invoice_signature_signed_at timestamp with time zone,
  add column if not exists invoice_signature_certificate_serial text,
  add column if not exists invoice_signature_certificate_valid_from timestamp with time zone,
  add column if not exists invoice_signature_certificate_valid_to timestamp with time zone,
  add column if not exists invoice_signature_subject text,
  add column if not exists invoice_signature_issuer text,
  add column if not exists invoice_signature_raw jsonb,
  add column if not exists invoice_signature_extracted_at timestamp with time zone,
  add column if not exists invoice_signature_error text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campaign-assets',
  'campaign-assets',
  false,
  20971520,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = greatest(
    coalesce(storage.buckets.file_size_limit, 0),
    excluded.file_size_limit
  ),
  allowed_mime_types = array(
    select distinct unnest(
      coalesce(storage.buckets.allowed_mime_types, array[]::text[]) ||
      excluded.allowed_mime_types
    )
  );

drop policy if exists "campaign assets owner upload" on storage.objects;
create policy "campaign assets owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campaign-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "campaign assets owner update" on storage.objects;
create policy "campaign assets owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'campaign-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'campaign-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "campaign assets owner delete" on storage.objects;
create policy "campaign assets owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'campaign-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
