type OrderedCurriculum<L extends { category: string }> = {
  courses: Array<{ id: string }>;
  modules: Array<{ title: string; courseId: string; sortOrder: number }>;
  lessons: L[];
};

export function getOrderedCurriculumLessons<L extends { category: string }>(
  curriculum: OrderedCurriculum<L>,
): L[] {
  const courseOrder = new Map(curriculum.courses.map((course, index) => [course.id, index]));
  const moduleByTitle = new Map(curriculum.modules.map((module) => [module.title, module]));

  return curriculum.lessons
    .map((lesson, index) => {
      const curriculumModule = moduleByTitle.get(lesson.category);
      if (!curriculumModule) throw new Error(`No module found for lesson category "${lesson.category}".`);
      const courseIndex = courseOrder.get(curriculumModule.courseId);
      if (courseIndex === undefined) throw new Error(`No course found for module "${curriculumModule.title}".`);
      return { lesson, index, courseIndex, moduleOrder: curriculumModule.sortOrder };
    })
    .sort((left, right) =>
      left.courseIndex - right.courseIndex
      || left.moduleOrder - right.moduleOrder
      || left.index - right.index)
    .map(({ lesson }) => lesson);
}

export function getCourseScopedPrerequisiteIds<L extends { id: string; category: string }>(
  orderedLessons: L[],
  modules: Array<{ title: string; courseId: string }>,
): Map<string, string[]> {
  const moduleByTitle = new Map(modules.map((curriculumModule) => [curriculumModule.title, curriculumModule]));
  const previousByCourse = new Map<string, string>();
  const prerequisitesByLesson = new Map<string, string[]>();

  for (const lesson of orderedLessons) {
    const curriculumModule = moduleByTitle.get(lesson.category);
    if (!curriculumModule) throw new Error(`No module found for lesson category "${lesson.category}".`);
    const previousLessonId = previousByCourse.get(curriculumModule.courseId);
    prerequisitesByLesson.set(lesson.id, previousLessonId ? [previousLessonId] : []);
    previousByCourse.set(curriculumModule.courseId, lesson.id);
  }

  return prerequisitesByLesson;
}
