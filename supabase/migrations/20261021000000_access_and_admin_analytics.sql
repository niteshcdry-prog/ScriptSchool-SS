create type public.user_plan as enum ('free', 'pro');

alter table public.profiles
  add column if not exists plan public.user_plan not null default 'free';

update public.profiles set plan = 'free' where plan = 'pro';

create or replace function public.course_requires_pro(p_course_id text)
returns boolean
language sql
immutable
parallel safe
as $$
  select p_course_id in ('python-programming', 'web-development', 'git-github', 'sql-databases');
$$;

create function public.admin_set_user_plan(p_actor_id uuid, p_user_id uuid, p_plan public.user_plan)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access is required';
  end if;
  select id into v_user_id from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Account not found';
  end if;

  update public.profiles
  set plan = p_plan, updated_at = now()
  where id = p_user_id;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    p_actor_id,
    'set-plan',
    'profile',
    p_user_id::text,
    jsonb_build_object('plan', p_plan)
  );
end;
$$;

revoke execute on function public.admin_set_user_plan(uuid, uuid, public.user_plan) from public, anon, authenticated;
grant execute on function public.admin_set_user_plan(uuid, uuid, public.user_plan) to service_role;

create function public.get_admin_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_accounts bigint;
  v_learner_count bigint;
  v_admin_count bigint;
  v_average_completion integer;
  v_completed_lessons bigint;
  v_top_learner_email text;
  v_cohort_completion_rate integer;
  v_pro_count bigint;
  v_free_count bigint;
  v_quiz_accuracy integer;
  v_quiz_attempts bigint;
begin
  v_total_accounts := (select count(*) from public.profiles);
  v_learner_count := (select count(*) from public.profiles where role = 'learner');
  v_admin_count := (select count(*) from public.profiles where role = 'admin');
  v_pro_count := (select count(*) from public.profiles where role = 'learner' and plan = 'pro');
  v_free_count := (select count(*) from public.profiles where role = 'learner' and plan = 'free');
  v_completed_lessons := (
    select count(*)
    from public.lesson_progress
    join public.lessons on lessons.id = lesson_progress.lesson_id
    join public.modules on modules.id = lessons.module_id
    join public.courses on courses.id = modules.course_id
    join public.profiles on profiles.id = lesson_progress.user_id and profiles.role = 'learner'
    where lessons.published and courses.published
  );
  v_average_completion := (
    select coalesce(round(avg(coalesce(progress_count, 0))), 0)::integer
    from (
      select profiles.id,
        count(lesson_progress.lesson_id) filter (where lessons.published and courses.published) as progress_count
      from public.profiles
      left join public.lesson_progress on lesson_progress.user_id = profiles.id
      left join public.lessons on lessons.id = lesson_progress.lesson_id
      left join public.modules on modules.id = lessons.module_id
      left join public.courses on courses.id = modules.course_id
      where profiles.role = 'learner'
      group by profiles.id
    ) as learner_progress
  );

  select email into v_top_learner_email
  from (
    select p.id, auth_users.email,
      count(lp.lesson_id) filter (where lessons.published and courses.published) as completed_count
    from public.profiles p
    left join public.lesson_progress lp on lp.user_id = p.id
    left join public.lessons on lessons.id = lp.lesson_id
    left join public.modules on modules.id = lessons.module_id
    left join public.courses on courses.id = modules.course_id
    left join auth.users auth_users on auth_users.id = p.id
    where p.role = 'learner'
    group by p.id, auth_users.email
    having count(lp.lesson_id) filter (where lessons.published and courses.published) > 0
    order by completed_count desc nulls last, p.created_at asc
    limit 1
  ) as leader;

  select count(*),
         case
           when count(*) = 0 then 0
           else round(((count(*) filter (where is_correct))::numeric / count(*)::numeric) * 100)
         end::integer
  into v_quiz_attempts, v_quiz_accuracy
  from public.quiz_attempts
  join public.profiles on profiles.id = quiz_attempts.user_id and profiles.role = 'learner';

  v_cohort_completion_rate := (
    select case
      when total_learners = 0 or total_lessons = 0 then 0
      else least(100, round((total_completed::numeric / (total_learners * total_lessons)) * 100))::integer
    end
    from (
      select
        (select count(*) from public.profiles where role = 'learner') as total_learners,
        (select count(*)
          from public.lessons
          join public.modules on modules.id = lessons.module_id
          join public.courses on courses.id = modules.course_id
          where lessons.published and courses.published) as total_lessons,
        (select count(*)
          from public.lesson_progress
          join public.lessons on lessons.id = lesson_progress.lesson_id
          join public.modules on modules.id = lessons.module_id
          join public.courses on courses.id = modules.course_id
          join public.profiles on profiles.id = lesson_progress.user_id and profiles.role = 'learner'
          where lessons.published and courses.published) as total_completed
    ) as summary
  );

  return jsonb_build_object(
    'totalAccounts', v_total_accounts,
    'learnerCount', v_learner_count,
    'adminCount', v_admin_count,
    'averageCompletion', coalesce(round(v_average_completion)::int, 0),
    'cohortCompletionRate', v_cohort_completion_rate,
    'topLearnerEmail', v_top_learner_email,
    'freePlanCount', v_free_count,
    'proPlanCount', v_pro_count,
    'quizAccuracy', v_quiz_accuracy,
    'quizAttempts', v_quiz_attempts,
    'totalCompletedLessons', v_completed_lessons
  );
