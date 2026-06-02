-- Migration: use invoice/document proof wording for post-disbursement compliance.
-- Run this after 20260602000000_disbursement_manager_invoice_flow.sql.

begin;

alter table public.disbursement_rounds
  alter column proof_type set default 'invoice_document';

update public.disbursement_rounds
set proof_type = 'invoice_document'
where proof_type = 'red_invoice';

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
    and pg_get_constraintdef(con.oid) like '%proof_type%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.disbursement_rounds drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.disbursement_rounds
  add constraint disbursement_rounds_proof_type_check
  check (proof_type in ('invoice_document'));

commit;
