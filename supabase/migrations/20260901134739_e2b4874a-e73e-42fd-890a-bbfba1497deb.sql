ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE draft_status ADD VALUE IF NOT EXISTS 'deleted';
ALTER TABLE public.email_drafts ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.email_drafts ADD COLUMN IF NOT EXISTS checked_at timestamptz;