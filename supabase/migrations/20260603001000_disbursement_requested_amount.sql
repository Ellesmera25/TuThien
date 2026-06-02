-- Migration: allow partner organizations to request arbitrary disbursement amounts.

begin;

alter table public.disbursement_rounds
  add column if not exists requested_amount numeric;

commit;
