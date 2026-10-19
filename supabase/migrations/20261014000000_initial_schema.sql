create extension if not exists pgcrypto;

create type public.user_role as enum ('learner', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role public.user_role not null default 'learner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id text primary key,
  title text not null,
  description text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (course_id, title)
);

create table public.lessons (
  id text primary key,
  module_id text not null references public.modules (id) on delete cascade,
  title text not null,
  icon text not null default '✎',
  duration integer not null check (duration > 0),
  level text not null default 'Beginner',
  description text not null default '',
  explanation text not null default '',
  code text not null default '',
  tip text not null default '',
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null unique references public.lessons (id) on delete cascade,
  prompt text not null,
  created_at timestamptz not null default now()
);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  unique (question_id, sort_order)
);

create table public.quiz_answers (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  correct_option_id uuid not null references public.quiz_options (id) on delete cascade
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.progress_imports (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  imported_at timestamptz not null default now(),
  imported_count integer not null default 0
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  selected_option_id uuid references public.quiz_options (id) on delete set null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function public.admin_save_lesson(p_lesson jsonb)
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
end;
$$;

revoke execute on function public.admin_save_lesson(jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_lesson(jsonb) to service_role;

create function public.admin_set_user_role(p_actor_id uuid, p_user_id uuid, p_role public.user_role)
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
end;
$$;

revoke execute on function public.admin_set_user_role(uuid, uuid, public.user_role) from public, anon, authenticated;
grant execute on function public.admin_set_user_role(uuid, uuid, public.user_role) to service_role;

create function public.admin_get_progress_counts(p_user_ids uuid[])
returns table (user_id uuid, completed_count bigint)
language sql
security definer
set search_path = public
as $$
  select lesson_progress.user_id, count(*)
  from public.lesson_progress
  where lesson_progress.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
  group by lesson_progress.user_id;
$$;

revoke execute on function public.admin_get_progress_counts(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_get_progress_counts(uuid[]) to service_role;

create index lessons_module_order_idx on public.lessons (module_id, sort_order);
create index modules_course_order_idx on public.modules (course_id, sort_order);
create index quiz_attempts_user_date_idx on public.quiz_attempts (user_id, created_at desc);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.progress_imports enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.admin_audit_logs enable row level security;

grant select on public.courses, public.modules, public.lessons, public.quiz_questions, public.quiz_options to anon, authenticated;
grant select on public.profiles, public.progress_imports, public.admin_audit_logs to authenticated;
grant select, insert, delete on public.lesson_progress to authenticated;
grant select, insert on public.quiz_attempts to authenticated;
grant all on public.profiles, public.courses, public.modules, public.lessons,
  public.quiz_questions, public.quiz_options, public.quiz_answers, public.lesson_progress,
  public.progress_imports, public.quiz_attempts, public.admin_audit_logs to service_role;

create policy "Users can read their profile; admins can read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins can manage profiles"
  on public.profiles for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Read published courses"
  on public.courses for select to anon, authenticated
  using (published or (select public.is_admin()));
create policy "Admins manage courses"
  on public.courses for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Read modules in published courses"
  on public.modules for select to anon, authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = modules.course_id and courses.published
    ) or (select public.is_admin())
  );
create policy "Admins manage modules"
  on public.modules for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Read published lessons in published courses"
  on public.lessons for select to anon, authenticated
  using (
    (published and exists (
      select 1 from public.modules
      join public.courses on courses.id = modules.course_id
      where modules.id = lessons.module_id and courses.published
    )) or (select public.is_admin())
  );
create policy "Admins manage lessons"
  on public.lessons for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Read published lesson questions"
  on public.quiz_questions for select to anon, authenticated
  using (
    exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where lessons.id = quiz_questions.lesson_id and lessons.published and courses.published
    ) or (select public.is_admin())
  );
create policy "Admins manage questions"
  on public.quiz_questions for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Read options for published lesson questions"
  on public.quiz_options for select to anon, authenticated
  using (
    exists (
      select 1 from public.quiz_questions
      join public.lessons on lessons.id = quiz_questions.lesson_id
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where quiz_questions.id = quiz_options.question_id and lessons.published and courses.published
    ) or (select public.is_admin())
  );
create policy "Admins manage options"
  on public.quiz_options for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Only admins can read quiz answers"
  on public.quiz_answers for select to authenticated
  using ((select public.is_admin()));
create policy "Only admins can manage quiz answers"
  on public.quiz_answers for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Learners read their own progress"
  on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Learners create their own progress"
  on public.lesson_progress for insert to authenticated
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Learners remove their own progress"
  on public.lesson_progress for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins manage progress"
  on public.lesson_progress for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Learners read their own import status"
  on public.progress_imports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins manage import status"
  on public.progress_imports for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create function public.import_local_progress(p_lesson_ids text[])
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
  where lessons.id = any(coalesce(p_lesson_ids, array[]::text[]))
  on conflict (user_id, lesson_id) do nothing;

  get diagnostics v_imported_count = row_count;
  update public.progress_imports
  set imported_count = v_imported_count
  where user_id = auth.uid();
  return v_imported_count;
end;
$$;

grant execute on function public.import_local_progress(text[]) to authenticated;

create function public.check_lesson_answer(p_lesson_id text, p_option_index integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_correct boolean;
begin
  select options.id = answers.correct_option_id
  into v_is_correct
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
  return v_is_correct;
end;
$$;

grant execute on function public.check_lesson_answer(text, integer) to anon, authenticated;

create policy "Learners read their own quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Learners create their own quiz attempts"
  on public.quiz_attempts for insert to authenticated
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins manage quiz attempts"
  on public.quiz_attempts for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can read audit history"
  on public.admin_audit_logs for select to authenticated
  using ((select public.is_admin()));
create policy "Admins can create audit history"
  on public.admin_audit_logs for insert to authenticated
  with check ((select public.is_admin()));
