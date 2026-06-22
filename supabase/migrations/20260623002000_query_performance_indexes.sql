-- Migration: targeted indexes for account, admin, donation, and transparency queries.
-- Run this in Supabase SQL Editor, or with `supabase db push`.

begin;

-- Base tables that are always created by supabase/schema.sql.
create index if not exists idx_campaigns_created_at_desc
  on public.campaigns (created_at desc);

create index if not exists idx_campaigns_status_created_at_desc
  on public.campaigns (status, created_at desc);

create index if not exists idx_donations_status_created_at_desc
  on public.donations (status, created_at desc);

create index if not exists idx_donation_blockchain_email_created_at_desc
  on public.donation_blockchain (email, created_at desc);

create index if not exists idx_disbursements_spent_at_desc
  on public.disbursements (spent_at desc);

create index if not exists idx_disbursements_campaign_spent_at_desc
  on public.disbursements (campaign_slug, spent_at desc);

create index if not exists idx_reels_user_created_at_desc
  on public.reels (user_id, created_at desc);

create or replace function public.__tuthien_has_columns(
  target_table text,
  target_columns text[]
)
returns boolean
language sql
stable
as $$
  select to_regclass(format('public.%I', target_table)) is not null
    and not exists (
      select 1
      from unnest(target_columns) as required(column_name)
      where not exists (
        select 1
        from information_schema.columns column_info
        where column_info.table_schema = 'public'
          and column_info.table_name = target_table
          and column_info.column_name = required.column_name
      )
    );
$$;

do $$
begin
  if public.__tuthien_has_columns('campaigns', array['review_status', 'status', 'created_at']) then
    execute 'create index if not exists idx_campaigns_review_status_status_created_at_desc on public.campaigns (review_status, status, created_at desc)';
  end if;

  if public.__tuthien_has_columns('campaigns', array['review_status', 'created_at']) then
    execute 'create index if not exists idx_campaigns_pending_review_created_at on public.campaigns (created_at asc) where review_status = ''pending''';
  end if;

  if public.__tuthien_has_columns('campaigns', array['owner_id', 'created_at']) then
    execute 'create index if not exists idx_campaigns_owner_created_at_desc on public.campaigns (owner_id, created_at desc) where owner_id is not null';
  end if;

  if public.__tuthien_has_columns('campaign_images', array['campaign_id', 'sort_order']) then
    execute 'create index if not exists idx_campaign_images_campaign_sort on public.campaign_images (campaign_id, sort_order)';
  end if;

  if public.__tuthien_has_columns('campaign_phases', array['campaign_id', 'sort_order']) then
    execute 'create index if not exists idx_campaign_phases_campaign_sort on public.campaign_phases (campaign_id, sort_order)';
  end if;

  if public.__tuthien_has_columns('role_requests', array['status', 'created_at']) then
    execute 'create index if not exists idx_role_requests_pending_created_at on public.role_requests (created_at asc) where status = ''pending''';
  end if;

  if public.__tuthien_has_columns('role_requests', array['user_id', 'created_at']) then
    execute 'create index if not exists idx_role_requests_user_created_at_desc on public.role_requests (user_id, created_at desc)';
  end if;

  if public.__tuthien_has_columns('support_offers', array['partner_id', 'created_at']) then
    execute 'create index if not exists idx_support_offers_partner_created_at_desc on public.support_offers (partner_id, created_at desc)';
  end if;

  if public.__tuthien_has_columns('support_offers', array['campaign_id', 'status', 'created_at']) then
    execute 'create index if not exists idx_support_offers_campaign_status_created_at_desc on public.support_offers (campaign_id, status, created_at desc)';
  end if;

  if public.__tuthien_has_columns('support_offers', array['status', 'created_at']) then
    execute 'create index if not exists idx_support_offers_status_created_at_desc on public.support_offers (status, created_at desc)';
  end if;

  if public.__tuthien_has_columns('support_offers', array['partner_id', 'status', 'disbursement_round_id']) then
    execute 'create index if not exists idx_support_offers_partner_status_round on public.support_offers (partner_id, status, disbursement_round_id) where disbursement_round_id is not null';
  end if;

  if public.__tuthien_has_columns('support_offers', array['disbursement_round_id', 'status']) then
    execute 'create index if not exists idx_support_offers_round_status on public.support_offers (disbursement_round_id, status) where disbursement_round_id is not null';
  end if;

  if public.__tuthien_has_columns('disbursement_rounds', array['status', 'created_at']) then
    execute 'create index if not exists idx_disbursement_rounds_status_created_at_desc on public.disbursement_rounds (status, created_at desc)';
  end if;

  if public.__tuthien_has_columns('disbursement_rounds', array['campaign_id', 'round_number']) then
    execute 'create index if not exists idx_disbursement_rounds_campaign_round_number on public.disbursement_rounds (campaign_id, round_number)';
  end if;

  if public.__tuthien_has_columns('disbursement_rounds', array['campaign_id', 'status', 'round_number']) then
    execute 'create index if not exists idx_disbursement_rounds_campaign_status_round on public.disbursement_rounds (campaign_id, status, round_number)';
  end if;

  if public.__tuthien_has_columns('disbursement_rounds', array['proof_status', 'proof_due_at']) then
    execute 'create index if not exists idx_disbursement_rounds_pending_proof_due on public.disbursement_rounds (proof_due_at) where proof_status = ''pending'' and proof_due_at is not null';
  end if;
end;
$$;

drop function if exists public.__tuthien_has_columns(text, text[]);

commit;