end;
$$;

revoke execute on function public.get_admin_analytics() from public, anon, authenticated;
grant execute on function public.get_admin_analytics() to service_role;

create index if not exists profiles_plan_idx on public.profiles (plan);

drop policy "Authenticated users read published courses" on public.courses;
create policy "Learners read published courses allowed by plan"
  on public.courses for select to authenticated
  using (
    (published and (
      not public.course_requires_pro(id)
      or exists (select 1 from public.profiles where id = (select auth.uid()) and plan = 'pro')
    )) or (select public.is_admin())
  );

drop policy "Authenticated users read modules in published courses" on public.modules;
create policy "Learners read modules allowed by plan"
  on public.modules for select to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = modules.course_id
        and courses.published
        and (
          not public.course_requires_pro(courses.id)
          or exists (select 1 from public.profiles where id = (select auth.uid()) and plan = 'pro')
        )
    ) or (select public.is_admin())
  );

drop policy "Authenticated users read published lessons in published courses" on public.lessons;
create policy "Learners read lessons allowed by plan"
  on public.lessons for select to authenticated
  using (
    (published and exists (
      select 1 from public.modules
      join public.courses on courses.id = modules.course_id
      where modules.id = lessons.module_id and courses.published
        and (
          not public.course_requires_pro(courses.id)
          or exists (select 1 from public.profiles where id = (select auth.uid()) and plan = 'pro')
        )
    )) or (select public.is_admin())
  );

drop policy "Authenticated users read published lesson questions" on public.quiz_questions;
create policy "Learners read quiz questions allowed by plan"
  on public.quiz_questions for select to authenticated
  using (
    exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where lessons.id = quiz_questions.lesson_id and lessons.published and courses.published
        and (
          not public.course_requires_pro(courses.id)
          or exists (select 1 from public.profiles where id = (select auth.uid()) and plan = 'pro')
        )
    ) or (select public.is_admin())
  );

drop policy "Authenticated users read options for published lesson questions" on public.quiz_options;
create policy "Learners read quiz options allowed by plan"
  on public.quiz_options for select to authenticated
  using (
    exists (
      select 1 from public.quiz_questions
      join public.lessons on lessons.id = quiz_questions.lesson_id
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where quiz_questions.id = quiz_options.question_id and lessons.published and courses.published
        and (
          not public.course_requires_pro(courses.id)
          or exists (select 1 from public.profiles where id = (select auth.uid()) and plan = 'pro')
        )
    ) or (select public.is_admin())
  );

drop policy "Authenticated users read prerequisites of published lessons" on public.lesson_prerequisites;
create policy "Learners read prerequisites allowed by plan"
  on public.lesson_prerequisites for select to authenticated
  using (
    exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where lessons.id = lesson_prerequisites.lesson_id and lessons.published and courses.published
        and (
          not public.course_requires_pro(courses.id)
          or exists (select 1 from public.profiles where id = (select auth.uid()) and plan = 'pro')
        )
    ) or (select public.is_admin())
  );

drop policy "Learners create their own progress" on public.lesson_progress;
create policy "Learners complete lessons allowed by plan"
  on public.lesson_progress for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where lessons.id = lesson_progress.lesson_id and lessons.published and courses.published
        and (
          not public.course_requires_pro(courses.id)
          or exists (select 1 from public.profiles where id = (select auth.uid()) and plan = 'pro')
        )
    )) or (select public.is_admin())
  );

create or replace function public.import_local_progress(p_lesson_ids text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_imported_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to import progress';
  end if;

  insert into public.progress_imports (user_id, imported_count)
  values (auth.uid(), 0)
  on conflict (user_id) do nothing;

  if not found then
    return 0;
  end if;

  insert into public.lesson_progress (user_id, lesson_id)
  select auth.uid(), lessons.id
  from public.lessons
  join public.modules on modules.id = lessons.module_id
  join public.courses on courses.id = modules.course_id
  where lessons.id = any(coalesce(p_lesson_ids, array[]::text[]))
    and lessons.published and courses.published
    and (
      not public.course_requires_pro(courses.id)
      or exists (select 1 from public.profiles where id = auth.uid() and plan = 'pro')
    )
  on conflict (user_id, lesson_id) do nothing;

  get diagnostics v_imported_count = row_count;
  update public.progress_imports
  set imported_count = v_imported_count
  where user_id = auth.uid();
  return v_imported_count;
end;
$$;

grant execute on function public.import_local_progress(text[]) to authenticated;

create or replace function public.check_lesson_answer(p_lesson_id text, p_option_index integer, p_user_id uuid)
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
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Account not found';
  end if;

  if exists (
    select 1
    from public.lessons
    join public.modules on modules.id = lessons.module_id
    join public.courses on courses.id = modules.course_id
    where lessons.id = p_lesson_id
      and public.course_requires_pro(courses.id)
      and not exists (select 1 from public.profiles where id = p_user_id and (plan = 'pro' or role = 'admin'))
  ) then
    raise exception 'An active Pro plan is required for this course';
  end if;

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

  insert into public.quiz_attempts (user_id, lesson_id, selected_option_id, is_correct)
  values (p_user_id, p_lesson_id, v_option_id, v_is_correct);

  return v_is_correct;
end;
$$;

revoke execute on function public.check_lesson_answer(text, integer, uuid) from public, anon, authenticated;
grant execute on function public.check_lesson_answer(text, integer, uuid) to service_role;
