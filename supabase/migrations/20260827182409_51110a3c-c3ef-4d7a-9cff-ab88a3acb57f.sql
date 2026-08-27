CREATE TYPE public.contact_track AS ENUM ('cursus', 'calculatie', 'overig');

ALTER TABLE public.contacts
  ADD COLUMN track public.contact_track NOT NULL DEFAULT 'cursus',
  ADD COLUMN is_internal boolean NOT NULL DEFAULT false;

CREATE INDEX contacts_track_idx ON public.contacts (user_id, track, is_internal);

ALTER TABLE public.crm_settings
  ADD COLUMN ignore_patterns text[] NOT NULL DEFAULT ARRAY['lmcalculatie.nl', 'pdfcursus.nl', 'accountable.eu', 'ausgaben@accountable.eu']::text[];