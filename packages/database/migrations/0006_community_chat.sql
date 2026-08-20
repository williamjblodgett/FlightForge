alter table public.users add column if not exists supabase_auth_user_id uuid unique references auth.users(id) on delete set null;
create index if not exists users_supabase_auth_user_idx on public.users(supabase_auth_user_id);
alter table if exists public.rounds add column if not exists last_mutation_id text;

create table if not exists public.hosted_signup_intents (
  nonce uuid primary key, email text not null, terms_version text not null, privacy_version text not null,
  accepted_at timestamptz not null, expires_at timestamptz not null,
  auth_user_id uuid references auth.users(id) on delete cascade, consumed_at timestamptz
);
create index if not exists hosted_signup_intents_email_expiry_idx on public.hosted_signup_intents(email, expires_at);

create table if not exists public.password_recovery_intents (
  token_hash text primary key, auth_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), expires_at timestamptz not null, consumed_at timestamptz
);
create index if not exists password_recovery_intents_user_expiry_idx on public.password_recovery_intents(auth_user_id, expires_at);

create table if not exists public.player_privacy_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  profile_visibility text not null default 'PRIVATE', show_home_city boolean not null default false,
  show_round_history boolean not null default false, show_bag boolean not null default false,
  allow_messages text not null default 'CONNECTIONS', allow_game_invites boolean not null default true,
  analytics_opt_in boolean not null default false, ai_training_opt_in boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  consent_type text not null, policy_version text not null, granted boolean not null,
  recorded_at timestamptz not null default now(), revoked_at timestamptz
);
create index if not exists consent_records_user_type_idx on public.consent_records(user_id, consent_type);
create table if not exists public.community_user_status (
  user_id uuid primary key references public.users(id) on delete cascade, adult_attested_at timestamptz,
  guidelines_version text, guidelines_accepted_at timestamptz, status text not null default 'ACTIVE',
  muted_until timestamptz, suspended_until timestamptz, updated_at timestamptz not null default now()
);
create index if not exists community_user_status_state_idx on public.community_user_status(status, suspended_until);
create table if not exists public.player_connections (
  id uuid primary key default gen_random_uuid(), requester_user_id uuid not null references public.users(id) on delete cascade,
  addressee_user_id uuid not null references public.users(id) on delete cascade, pair_key text not null unique,
  status text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (requester_user_id <> addressee_user_id)
);
create index if not exists player_connections_requester_status_idx on public.player_connections(requester_user_id, status);
create index if not exists player_connections_addressee_status_idx on public.player_connections(addressee_user_id, status);
create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(), blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade, created_at timestamptz not null default now(),
  unique(blocker_user_id, blocked_user_id), check (blocker_user_id <> blocked_user_id)
);
create index if not exists blocked_users_blocked_idx on public.blocked_users(blocked_user_id, blocker_user_id);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), conversation_type text not null,
  subject text, visibility text not null default 'PRIVATE', context_type text, context_id text,
  status text not null default 'ACTIVE', created_by uuid not null references public.users(id),
  last_message_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), version integer not null default 1,
  check (conversation_type in ('DIRECT','PRIVATE_GROUP','PUBLIC_CHANNEL'))
);
create unique index if not exists conversations_public_context_unique on public.conversations(context_type, context_id) where context_type is not null;
create index if not exists conversations_public_updated_idx on public.conversations(conversation_type, status, updated_at desc);
create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, role text not null default 'MEMBER',
  joined_at timestamptz not null default now(), left_at timestamptz, last_read_at timestamptz,
  last_read_message_id uuid, notifications_muted boolean not null default false, unique(conversation_id, user_id)
);
create index if not exists conversation_members_user_active_idx on public.conversation_members(user_id, left_at);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.users(id), body text not null,
  client_message_id text, moderation_status text not null default 'PUBLISHED', moderation_reason text,
  reply_to_message_id uuid references public.messages(id) on delete set null, created_at timestamptz not null default now(),
  edited_at timestamptz, deleted_at timestamptz, version integer not null default 1,
  check (char_length(body) between 1 and 2000), unique(sender_user_id, client_message_id)
);
alter table public.conversation_members drop constraint if exists conversation_members_last_read_message_id_fkey;
alter table public.conversation_members add constraint conversation_members_last_read_message_id_fkey foreign key (last_read_message_id) references public.messages(id) on delete set null;
create index if not exists messages_conversation_cursor_idx on public.messages(conversation_id, created_at desc, id desc);
create index if not exists messages_moderation_idx on public.messages(moderation_status, created_at);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), reporter_user_id uuid not null references public.users(id),
  target_type text not null, target_id text not null, conversation_id uuid references public.conversations(id) on delete set null,
  category text not null, details text, status text not null default 'OPEN', resolved_by uuid references public.users(id),
  resolved_at timestamptz, resolution_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists reports_status_created_idx on public.reports(status, created_at);
