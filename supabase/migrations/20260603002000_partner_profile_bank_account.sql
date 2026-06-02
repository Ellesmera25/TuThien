begin;

alter table public.profiles
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_account_holder text;

alter table public.role_requests
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_account_holder text;

with latest_partner_payout as (
  select distinct on (partner_id)
    partner_id,
    payout_bank_name,
    payout_account_number,
    payout_account_holder
  from public.support_offers
  where partner_id is not null
    and nullif(trim(coalesce(payout_bank_name, '')), '') is not null
    and nullif(trim(coalesce(payout_account_number, '')), '') is not null
    and nullif(trim(coalesce(payout_account_holder, '')), '') is not null
  order by partner_id, created_at desc
)
update public.profiles p
set
  payout_bank_name = coalesce(p.payout_bank_name, latest_partner_payout.payout_bank_name),
  payout_account_number = coalesce(p.payout_account_number, latest_partner_payout.payout_account_number),
  payout_account_holder = coalesce(p.payout_account_holder, latest_partner_payout.payout_account_holder)
from latest_partner_payout
where p.id = latest_partner_payout.partner_id;

commit;
