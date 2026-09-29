-- System reference data: subscription plans and their entitlement limits.
-- `-1` is the "unlimited" sentinel for numeric caps. `advanced_layout` is
-- 'basic' | 'full' (doc says "temel"/"tam").
create table public.plans (
  id text primary key,
  name text not null,
  entitlements jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

-- System data: readable by everyone (including anonymous, e.g. pricing page),
-- writable only by migrations / service role.
create policy "plans_select_active" on public.plans
  for select
  to anon, authenticated
  using (is_active);

insert into public.plans (id, name, entitlements) values
  ('free', 'Ücretsiz', jsonb_build_object(
    'questions_per_test', 20,
    'pdf_exports_per_month', 10,
    'versions_per_test', 2,
    'bank_questions', 100,
    'storage_mb', 250,
    'ai_credits_per_month', 10,
    'omr_scans_per_month', 30,
    'online_participants_per_exam', 20,
    'live_exams_concurrent', 1,
    'advanced_layout', 'basic',
    'remove_branding', false,
    'docx_pptx_export', false,
    'iframe_embed', false,
    'seats', 1,
    'api_webhooks', false
  )),
  ('plus', 'Plus', jsonb_build_object(
    'questions_per_test', 100,
    'pdf_exports_per_month', -1,
    'versions_per_test', 4,
    'bank_questions', 5000,
    'storage_mb', 5000,
    'ai_credits_per_month', 300,
    'omr_scans_per_month', 500,
    'online_participants_per_exam', 250,
    'live_exams_concurrent', 10,
    'advanced_layout', 'full',
    'remove_branding', true,
    'docx_pptx_export', true,
    'iframe_embed', false,
    'seats', 1,
    'api_webhooks', false
  )),
  ('pro', 'Pro', jsonb_build_object(
    'questions_per_test', 200,
    'pdf_exports_per_month', -1,
    'versions_per_test', 4,
    'bank_questions', 25000,
    'storage_mb', 20000,
    'ai_credits_per_month', 1500,
    'omr_scans_per_month', 3000,
    'online_participants_per_exam', 1000,
    'live_exams_concurrent', 50,
    'advanced_layout', 'full',
    'remove_branding', true,
    'docx_pptx_export', true,
    'iframe_embed', true,
    'seats', 3,
    'api_webhooks', false
  )),
  ('team', 'Kurum', jsonb_build_object(
    'questions_per_test', 300,
    'pdf_exports_per_month', -1,
    'versions_per_test', 4,
    'bank_questions', 100000,
    'storage_mb', 100000,
    'ai_credits_per_month', -1,
    'omr_scans_per_month', -1,
    'online_participants_per_exam', 5000,
    'live_exams_concurrent', 200,
    'advanced_layout', 'full',
    'remove_branding', true,
    'docx_pptx_export', true,
    'iframe_embed', true,
    'seats', 10,
    'api_webhooks', true
  ))
on conflict (id) do nothing;
