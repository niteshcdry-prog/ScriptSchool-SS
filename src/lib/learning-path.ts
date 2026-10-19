export type LessonPathItem = {
  id: string;
  category: string;
  sortOrder: number;
  prerequisiteIds?: string[];
};

export function getPrerequisiteMap<T extends LessonPathItem>(lessons: T[]): Map<string, string[]> {
  const categoryMap = new Map<string, T[]>();
  for (const lesson of lessons) {
    const group = categoryMap.get(lesson.category) || [];
    group.push(lesson);
    categoryMap.set(lesson.category, group);
  }

  const categoryOrder = Array.from(categoryMap.keys());
  const prerequisites = new Map<string, string[]>();

  for (let categoryIndex = 0; categoryIndex < categoryOrder.length; categoryIndex += 1) {
    const category = categoryOrder[categoryIndex];
    const group = [...(categoryMap.get(category) || [])].sort((left, right) => left.sortOrder - right.sortOrder);

    for (let lessonIndex = 0; lessonIndex < group.length; lessonIndex += 1) {
      const lesson = group[lessonIndex];
      const required: string[] = [];

      if (lesson.prerequisiteIds) {
        required.push(...lesson.prerequisiteIds);
      } else if (lessonIndex > 0) {
        required.push(group[lessonIndex - 1].id);
      } else if (categoryIndex > 0) {
        const previousCategory = categoryOrder[categoryIndex - 1];
        const previousGroup = [...(categoryMap.get(previousCategory) || [])].sort((left, right) => left.sortOrder - right.sortOrder);
        const previousLesson = previousGroup[previousGroup.length - 1];
        if (previousLesson) required.push(previousLesson.id);
      }

      prerequisites.set(lesson.id, required);
    }
  }

  return prerequisites;
}

export function isLessonUnlocked<T extends LessonPathItem>(
  lessonId: string,
  lessons: T[],
  completedIds: Iterable<string>,
): boolean {
  const prerequisiteIds = getPrerequisiteMap(lessons).get(lessonId) || [];
  const completed = new Set(completedIds);
  return prerequisiteIds.every((id) => completed.has(id));
}

export function getNextUnlockedLesson<T extends LessonPathItem>(
  lessons: T[],
  completedIds: Iterable<string>,
): T | null {
  const completed = new Set(completedIds);
  const ordered = [...lessons].sort((left, right) => left.sortOrder - right.sortOrder);

  for (const lesson of ordered) {
    if (completed.has(lesson.id)) continue;
    if (isLessonUnlocked(lesson.id, lessons, completed)) return lesson;
  }

  return null;
}
