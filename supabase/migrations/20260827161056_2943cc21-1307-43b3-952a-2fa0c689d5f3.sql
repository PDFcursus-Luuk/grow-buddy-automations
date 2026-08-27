create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.cron_secrets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  token text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now()
);

grant all on public.cron_secrets to service_role;
alter table public.cron_secrets enable row level security;

insert into public.cron_secrets (name) values ('assistant_run')
on conflict (name) do nothing;

select cron.unschedule(jobname) from cron.job where jobname in ('assistant-run-morning','assistant-run-afternoon');

select cron.schedule(
  'assistant-run-morning',
  '30 6 * * *',
  $$select net.http_post(
      url := 'https://project--5763d01d-9080-4f94-86bb-48f4787704c3.lovable.app/api/public/assistant-run',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select token from public.cron_secrets where name = 'assistant_run')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
  )$$
);

select cron.schedule(
  'assistant-run-afternoon',
  '30 15 * * *',
  $$select net.http_post(
      url := 'https://project--5763d01d-9080-4f94-86bb-48f4787704c3.lovable.app/api/public/assistant-run',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select token from public.cron_secrets where name = 'assistant_run')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
  )$$
);