create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique, expires_at timestamptz not null, consumed_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists email_verification_tokens_user_idx on public.email_verification_tokens(user_id, expires_at);

create table if not exists public.organization_course_access (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (organization_id, course_id)
);

create table if not exists public.course_correction_requests (
  id uuid primary key default gen_random_uuid(), course_id uuid references public.courses(id), course_name text not null,
  reporter_name text not null, reporter_email text not null, correction_type text not null,
  details text not null, source_url text, status text not null default 'PENDING',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists course_correction_requests_status_idx on public.course_correction_requests(status, created_at);

create table if not exists public.coordinator_applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  organization_id uuid references public.organizations(id), organization_name text not null,
  course_id uuid references public.courses(id), requested_role text not null, experience text not null,
  status text not null default 'PENDING', reviewed_by uuid references public.users(id), review_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists coordinator_applications_status_idx on public.coordinator_applications(status, created_at);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  organizer_user_id uuid not null references public.users(id), organization_id uuid references public.organizations(id),
  title text not null, event_type text not null, course_id uuid references public.courses(id), layout_id text,
  time_zone text not null default 'America/New_York', hole_count integer not null default 18,
  starts_at timestamptz not null, ends_at timestamptz not null, status text not null default 'DRAFT',
  visibility text not null default 'PUBLIC', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), version integer not null default 1
);
alter table public.events add column if not exists time_zone text not null default 'America/New_York';
alter table public.events add column if not exists layout_id uuid;
alter table public.events add column if not exists hole_count integer not null default 18;

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, course_id uuid not null references public.courses(id),
  layout_id uuid, status text not null default 'REGISTERED', created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(event_id, user_id)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id), layout_id text,
  event_id uuid references public.events(id), created_by uuid not null references public.users(id),
  status text not null, scoring_format text not null, started_at timestamptz, completed_at timestamptz,
  client_sync_id text unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  version integer not null default 1
);
create table if not exists public.scorecards (
  id uuid primary key default gen_random_uuid(), round_id uuid not null references public.rounds(id) on delete cascade,
  user_id uuid not null references public.users(id), total_score integer, score_relative_to_par integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);

alter table public.hole_highlight_videos add column if not exists layout_id uuid;
alter table public.hole_highlight_videos add column if not exists participant_id uuid references public.event_participants(id);
alter table public.hole_highlight_videos add column if not exists sanitized_storage_key text;
alter table public.hole_highlight_videos add column if not exists sanitization_status text not null default 'QUARANTINED';
alter table public.hole_highlight_videos add column if not exists sanitization_reason text;
alter table public.hole_highlight_videos add column if not exists duration_source text not null default 'SERVER_PROBED';
alter table public.hole_highlight_videos add column if not exists transcript text;
alter table public.hole_highlight_videos add column if not exists captions_vtt text;
create index if not exists hole_highlight_videos_sanitization_idx on public.hole_highlight_videos(sanitization_status, created_at);

create table if not exists public.round_score_audit_events (
  id uuid primary key default gen_random_uuid(), round_id uuid not null references public.rounds(id) on delete cascade,
  scorecard_id uuid not null references public.scorecards(id) on delete cascade, hole_number integer not null,
  actor_user_id uuid not null references public.users(id), from_strokes integer, to_strokes integer not null,
  from_penalties integer, to_penalties integer not null, client_mutation_id text not null unique,
  created_at timestamptz not null default now()
);

update public.course_evidence set review_status = case
  when valid_until is null then 'REVIEW_DUE'
  when valid_until < now() then 'STALE'
  when valid_until < now() + interval '30 days' then 'REVIEW_DUE'
  else 'CURRENT' end;
alter table public.course_evidence alter column review_status set default 'CURRENT';
