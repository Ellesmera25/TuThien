-- Migration: disbursement owner confirmation, manager confirmation, and red invoice proof.
-- Run this in Supabase SQL Editor, or with `supabase db push`.

begin;

alter table public.disbursement_rounds
  add column if not exists owner_confirmation_note text,
  add column if not exists manager_confirmed_by uuid references auth.users(id),
  add column if not exists manager_confirmed_at timestamp with time zone,
  add column if not exists manager_confirmation_note text,
  add column if not exists proof_type text not null default 'red_invoice'
    check (proof_type in ('red_invoice'));

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
      'disbursed',
      'completed',
      'needs_admin_review'
    )
  );

create index if not exists idx_disbursement_rounds_manager_confirmed
  on public.disbursement_rounds (manager_confirmed_by, manager_confirmed_at);

commit;
