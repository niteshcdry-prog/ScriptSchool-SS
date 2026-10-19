alter table public.lessons
  add column practice_prompt text not null default '',
  add column practice_starter text not null default '',
  add column practice_hint text not null default '',
  add column practice_solution text not null default '',
  add column quiz_explanation text not null default '';

create or replace function public.admin_save_lesson(p_actor_id uuid, p_lesson jsonb)
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
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;
  if coalesce(jsonb_typeof(p_lesson -> 'options'), 'null') <> 'array'
    or jsonb_array_length(p_lesson -> 'options') < 2
    or jsonb_array_length(p_lesson -> 'options') > 8 then
    raise exception 'A lesson quiz must have between two and eight options';
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

  select quiz_options.id
  into v_correct_option_id
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
    jsonb_build_object('published', (p_lesson ->> 'published')::boolean));
end;
$$;
