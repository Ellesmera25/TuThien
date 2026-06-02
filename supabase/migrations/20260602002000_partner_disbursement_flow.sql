-- Migration: partner requests disbursement, project owner approves, admin disburses.

begin;

alter table public.support_offers
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_account_holder text;

alter table public.disbursement_rounds
  add column if not exists partner_request_note text,
  add column if not exists owner_approved_by uuid references auth.users(id),
  add column if not exists owner_approved_at timestamp with time zone,
  add column if not exists owner_approval_note text;

do $$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'disbursement_rounds'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%status%'
    and pg_get_constraintdef(con.oid) like '%needs_admin_review%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.disbursement_rounds drop constraint %I',
      constraint_name
    );
  end if;
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

commit;
