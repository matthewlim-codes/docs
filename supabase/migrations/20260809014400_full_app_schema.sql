do $$
begin
  create type public.conversation_type as enum ('direct', 'group');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_request_status as enum ('pending', 'accepted', 'declined');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  title text,
  direct_key text unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_group_title check (
    type = 'direct' or nullif(trim(coalesce(title, '')), '') is not null
  ),
  constraint conversations_direct_key check (
    (type = 'direct' and direct_key is not null and title is null)
    or
    (type = 'group' and direct_key is null)
  )
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_content_length check (char_length(trim(content)) between 1 and 4000),
  constraint messages_attachments_array check (jsonb_typeof(attachments) = 'array')
);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id),
  constraint message_reactions_allowed check (reaction in ('heart', 'thumbs_up', 'haha', 'exclamation', 'question'))
);

create table if not exists public.message_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status public.message_request_status not null default 'pending',
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_requests_not_self check (sender_id <> receiver_id),
  constraint message_requests_unique_pair unique (sender_id, receiver_id)
);

create index if not exists conversation_members_user_id_idx on public.conversation_members(user_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists message_requests_receiver_status_idx on public.message_requests(receiver_id, status);
create index if not exists message_requests_sender_status_idx on public.message_requests(sender_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists message_requests_set_updated_at on public.message_requests;
create trigger message_requests_set_updated_at
  before update on public.message_requests
  for each row execute function public.set_updated_at();

create or replace function public.is_conversation_member(check_conversation_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = check_conversation_id
      and user_id = check_user_id
  );
$$;

create or replace function public.can_manage_conversation(check_conversation_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations
    where id = check_conversation_id
      and created_by = check_user_id
  ) or public.is_conversation_member(check_conversation_id, check_user_id);
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_requests enable row level security;

drop policy if exists "Authenticated users can read profiles for discovery" on public.profiles;
drop policy if exists "Profiles are readable when public or owned" on public.profiles;
create policy "Profiles are readable for discovery"
  on public.profiles
  for select
  using (auth.uid() is not null or is_private = false or auth.uid() = id);

drop policy if exists "Members can read conversations" on public.conversations;
create policy "Members can read conversations"
  on public.conversations
  for select
  using (public.is_conversation_member(id, auth.uid()));

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
  on public.conversations
  for insert
  with check (auth.uid() = created_by);

drop policy if exists "Members can update conversations" on public.conversations;
create policy "Members can update conversations"
  on public.conversations
  for update
  using (public.is_conversation_member(id, auth.uid()))
  with check (public.is_conversation_member(id, auth.uid()));

drop policy if exists "Members can read conversation members" on public.conversation_members;
create policy "Members can read conversation members"
  on public.conversation_members
  for select
  using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Conversation creators can add members" on public.conversation_members;
create policy "Conversation creators can add members"
  on public.conversation_members
  for insert
  with check (
    user_id = auth.uid()
    or public.can_manage_conversation(conversation_id, auth.uid())
  );

drop policy if exists "Users can update their read state" on public.conversation_members;
create policy "Users can update their read state"
  on public.conversation_members
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Members can read messages" on public.messages;
create policy "Members can read messages"
  on public.messages
  for select
  using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
  on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
  );

drop policy if exists "Members can read reactions" on public.message_reactions;
create policy "Members can read reactions"
  on public.message_reactions
  for select
  using (
    exists (
      select 1
      from public.messages
      where messages.id = message_reactions.message_id
        and public.is_conversation_member(messages.conversation_id, auth.uid())
    )
  );

drop policy if exists "Members can react to messages" on public.message_reactions;
create policy "Members can react to messages"
  on public.message_reactions
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages
      where messages.id = message_reactions.message_id
        and public.is_conversation_member(messages.conversation_id, auth.uid())
    )
  );

drop policy if exists "Users can update their reactions" on public.message_reactions;
create policy "Users can update their reactions"
  on public.message_reactions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their reactions" on public.message_reactions;
create policy "Users can delete their reactions"
  on public.message_reactions
  for delete
  using (user_id = auth.uid());

drop policy if exists "Users can read their message requests" on public.message_requests;
create policy "Users can read their message requests"
  on public.message_requests
  for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "Users can create message requests" on public.message_requests;
create policy "Users can create message requests"
  on public.message_requests
  for insert
  with check (sender_id = auth.uid() and status = 'pending');

drop policy if exists "Receivers can respond to message requests" on public.message_requests;
create policy "Receivers can respond to message requests"
  on public.message_requests
  for update
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.message_reactions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.message_requests;
exception
  when duplicate_object then null;
end $$;
