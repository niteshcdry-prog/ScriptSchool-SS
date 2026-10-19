alter table public.courses
  add column language text not null default 'javascript',
  add column difficulty_level text not null default 'Beginner to Advanced',
  add column estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  add column recommended_prerequisites text[] not null default '{}',
  add column learning_outcomes text[] not null default '{}';

update public.courses
set published = false,
    updated_at = now()
where id in (
  'browser-dom-development',
  'modern-javascript',
  'asynchronous-javascript',
  'advanced-javascript-practice'
);

update public.modules
set course_id = 'javascript-foundations'
where course_id in (
  'browser-dom-development',
  'modern-javascript',
  'asynchronous-javascript',
  'advanced-javascript-practice'
);

create or replace function public.admin_save_course(p_actor_id uuid, p_course jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;

  insert into public.courses (
    id, title, description, published, language, difficulty_level,
    estimated_minutes, recommended_prerequisites, learning_outcomes
  ) values (
    p_course ->> 'id',
    p_course ->> 'title',
    p_course ->> 'description',
    (p_course ->> 'published')::boolean,
    coalesce(p_course ->> 'language', 'javascript'),
    coalesce(p_course ->> 'level', 'Beginner'),
    coalesce((p_course ->> 'estimatedMinutes')::integer, 0),
    coalesce(array(select jsonb_array_elements_text(p_course -> 'recommendedPrerequisites')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_course -> 'learningOutcomes')), '{}')
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    published = excluded.published,
    language = excluded.language,
    difficulty_level = excluded.difficulty_level,
    estimated_minutes = excluded.estimated_minutes,
    recommended_prerequisites = excluded.recommended_prerequisites,
    learning_outcomes = excluded.learning_outcomes,
    updated_at = now();

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'upsert', 'course', p_course ->> 'id',
    jsonb_build_object('published', (p_course ->> 'published')::boolean));
end;
$$;

delete from public.lesson_prerequisites
where lesson_id in (
  select lessons.id
  from public.lessons
  join public.modules on modules.id = lessons.module_id
  where modules.id in (
    'core', 'control-flow', 'data', 'functions',
    'dom', 'modern-js', 'async', 'advanced-practice'
  )
);

insert into public.lesson_prerequisites (lesson_id, prerequisite_lesson_id)
select lesson_id, prerequisite_lesson_id
from (
  select
    lessons.id as lesson_id,
    lag(lessons.id) over (
      partition by modules.course_id
      order by modules.sort_order, lessons.sort_order, lessons.id
    ) as prerequisite_lesson_id
  from public.lessons
  join public.modules on modules.id = lessons.module_id
  where modules.course_id = 'javascript-foundations'
) ordered_lessons
where prerequisite_lesson_id is not null;
