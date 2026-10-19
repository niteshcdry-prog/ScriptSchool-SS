drop function public.admin_save_lesson(jsonb);

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
    explanation, code, tip, sort_order, published
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

revoke execute on function public.admin_save_lesson(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_lesson(uuid, jsonb) to service_role;

create function public.admin_save_course(p_actor_id uuid, p_course jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;

  insert into public.courses (id, title, description, published)
  values (
    p_course ->> 'id',
    p_course ->> 'title',
    p_course ->> 'description',
    (p_course ->> 'published')::boolean
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    published = excluded.published,
    updated_at = now();

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'upsert', 'course', p_course ->> 'id',
    jsonb_build_object('published', (p_course ->> 'published')::boolean));
end;
$$;

revoke execute on function public.admin_save_course(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_course(uuid, jsonb) to service_role;

create function public.admin_save_module(p_actor_id uuid, p_module jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;

  insert into public.modules (id, course_id, title, sort_order)
  values (
    p_module ->> 'id',
    p_module ->> 'courseId',
    p_module ->> 'title',
    (p_module ->> 'sortOrder')::integer
  )
  on conflict (id) do update set
    course_id = excluded.course_id,
    title = excluded.title,
    sort_order = excluded.sort_order;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'upsert', 'module', p_module ->> 'id',
    jsonb_build_object('courseId', p_module ->> 'courseId'));
end;
$$;

revoke execute on function public.admin_save_module(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_module(uuid, jsonb) to service_role;

create or replace function public.admin_set_user_role(p_actor_id uuid, p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_role public.user_role;
begin
  perform pg_advisory_xact_lock(hashtext('script-school-admin-role'));

  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;
  if p_actor_id = p_user_id then
    raise exception 'Administrators cannot change their own role';
  end if;

  select role into v_current_role
  from public.profiles
  where id = p_user_id
  for update;
  if not found then
    raise exception 'Account not found';
  end if;

  if v_current_role = 'admin' and p_role = 'learner'
    and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'At least one administrator account must remain';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'set-role', 'profile', p_user_id::text, jsonb_build_object('role', p_role));
end;
$$;

create function public.admin_reset_progress(p_actor_id uuid, p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Account not found';
  end if;

  delete from public.lesson_progress where user_id = p_user_id;
  get diagnostics v_deleted_count = row_count;
  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'reset-progress', 'profile', p_user_id::text,
    jsonb_build_object('deletedCount', v_deleted_count));
  return v_deleted_count;
end;
$$;

revoke execute on function public.admin_reset_progress(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_reset_progress(uuid, uuid) to service_role;

create table public.api_rate_limits (
  scope text not null,
  client_hash text not null,
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, client_hash, window_start)
);

create index api_rate_limits_window_idx on public.api_rate_limits (window_start);
alter table public.api_rate_limits enable row level security;
grant all on public.api_rate_limits to service_role;

revoke insert on public.quiz_attempts from authenticated;
drop policy if exists "Learners create their own quiz attempts" on public.quiz_attempts;
drop function public.check_lesson_answer(text, integer);

create function public.consume_api_rate_limit(
  p_scope text,
  p_client_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_allowed boolean := false;
begin
  if p_scope not in ('quiz-check')
    or length(p_client_key) < 1 or length(p_client_key) > 200
    or p_max_requests < 1 or p_max_requests > 1000
    or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits (scope, client_hash, window_start, request_count)
  values (p_scope, md5(p_scope || ':' || p_client_key), v_window_start, 1)
  on conflict (scope, client_hash, window_start) do update
    set request_count = public.api_rate_limits.request_count + 1
    where public.api_rate_limits.request_count < p_max_requests
  returning true into v_allowed;

  if random() < 0.01 then
    delete from public.api_rate_limits
    where window_start < now() - interval '1 day';
  end if;

  return coalesce(v_allowed, false);
end;
$$;

revoke execute on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

create function public.check_lesson_answer(p_lesson_id text, p_option_index integer, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_correct boolean;
  v_question_id uuid;
  v_option_id uuid;
begin
  select options.id = answers.correct_option_id, quiz_questions.id, options.id
  into v_is_correct, v_question_id, v_option_id
  from public.lessons
  join public.modules on modules.id = lessons.module_id
  join public.courses on courses.id = modules.course_id
  join public.quiz_questions on quiz_questions.lesson_id = lessons.id
  join public.quiz_options options on options.question_id = quiz_questions.id
  join public.quiz_answers answers on answers.question_id = quiz_questions.id
  where lessons.id = p_lesson_id
    and lessons.published
    and courses.published
    and options.sort_order = p_option_index;

  if v_is_correct is null then
    raise exception 'Lesson or quiz option was not found';
  end if;

  if p_user_id is not null then
    if not exists (select 1 from public.profiles where id = p_user_id) then
      raise exception 'Account not found';
    end if;
    insert into public.quiz_attempts (user_id, lesson_id, selected_option_id, is_correct)
    values (p_user_id, p_lesson_id, v_option_id, v_is_correct);
  end if;

  return v_is_correct;
end;
$$;

revoke execute on function public.check_lesson_answer(text, integer, uuid) from public, anon, authenticated;
grant execute on function public.check_lesson_answer(text, integer, uuid) to service_role;

create function public.get_learner_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  return jsonb_build_object(
    'completedLessons', (
      select count(*) from public.lesson_progress where user_id = v_user_id
    ),
    'publishedLessons', (
      select count(*)
      from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where lessons.published and courses.published
    ),
    'quizAttempts', (
      select count(*) from public.quiz_attempts where user_id = v_user_id
    ),
    'correctAnswers', (
      select count(*) from public.quiz_attempts where user_id = v_user_id and is_correct
    ),
    'recentQuizAttempts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'lessonTitle', recent.lesson_title,
          'isCorrect', recent.is_correct,
          'answeredAt', recent.created_at
        ) order by recent.created_at desc
      )
      from (
        select lessons.title as lesson_title, quiz_attempts.is_correct, quiz_attempts.created_at
        from public.quiz_attempts
        join public.lessons on lessons.id = quiz_attempts.lesson_id
        where quiz_attempts.user_id = v_user_id
        order by quiz_attempts.created_at desc
        limit 5
      ) as recent
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_learner_analytics() from public, anon;
grant execute on function public.get_learner_analytics() to authenticated;
