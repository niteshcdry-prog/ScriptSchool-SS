create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('course', 'module', 'lesson')),
  entity_id text not null,
  title text not null,
  published boolean not null default false,
  note text not null default '',
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  actor_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index content_versions_entity_created_idx
  on public.content_versions (entity_type, entity_id, created_at desc);

alter table public.content_versions enable row level security;

revoke all on public.content_versions from anon, authenticated;
grant all on public.content_versions to service_role;

create function public.admin_save_content_version(
  p_actor_id uuid,
  p_entity_type text,
  p_entity_id text,
  p_title text,
  p_published boolean,
  p_note text,
  p_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;
  if p_entity_type not in ('course', 'module', 'lesson')
    or p_entity_id is null
    or length(p_entity_id) > 100
    or p_title is null
    or length(p_title) > 160
    or p_note is null
    or length(p_note) > 500
    or jsonb_typeof(p_snapshot) <> 'object'
    or octet_length(p_snapshot::text) > 100000 then
    raise exception 'Invalid content version';
  end if;
  if p_entity_type = 'course' and not exists (select 1 from public.courses where id = p_entity_id)
    or p_entity_type = 'module' and not exists (select 1 from public.modules where id = p_entity_id)
    or p_entity_type = 'lesson' and not exists (select 1 from public.lessons where id = p_entity_id) then
    raise exception 'Content item not found';
  end if;

  insert into public.content_versions (entity_type, entity_id, title, published, note, snapshot, actor_id)
  values (p_entity_type, p_entity_id, p_title, p_published, p_note, p_snapshot, p_actor_id)
  returning id into v_version_id;

  delete from public.content_versions
  where entity_type = p_entity_type
    and entity_id = p_entity_id
    and id not in (
      select id
      from public.content_versions
      where entity_type = p_entity_type and entity_id = p_entity_id
      order by created_at desc, id desc
      limit 8
    );

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'version', p_entity_type, p_entity_id,
    jsonb_build_object('versionId', v_version_id, 'published', p_published, 'note', p_note));

  return v_version_id;
end;
$$;

revoke execute on function public.admin_save_content_version(uuid, text, text, text, boolean, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_content_version(uuid, text, text, text, boolean, text, jsonb) to service_role;

create function public.admin_publish_course(p_actor_id uuid, p_course jsonb, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course jsonb;
  v_version_id uuid;
begin
  v_course := jsonb_set(p_course, '{published}', 'true'::jsonb, true);
  perform public.admin_save_course(p_actor_id, v_course);
  v_version_id := public.admin_save_content_version(
    p_actor_id,
    'course',
    v_course ->> 'id',
    v_course ->> 'title',
    true,
    coalesce(p_note, 'Published to learners'),
    v_course
  );
  return v_version_id;
end;
$$;

create function public.admin_publish_lesson(p_actor_id uuid, p_lesson jsonb, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson jsonb;
  v_version_id uuid;
begin
  v_lesson := jsonb_set(p_lesson, '{published}', 'true'::jsonb, true);
  perform public.admin_save_lesson(p_actor_id, v_lesson);
  v_version_id := public.admin_save_content_version(
    p_actor_id,
    'lesson',
    v_lesson ->> 'id',
    v_lesson ->> 'title',
    true,
    coalesce(p_note, 'Published to learners'),
    v_lesson
  );
  return v_version_id;
end;
$$;

revoke execute on function public.admin_publish_course(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.admin_publish_lesson(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.admin_publish_course(uuid, jsonb, text) to service_role;
grant execute on function public.admin_publish_lesson(uuid, jsonb, text) to service_role;
