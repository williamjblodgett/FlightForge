-- Browser clients receive only explicitly public directory/event reads.
-- All writes and all private reads remain server-side through the service role.
alter table public.users enable row level security;
alter table public.player_profiles enable row level security;
alter table public.player_preferences enable row level security;
alter table public.player_privacy_settings enable row level security;
alter table public.course_claims enable row level security;
alter table public.course_claim_evidence enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_course_access enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.rounds enable row level security;
alter table public.scorecards enable row level security;
alter table public.hole_scores enable row level security;
alter table public.round_score_audit_events enable row level security;
alter table public.hole_highlight_videos enable row level security;
alter table public.email_verification_tokens enable row level security;
alter table public.coordinator_applications enable row level security;
alter table public.course_correction_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_records enable row level security;

alter table public.courses enable row level security;
alter table public.course_locations enable row level security;
alter table public.course_sources enable row level security;
alter table public.course_evidence enable row level security;

drop policy if exists "public published courses" on public.courses;
create policy "public published courses" on public.courses for select to anon, authenticated using (is_published = true and deleted_at is null);
drop policy if exists "public course locations" on public.course_locations;
create policy "public course locations" on public.course_locations for select to anon, authenticated using (exists (select 1 from public.courses c where c.id = course_locations.course_id and c.is_published = true and c.deleted_at is null));
drop policy if exists "public course sources" on public.course_sources;
create policy "public course sources" on public.course_sources for select to anon, authenticated using (exists (select 1 from public.courses c where c.id = course_sources.course_id and c.is_published = true and c.deleted_at is null));
drop policy if exists "public approved evidence" on public.course_evidence;
create policy "public approved evidence" on public.course_evidence for select to anon, authenticated using (review_status in ('CURRENT', 'REVIEW_DUE'));
drop policy if exists "public published events" on public.events;
create policy "public published events" on public.events for select to anon, authenticated using (status in ('PUBLISHED', 'CANCELLED') and visibility = 'PUBLIC');
drop policy if exists "public sanitized approved highlights" on public.hole_highlight_videos;
drop policy if exists "approved hole highlights are readable" on public.hole_highlight_videos;
create policy "public sanitized approved highlights" on public.hole_highlight_videos for select to anon, authenticated using (moderation_status = 'APPROVED' and sanitization_status = 'CLEAN' and sanitized_storage_key is not null and deleted_at is null);

revoke all on public.email_verification_tokens, public.course_claim_evidence, public.audit_logs,
  public.round_score_audit_events, public.organization_memberships, public.organization_course_access
  from anon, authenticated;
