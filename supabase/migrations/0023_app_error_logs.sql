-- Client/runtime error log for debugging "stuck loading" and user-facing failures

create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  source text not null,
  code text,
  message text not null,
  stack text,
  context jsonb not null default '{}'::jsonb,
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_error_logs_created
  on public.app_error_logs (created_at desc);

create index if not exists idx_app_error_logs_source
  on public.app_error_logs (source, created_at desc);

create index if not exists idx_app_error_logs_user
  on public.app_error_logs (user_id, created_at desc);

alter table public.app_error_logs enable row level security;

-- Users cannot read others' errors; admins can read all
drop policy if exists app_error_logs_read_admin on public.app_error_logs;
create policy app_error_logs_read_admin
on public.app_error_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active
  )
);

-- Insert only via RPC (security definer)
drop policy if exists app_error_logs_no_direct_insert on public.app_error_logs;
-- no insert/update/delete policies for authenticated → blocked by default when RLS on

create or replace function public.log_app_error(
  p_source text,
  p_message text,
  p_code text default null,
  p_stack text default null,
  p_context jsonb default '{}'::jsonb,
  p_app_version text default null,
  p_platform text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_source is null or length(trim(p_source)) = 0 then
    raise exception 'SOURCE_REQUIRED';
  end if;
  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'MESSAGE_REQUIRED';
  end if;

  insert into public.app_error_logs (
    user_id,
    source,
    code,
    message,
    stack,
    context,
    app_version,
    platform
  )
  values (
    auth.uid(),
    left(trim(p_source), 120),
    nullif(left(trim(coalesce(p_code, '')), 120), ''),
    left(trim(p_message), 2000),
    nullif(left(coalesce(p_stack, ''), 8000), ''),
    coalesce(p_context, '{}'::jsonb),
    nullif(left(trim(coalesce(p_app_version, '')), 40), ''),
    nullif(left(trim(coalesce(p_platform, '')), 40), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_app_error(text, text, text, text, jsonb, text, text) from public;
grant execute on function public.log_app_error(text, text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.log_app_error(text, text, text, text, jsonb, text, text) to anon;

comment on table public.app_error_logs is
  'Client/runtime errors for debugging user issues';
comment on function public.log_app_error(text, text, text, text, jsonb, text, text) is
  'Insert an app error log row (caller may be anon or authenticated)';
