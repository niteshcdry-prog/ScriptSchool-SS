revoke select on public.courses, public.modules, public.lessons, public.quiz_questions, public.quiz_options, public.lesson_prerequisites from anon;
grant select on public.lesson_prerequisites to authenticated;
grant select on public.courses, public.modules, public.lessons, public.quiz_questions, public.quiz_options to authenticated;

drop policy "Read prerequisites of published lessons" on public.lesson_prerequisites;
create policy "Authenticated users read prerequisites of published lessons"
  on public.lesson_prerequisites for select to authenticated
  using (
    exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where lessons.id = lesson_prerequisites.lesson_id
        and lessons.published and courses.published
    )
  );

drop policy "Read published courses" on public.courses;
create policy "Authenticated users read published courses"
  on public.courses for select to authenticated
  using (published or (select public.is_admin()));

drop policy "Read modules in published courses" on public.modules;
create policy "Authenticated users read modules in published courses"
  on public.modules for select to authenticated
  using (
    exists (
      select 1 from public.courses
      where courses.id = modules.course_id and courses.published
    ) or (select public.is_admin())
  );

drop policy "Read published lessons in published courses" on public.lessons;
create policy "Authenticated users read published lessons in published courses"
  on public.lessons for select to authenticated
  using (
    (published and exists (
      select 1 from public.modules
      join public.courses on courses.id = modules.course_id
      where modules.id = lessons.module_id and courses.published
    )) or (select public.is_admin())
  );

drop policy "Read published lesson questions" on public.quiz_questions;
create policy "Authenticated users read published lesson questions"
  on public.quiz_questions for select to authenticated
  using (
    exists (
      select 1 from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where lessons.id = quiz_questions.lesson_id and lessons.published and courses.published
    ) or (select public.is_admin())
  );

drop policy "Read options for published lesson questions" on public.quiz_options;
create policy "Authenticated users read options for published lesson questions"
  on public.quiz_options for select to authenticated
  using (
    exists (
      select 1 from public.quiz_questions
      join public.lessons on lessons.id = quiz_questions.lesson_id
      join public.modules on modules.id = lessons.module_id
      join public.courses on courses.id = modules.course_id
      where quiz_questions.id = quiz_options.question_id and lessons.published and courses.published
    ) or (select public.is_admin())
  );
