create table public.lesson_prerequisites (
  lesson_id text not null references public.lessons (id) on delete cascade,
  prerequisite_lesson_id text not null references public.lessons (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lesson_id, prerequisite_lesson_id),
  check (lesson_id <> prerequisite_lesson_id)
);

create index lesson_prerequisites_lookup_idx
  on public.lesson_prerequisites (prerequisite_lesson_id, lesson_id);

alter table public.lesson_prerequisites enable row level security;

grant select on public.lesson_prerequisites to anon, authenticated;
grant all on public.lesson_prerequisites to service_role;

create policy "Read prerequisites of published lessons"
  on public.lesson_prerequisites for select to anon, authenticated
  using (
    exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where lessons.id = lesson_prerequisites.lesson_id
        and lessons.published and courses.published
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
) ordered_lessons
where prerequisite_lesson_id is not null;

drop function public.admin_save_lesson(uuid, jsonb);

create function public.admin_save_lesson(p_actor_id uuid, p_lesson jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_id uuid;
  v_correct_option_id uuid;
  v_option record;
  v_answer_index integer;
  v_prerequisite_id text;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;
  if coalesce(jsonb_typeof(p_lesson -> 'options'), 'null') <> 'array'
    or jsonb_array_length(p_lesson -> 'options') < 2
    or jsonb_array_length(p_lesson -> 'options') > 8 then
    raise exception 'A lesson quiz must have between two and eight options';
  end if;
  if coalesce(jsonb_typeof(p_lesson -> 'prerequisiteIds'), 'array') <> 'array'
    or jsonb_array_length(coalesce(p_lesson -> 'prerequisiteIds', '[]'::jsonb)) > 50 then
    raise exception 'A lesson can have at most 50 prerequisites';
  end if;

  v_answer_index := (p_lesson ->> 'answer')::integer;
  insert into public.lessons (
    id, module_id, title, icon, duration, level, description,
    explanation, code, tip, practice_prompt, practice_starter,
    practice_hint, practice_solution, quiz_explanation, sort_order, published
  ) values (
    p_lesson ->> 'id',
    p_lesson ->> 'moduleId',
    p_lesson ->> 'title',
    p_lesson ->> 'icon',
    (p_lesson ->> 'duration')::integer,
    p_lesson ->> 'level',
    p_lesson ->> 'description',
    p_lesson ->> 'explanation',
    p_lesson ->> 'code',
    p_lesson ->> 'tip',
    coalesce(p_lesson ->> 'practicePrompt', ''),
    coalesce(p_lesson ->> 'practiceStarter', ''),
    coalesce(p_lesson ->> 'practiceHint', ''),
    coalesce(p_lesson ->> 'practiceSolution', ''),
    coalesce(p_lesson ->> 'quizExplanation', ''),
    (p_lesson ->> 'sortOrder')::integer,
    (p_lesson ->> 'published')::boolean
  )
  on conflict (id) do update set
    module_id = excluded.module_id,
    title = excluded.title,
    icon = excluded.icon,
    duration = excluded.duration,
    level = excluded.level,
    description = excluded.description,
    explanation = excluded.explanation,
    code = excluded.code,
    tip = excluded.tip,
    practice_prompt = excluded.practice_prompt,
    practice_starter = excluded.practice_starter,
    practice_hint = excluded.practice_hint,
    practice_solution = excluded.practice_solution,
    quiz_explanation = excluded.quiz_explanation,
    sort_order = excluded.sort_order,
    published = excluded.published,
    updated_at = now();

  delete from public.lesson_prerequisites where lesson_id = p_lesson ->> 'id';
  for v_prerequisite_id in
    select jsonb_array_elements_text(coalesce(p_lesson -> 'prerequisiteIds', '[]'::jsonb))
  loop
    if v_prerequisite_id = p_lesson ->> 'id'
      or not exists (select 1 from public.lessons where id = v_prerequisite_id) then
      raise exception 'A prerequisite must be a different existing lesson';
    end if;
    insert into public.lesson_prerequisites (lesson_id, prerequisite_lesson_id)
    values (p_lesson ->> 'id', v_prerequisite_id);
  end loop;

  if exists (
    with recursive prerequisite_walk(lesson_id) as (
      select prerequisite_lesson_id
      from public.lesson_prerequisites
      where lesson_id = p_lesson ->> 'id'
      union
      select prerequisites.prerequisite_lesson_id
      from public.lesson_prerequisites prerequisites
      join prerequisite_walk walk on prerequisites.lesson_id = walk.lesson_id
    )
    select 1 from prerequisite_walk where lesson_id = p_lesson ->> 'id'
  ) then
    raise exception 'Lesson prerequisites cannot contain a cycle';
  end if;

  insert into public.quiz_questions (lesson_id, prompt)
  values (p_lesson ->> 'id', p_lesson ->> 'quiz')
  on conflict (lesson_id) do update set prompt = excluded.prompt
  returning id into v_question_id;

  delete from public.quiz_options where question_id = v_question_id;
  for v_option in
    select element.value #>> '{}' as label, element.ordinality::integer - 1 as option_index
    from jsonb_array_elements(p_lesson -> 'options') with ordinality as element(value, ordinality)
  loop
    insert into public.quiz_options (question_id, label, sort_order)
    values (v_question_id, v_option.label, v_option.option_index);
  end loop;

  select quiz_options.id into v_correct_option_id
  from public.quiz_options
  where quiz_options.question_id = v_question_id
    and quiz_options.sort_order = v_answer_index;

  if v_correct_option_id is null then
    raise exception 'Correct quiz option index is outside the option list';
  end if;

  insert into public.quiz_answers (question_id, correct_option_id)
  values (v_question_id, v_correct_option_id)
  on conflict (question_id) do update set correct_option_id = excluded.correct_option_id;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'upsert', 'lesson', p_lesson ->> 'id',
    jsonb_build_object('published', (p_lesson ->> 'published')::boolean,
      'prerequisiteCount', jsonb_array_length(coalesce(p_lesson -> 'prerequisiteIds', '[]'::jsonb))));
end;
$$;

revoke execute on function public.admin_save_lesson(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_lesson(uuid, jsonb) to service_role;
