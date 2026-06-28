begin;

alter table public.support_offers
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_account_holder text;

alter table public.disbursement_rounds
  add column if not exists partner_request_note text,
  add column if not exists owner_confirmation_note text,
  add column if not exists owner_approved_by uuid references auth.users(id),
  add column if not exists owner_approved_at timestamp with time zone,
  add column if not exists owner_approval_note text,
  add column if not exists manager_confirmed_by uuid references auth.users(id),
  add column if not exists manager_confirmed_at timestamp with time zone,
  add column if not exists manager_confirmation_note text;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute att
      on att.attrelid = rel.oid
      and att.attnum = any(con.conkey)
    where nsp.nspname = 'public'
      and rel.relname = 'disbursement_rounds'
      and con.contype = 'c'
      and att.attname = 'status'
  loop
    execute format(
      'alter table public.disbursement_rounds drop constraint %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.disbursement_rounds
  add constraint disbursement_rounds_status_check
  check (
    status in (
      'locked',
      'open',
      'requested',
      'manager_confirmed',
      'owner_approved',
      'disbursed',
      'completed',
      'needs_admin_review'
    )
  );

create index if not exists idx_disbursement_rounds_owner_approved
  on public.disbursement_rounds (owner_approved_by, owner_approved_at);

create index if not exists idx_disbursement_rounds_manager_confirmed
  on public.disbursement_rounds (manager_confirmed_by, manager_confirmed_at);

commit;
