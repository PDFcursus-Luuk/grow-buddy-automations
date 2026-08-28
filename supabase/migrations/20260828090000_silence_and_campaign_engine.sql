-- Warmhoud-motor: stilte bewaken + campagnes echt laten lopen.

-- Onthoudt wanneer de assistent voor het laatst een "stil contact"-voorstel maakte,
-- zodat je niet elke run opnieuw hetzelfde voorstel krijgt.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS last_nudge_at timestamptz;

-- Campagnes kunnen automatisch starten zodra een contact in een bepaalde fase komt.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS trigger_stage public.crm_stage,
  ADD COLUMN IF NOT EXISTS stop_on_reply boolean NOT NULL DEFAULT true;

-- Een enrollment kan afgerond zijn (alle stappen gehad).
ALTER TABLE public.campaign_enrollments
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Snel de enrollments vinden die vandaag aan de beurt zijn.
CREATE INDEX IF NOT EXISTS campaign_enrollments_due_idx
  ON public.campaign_enrollments (user_id, next_action_at)
  WHERE is_paused = false AND completed_at IS NULL;

-- Snel stille contacten vinden.
CREATE INDEX IF NOT EXISTS contacts_silence_idx
  ON public.contacts (user_id, last_contact_at)
  WHERE is_archived = false AND is_internal = false;
