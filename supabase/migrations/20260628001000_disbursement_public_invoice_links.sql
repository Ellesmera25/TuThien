begin;

alter table public.disbursements
  add column if not exists disbursement_round_id uuid references public.disbursement_rounds(id) on delete set null;

create index if not exists idx_disbursements_round_id
  on public.disbursements (disbursement_round_id);

update public.disbursements disbursement
set disbursement_round_id = round.id
from public.campaigns campaign
join public.disbursement_rounds round
  on round.campaign_id = campaign.id
where disbursement.disbursement_round_id is null
  and disbursement.campaign_slug = campaign.slug
  and disbursement.title = ('Giải ngân đợt ' || round.round_number::text);

update public.disbursements disbursement
set proof_url = round.proof_url
from public.disbursement_rounds round
where disbursement.disbursement_round_id = round.id
  and nullif(disbursement.proof_url, '') is null
  and nullif(round.proof_url, '') is not null;

commit;
