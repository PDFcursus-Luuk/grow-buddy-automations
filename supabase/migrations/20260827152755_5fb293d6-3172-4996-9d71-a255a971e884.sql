-- Enums
CREATE TYPE public.crm_stage AS ENUM (
  'new_lead','contacted','demo_scheduled','demo_done','quote_sent',
  'scheduling','training_scheduled','customer','repeat_customer','cold'
);
CREATE TYPE public.next_step_owner AS ENUM ('me','them','none');
CREATE TYPE public.timeline_kind AS ENUM (
  'email_in','email_out','note','meeting','stage_change','task','draft','system'
);
CREATE TYPE public.suggestion_type AS ENUM ('stage_change','follow_up','draft','enrich');
CREATE TYPE public.suggestion_status AS ENUM ('pending','approved','rejected','expired');
CREATE TYPE public.task_status AS ENUM ('open','done','cancelled');
CREATE TYPE public.draft_status AS ENUM ('pending','created','failed','discarded');

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Settings
CREATE TABLE public.crm_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  drive_folder_id text,
  drive_folder_name text,
  silence_days integer NOT NULL DEFAULT 14,
  tone_of_voice text NOT NULL DEFAULT 'Zakelijk maar persoonlijk, kort, Nederlands, geen overdrijving.',
  signature text,
  todoist_project_id text,
  ai_model text NOT NULL DEFAULT 'google/gemini-3.1-flash-lite',
  monthly_token_cap integer NOT NULL DEFAULT 4000000,
  auto_run_enabled boolean NOT NULL DEFAULT true,
  business_context text NOT NULL DEFAULT 'Ik geef PDF-trainingen (pdfcursus.nl) aan bedrijven en teams. Traject: aanvraag, demo/intake, offerte, datum plannen, training geven, vervolgtraining.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_settings TO authenticated;
GRANT ALL ON public.crm_settings TO service_role;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.crm_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER crm_settings_updated_at BEFORE UPDATE ON public.crm_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  domain text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX companies_user_idx ON public.companies (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own companies" ON public.companies FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Contacts
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  job_title text,
  stage public.crm_stage NOT NULL DEFAULT 'new_lead',
  next_step_owner public.next_step_owner NOT NULL DEFAULT 'me',
  next_step text,
  next_step_due date,
  last_contact_at timestamptz,
  last_inbound_at timestamptz,
  ai_summary text,
  group_size integer,
  desired_training_date date,
  deal_value numeric(10,2),
  source text,
  notes text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contacts_user_stage_idx ON public.contacts (user_id, stage);
CREATE UNIQUE INDEX contacts_user_email_idx ON public.contacts (user_id, lower(email)) WHERE email IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts" ON public.contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Timeline
CREATE TABLE public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts ON DELETE CASCADE,
  kind public.timeline_kind NOT NULL,
  title text NOT NULL,
  body text,
  source text NOT NULL DEFAULT 'manual',
  source_ref text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX timeline_contact_idx ON public.timeline_events (contact_id, occurred_at DESC);
CREATE UNIQUE INDEX timeline_source_idx ON public.timeline_events (user_id, source, source_ref) WHERE source_ref IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own timeline" ON public.timeline_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Suggestions
CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts ON DELETE CASCADE,
  type public.suggestion_type NOT NULL,
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  from_stage public.crm_stage,
  to_stage public.crm_stage,
  reason text NOT NULL,
  confidence numeric(3,2),
  proposed_action text,
  proposed_due_date date,
  draft_subject text,
  draft_body text,
  gmail_thread_id text,
  source_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX suggestions_user_status_idx ON public.suggestions (user_id, status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own suggestions" ON public.suggestions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Drafts
CREATE TABLE public.email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts ON DELETE CASCADE,
  suggestion_id uuid REFERENCES public.suggestions ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  gmail_draft_id text,
  gmail_thread_id text,
  status public.draft_status NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX drafts_user_idx ON public.email_drafts (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drafts TO authenticated;
GRANT ALL ON public.email_drafts TO service_role;
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drafts" ON public.email_drafts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER drafts_updated_at BEFORE UPDATE ON public.email_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  due_date date,
  status public.task_status NOT NULL DEFAULT 'open',
  todoist_task_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_user_status_idx ON public.tasks (user_id, status, due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  goal text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.campaign_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns ON DELETE CASCADE,
  step_order integer NOT NULL,
  delay_days integer NOT NULL DEFAULT 7,
  subject_hint text,
  content_goal text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX campaign_steps_order_idx ON public.campaign_steps (campaign_id, step_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_steps TO authenticated;
GRANT ALL ON public.campaign_steps TO service_role;
ALTER TABLE public.campaign_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own campaign steps" ON public.campaign_steps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.campaign_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  next_action_at timestamptz,
  is_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX enrollment_unique_idx ON public.campaign_enrollments (campaign_id, contact_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_enrollments TO authenticated;
GRANT ALL ON public.campaign_enrollments TO service_role;
ALTER TABLE public.campaign_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own enrollments" ON public.campaign_enrollments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON public.campaign_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync state
CREATE TABLE public.sync_state (
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source text NOT NULL,
  cursor_value text,
  last_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_state TO authenticated;
GRANT ALL ON public.sync_state TO service_role;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sync state" ON public.sync_state FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Run logs
CREATE TABLE public.run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trigger text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  emails_seen integer NOT NULL DEFAULT 0,
  notes_seen integer NOT NULL DEFAULT 0,
  contacts_analyzed integer NOT NULL DEFAULT 0,
  suggestions_created integer NOT NULL DEFAULT 0,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX run_logs_user_idx ON public.run_logs (user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.run_logs TO authenticated;
GRANT ALL ON public.run_logs TO service_role;
ALTER TABLE public.run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own run logs" ON public.run_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);