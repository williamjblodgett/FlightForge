create table if not exists public.hole_highlight_videos (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  event_id text not null,
  hole_number integer not null check (hole_number between 1 and 36),
  uploader_user_id uuid not null references public.users(id) on delete restrict,
  uploader_display_name text not null,
  storage_key text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 26214400),
  duration_ms integer not null check (duration_ms > 0 and duration_ms <= 60000),
  caption text not null default '',
  moderation_status text not null default 'PENDING' check (moderation_status in ('PENDING', 'APPROVED', 'REJECTED')),
  moderation_reason text,
  moderated_by uuid references public.users(id),
  moderated_at timestamptz,
  rights_confirmed boolean not null,
  participant_consent_confirmed boolean not null,
  minor_present boolean not null default false,
  guardian_consent_confirmed boolean not null default false,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (not minor_present or guardian_consent_confirmed)
);
create index if not exists hole_highlight_videos_scorecard_idx on public.hole_highlight_videos(course_id, event_id, hole_number, moderation_status);
create index if not exists hole_highlight_videos_moderation_idx on public.hole_highlight_videos(moderation_status, created_at);
create index if not exists hole_highlight_videos_uploader_idx on public.hole_highlight_videos(uploader_user_id, created_at);

alter table public.hole_highlight_videos enable row level security;
create policy "approved hole highlights are readable" on public.hole_highlight_videos for select using (moderation_status = 'APPROVED' and deleted_at is null);
