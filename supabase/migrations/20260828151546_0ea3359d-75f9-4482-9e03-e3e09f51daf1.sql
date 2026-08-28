ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS trigger_stage crm_stage,
  ADD COLUMN IF NOT EXISTS stop_on_reply boolean NOT NULL DEFAULT true;