create index if not exists reports_target_idx on public.reports(target_type, target_id);
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(), report_id uuid references public.reports(id) on delete set null,
  moderator_user_id uuid not null references public.users(id), action text not null, target_type text not null,
  target_id text not null, reason text not null, metadata_json jsonb, created_at timestamptz not null default now()
);
create index if not exists moderation_actions_target_created_idx on public.moderation_actions(target_type, target_id, created_at);

insert into public.users (id, email, display_name, created_at, updated_at)
values ('00000000-0000-4000-8000-000000000001', 'community-system@flightforge.invalid', 'FlightForge Community', now(), now())
on conflict (id) do nothing;
insert into public.conversations (id, conversation_type, subject, visibility, context_type, context_id, status, created_by)
values
  ('96cc0000-0000-4000-8000-000000000001','PUBLIC_CHANNEL','New England Clubhouse','PUBLIC','REGION','new-england','ACTIVE','00000000-0000-4000-8000-000000000001'),
  ('96cc0000-0000-4000-8000-000000000002','PUBLIC_CHANNEL','Maine Clubhouse','PUBLIC','STATE','ME','ACTIVE','00000000-0000-4000-8000-000000000001'),
  ('96cc0000-0000-4000-8000-000000000003','PUBLIC_CHANNEL','New Hampshire Clubhouse','PUBLIC','STATE','NH','ACTIVE','00000000-0000-4000-8000-000000000001'),
  ('96cc0000-0000-4000-8000-000000000004','PUBLIC_CHANNEL','Vermont Clubhouse','PUBLIC','STATE','VT','ACTIVE','00000000-0000-4000-8000-000000000001'),
  ('96cc0000-0000-4000-8000-000000000005','PUBLIC_CHANNEL','Massachusetts Clubhouse','PUBLIC','STATE','MA','ACTIVE','00000000-0000-4000-8000-000000000001'),
  ('96cc0000-0000-4000-8000-000000000006','PUBLIC_CHANNEL','Connecticut Clubhouse','PUBLIC','STATE','CT','ACTIVE','00000000-0000-4000-8000-000000000001'),
  ('96cc0000-0000-4000-8000-000000000007','PUBLIC_CHANNEL','Rhode Island Clubhouse','PUBLIC','STATE','RI','ACTIVE','00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

alter table public.player_privacy_settings enable row level security;
alter table public.consent_records enable row level security;
alter table public.community_user_status enable row level security;
alter table public.player_connections enable row level security;
alter table public.blocked_users enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.hosted_signup_intents enable row level security;
alter table public.password_recovery_intents enable row level security;

create or replace function public.current_flightforge_user_id() returns uuid language sql stable security definer set search_path = public
as $$ select id from public.users where supabase_auth_user_id = auth.uid() limit 1 $$;
revoke all on function public.current_flightforge_user_id() from public;
grant execute on function public.current_flightforge_user_id() to authenticated;

create or replace function public.is_community_conversation_member(requested_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members member
    where member.conversation_id = requested_conversation_id
      and member.user_id = public.current_flightforge_user_id()
      and member.left_at is null
  )
$$;
revoke all on function public.is_community_conversation_member(uuid) from public;
grant execute on function public.is_community_conversation_member(uuid) to authenticated;

drop policy if exists "users read own privacy" on public.player_privacy_settings;
drop policy if exists "users update own privacy" on public.player_privacy_settings;
drop policy if exists "users read own community status" on public.community_user_status;
drop policy if exists "members read conversations" on public.conversations;
drop policy if exists "members read memberships" on public.conversation_members;
drop policy if exists "members read published messages" on public.messages;
create policy "users read own privacy" on public.player_privacy_settings for select to authenticated using (user_id = public.current_flightforge_user_id());
create policy "users update own privacy" on public.player_privacy_settings for update to authenticated using (user_id = public.current_flightforge_user_id()) with check (user_id = public.current_flightforge_user_id());
create policy "users read own community status" on public.community_user_status for select to authenticated using (user_id = public.current_flightforge_user_id());
create policy "members read conversations" on public.conversations for select to authenticated using (public.is_community_conversation_member(id));
create policy "members read memberships" on public.conversation_members for select to authenticated using (public.is_community_conversation_member(conversation_id));
create policy "members read published messages" on public.messages for select to authenticated using (moderation_status = 'PUBLISHED' and public.is_community_conversation_member(conversation_id));

revoke insert, update, delete on public.conversations, public.conversation_members, public.messages,
  public.player_connections, public.blocked_users, public.reports, public.moderation_actions,
  public.community_user_status, public.consent_records from anon, authenticated;
revoke all on public.hosted_signup_intents from anon, authenticated;
revoke all on public.password_recovery_intents from anon, authenticated;
