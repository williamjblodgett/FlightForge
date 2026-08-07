alter table public.courses add column if not exists facility_id text;
alter table public.courses add column if not exists record_type text not null default 'COURSE';
alter table public.courses add column if not exists next_review_due_at timestamptz;
alter table public.courses add column if not exists archived_reason text;
alter table public.course_sources add column if not exists valid_until timestamptz;
alter table public.course_sources add column if not exists supported_fields jsonb;

create table if not exists public.course_evidence (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  source_id uuid not null references public.course_sources(id) on delete cascade,
  field_code text not null,
  evidence_value text,
  checked_at timestamptz not null,
  valid_until timestamptz,
  review_status text not null default 'APPROVED',
  reviewed_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  constraint course_evidence_course_source_field_unique unique (course_id, source_id, field_code)
);

create index if not exists course_evidence_review_due_idx
  on public.course_evidence(review_status, valid_until);
