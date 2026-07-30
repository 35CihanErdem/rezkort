-- Expo / device push token storage (remote push için; hatırlatmalar şimdilik local)

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web', 'unknown')),
  device_id text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_push_tokens_user_active
  on public.push_tokens (user_id)
  where is_active = true;

drop trigger if exists trg_push_tokens_updated_at on public.push_tokens;
create trigger trg_push_tokens_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own
on public.push_tokens
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own
on public.push_tokens
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own
on public.push_tokens
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own
on public.push_tokens
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.upsert_push_token(
  p_token text,
  p_platform text,
  p_device_id text default null
)
returns public.push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.push_tokens%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_token is null or length(trim(p_token)) < 10 then
    raise exception 'INVALID_TOKEN';
  end if;

  if p_platform not in ('android', 'ios', 'web', 'unknown') then
    p_platform := 'unknown';
  end if;

  insert into public.push_tokens (user_id, token, platform, device_id, is_active, last_seen_at)
  values (v_user_id, trim(p_token), p_platform, p_device_id, true, now())
  on conflict (user_id, token) do update
    set platform = excluded.platform,
        device_id = coalesce(excluded.device_id, public.push_tokens.device_id),
        is_active = true,
        last_seen_at = now(),
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.upsert_push_token(text, text, text) to authenticated;
