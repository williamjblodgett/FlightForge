create table if not exists public.caddie_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  knowledge_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists caddie_conversations_user_updated_idx on public.caddie_conversations(user_id, updated_at desc);

create table if not exists public.caddie_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.caddie_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  provider text,
  model_version text,
  confidence text,
  safety_result text,
  created_at timestamptz not null default now()
);
create index if not exists caddie_messages_conversation_created_idx on public.caddie_messages(conversation_id, created_at);

alter table public.caddie_conversations enable row level security;
alter table public.caddie_messages enable row level security;
create policy "caddie conversations belong to user" on public.caddie_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "caddie messages belong to user" on public.caddie_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
