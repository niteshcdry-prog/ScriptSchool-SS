import { describe, expect, it } from "vitest";
import curriculum from "@/data/curriculum.json";
import { getCourseScopedPrerequisiteIds, getOrderedCurriculumLessons } from "@/data/curriculum-order";
import { additionalCourses, additionalLessons, additionalModules } from "@/data/additional-curricula";
import { expandJavascriptLessons } from "@/data/javascript-practice";
import { courseInputSchema, lessonInputSchema, quizRequestSchema } from "./validation";

describe("curriculum seed data", () => {
  const courses = [...curriculum.courses, ...additionalCourses];
  const modules = [...curriculum.modules, ...additionalModules];
  const javascriptLessons = expandJavascriptLessons(curriculum.lessons);
  const lessons = [...javascriptLessons, ...additionalLessons];

  it("contains complete lessons with unique IDs and valid quiz answers", () => {
    const ids = lessons.map((lesson) => lesson.id);
    expect(lessons).toHaveLength(73);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of lessons) {
      expect(lesson.options.length).toBeGreaterThanOrEqual(2);
      expect(lesson.answer).toBeGreaterThanOrEqual(0);
      expect(lesson.answer).toBeLessThan(lesson.options.length);
      expect(lesson.description).toBeTruthy();
      expect(lesson.explanation).toBeTruthy();
      expect(lesson.code).toBeTruthy();
      expect(lesson.quizExplanation).toBeTruthy();
      expect(lesson.practicePrompt).toBeTruthy();
      expect(lesson.practiceStarter).toBeTruthy();
      expect(lesson.practiceHint).toBeTruthy();
      expect(lesson.practiceSolution).toBeTruthy();
    }
  });

  it("organizes JavaScript and four student-focused subjects into detailed courses and modules", () => {
    expect(courses).toHaveLength(5);
    expect(modules).toHaveLength(18);
    expect(new Set(lessons.map((lesson) => lesson.category)).size).toBe(modules.length);
    expect(courses.every((course) => course.description.length > 100)).toBe(true);
    expect(courses.every((course) => course.learningOutcomes.length >= 4)).toBe(true);
    expect(modules.every((curriculumModule) => courses.some((course) => course.id === curriculumModule.courseId))).toBe(true);

    const moduleByTitle = new Map(modules.map((curriculumModule) => [curriculumModule.title, curriculumModule]));
    const lessonCountsByCourse = new Map<string, number>();
    for (const lesson of lessons) {
      const curriculumModule = moduleByTitle.get(lesson.category);
      expect(curriculumModule, `Missing module for ${lesson.id}`).toBeDefined();
      if (curriculumModule) lessonCountsByCourse.set(curriculumModule.courseId, (lessonCountsByCourse.get(curriculumModule.courseId) || 0) + 1);
    }
    expect([...lessonCountsByCourse.values()]).toEqual([38, 11, 9, 7, 8]);
  });

  it("orders lessons by course and module without creating cross-course prerequisites", () => {
    const ordered = getOrderedCurriculumLessons({ courses, modules, lessons });
    expect(ordered).toHaveLength(lessons.length);
    expect(new Set(ordered.map((lesson) => lesson.id)).size).toBe(lessons.length);

    const courseOrder = new Map(courses.map((course, index) => [course.id, index]));
    const moduleByTitle = new Map(modules.map((curriculumModule) => [curriculumModule.title, curriculumModule]));
    const orderedCourseIndexes = ordered.map((lesson) => {
      const curriculumModule = moduleByTitle.get(lesson.category);
      if (!curriculumModule) throw new Error(`Missing module for lesson "${lesson.id}".`);
      const courseIndex = courseOrder.get(curriculumModule.courseId);
      if (courseIndex === undefined) throw new Error(`Missing course "${curriculumModule.courseId}".`);
      return courseIndex;
    });
    expect(orderedCourseIndexes).toEqual([...orderedCourseIndexes].sort((left, right) => left - right));

    const prerequisites = getCourseScopedPrerequisiteIds(ordered, modules);
    const firstLessonByCourse = new Set<string>();
    const previousByCourse = new Map<string, string>();
    for (const lesson of ordered) {
      const curriculumModule = moduleByTitle.get(lesson.category);
      if (!curriculumModule) throw new Error(`Missing module for lesson "${lesson.id}".`);
      const previousLessonId = previousByCourse.get(curriculumModule.courseId);
      if (!previousLessonId) firstLessonByCourse.add(lesson.id);
      expect(prerequisites.get(lesson.id)).toEqual(previousLessonId ? [previousLessonId] : []);
      previousByCourse.set(curriculumModule.courseId, lesson.id);
    }
    expect(firstLessonByCourse.size).toBe(courses.length);
  });

  it("covers the advanced JavaScript practice topics with complete lesson activities", () => {
    const expectedLessons = [
      "forms-validation",
      "safe-dom-rendering",
      "url-search-params",
      "cancelling-async-work",
      "iterators-generators",
      "testing-functions",
      "performance-basics",
      "learning-app-capstone",
    ];
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));

    for (const id of expectedLessons) {
      const lesson = byId.get(id);
      expect(lesson, `Missing lesson ${id}`).toBeDefined();
      expect(lesson?.practicePrompt).toBeTruthy();
      expect(lesson?.practiceStarter).toBeTruthy();
      expect(lesson?.practiceHint).toBeTruthy();
      expect(lesson?.practiceSolution).toBeTruthy();
      expect(lesson?.quizExplanation).toBeTruthy();
    }
  });

  it("provides a complete worked query for the SQL course capstone", () => {
    const capstone = lessons.find((lesson) => lesson.id === "sql-indexes-capstone");
    expect(capstone?.practiceSolution).toContain("SELECT courses.id, courses.title");
    expect(capstone?.practiceSolution).toContain("LEFT JOIN lessons");
    expect(capstone?.practiceSolution).toContain("GROUP BY courses.id, courses.title");
    expect(capstone?.practiceSolution).toContain("ORDER BY courses.title");
  });
});

describe("lessonInputSchema", () => {
  const validLesson = {
    id: "new-topic",
    moduleId: "core",
    title: "New concept",
    icon: "✎",
    duration: 5,
    level: "Beginner",
    description: "A concept.",
    explanation: "An explanation.",
    code: "console.log('hello')",
    tip: "Try it.",
    practicePrompt: "",
    practiceStarter: "",
    practiceHint: "",
    practiceSolution: "",
    quizExplanation: "",
    sortOrder: 1,
    published: false,
    quiz: "Which answer?",
    options: ["One", "Two"],
    answer: 1,
  };

  it("accepts a correctly indexed answer", () => {
    expect(lessonInputSchema.safeParse(validLesson).success).toBe(true);
  });

  it("defaults optional practice content for older admin clients", () => {
    const practiceFields = new Set(["practicePrompt", "practiceStarter", "practiceHint", "practiceSolution", "quizExplanation"]);
    const legacyLesson = Object.fromEntries(Object.entries(validLesson).filter(([key]) => !practiceFields.has(key)));
    expect(lessonInputSchema.parse(legacyLesson)).toMatchObject({
      practicePrompt: "",
      practiceStarter: "",
      practiceHint: "",
      practiceSolution: "",
      quizExplanation: "",
    });
  });

  it("rejects a quiz answer outside its option list", () => {
    expect(lessonInputSchema.safeParse({ ...validLesson, answer: 2 }).success).toBe(false);
  });

  it("rejects a lesson that depends on itself or lists duplicate prerequisites", () => {
    expect(lessonInputSchema.safeParse({ ...validLesson, prerequisiteIds: ["new-topic"] }).success).toBe(false);
    expect(lessonInputSchema.safeParse({ ...validLesson, prerequisiteIds: ["variables", "variables"] }).success).toBe(false);
  });
});

describe("courseInputSchema", () => {
  it("validates course language, level, estimates, prerequisites, and outcomes", () => {
    expect(courseInputSchema.safeParse({
      id: "python-programming",
      title: "Python Programming",
      description: "Learn Python from first principles.",
      language: "python",
      level: "Beginner",
      estimatedMinutes: 120,
      recommendedPrerequisites: [],
      learningOutcomes: ["Write small Python programs."],
      published: true,
    }).success).toBe(true);
    expect(courseInputSchema.safeParse({
      id: "python-programming",
      title: "Python Programming",
      description: "Learn Python.",
      language: "python",
      level: "Beginner",
      estimatedMinutes: -1,
      recommendedPrerequisites: [],
      learningOutcomes: [],
      published: true,
    }).success).toBe(false);
  });
});

describe("quizRequestSchema", () => {
  it("accepts valid option indexes and rejects invalid indexes", () => {
    expect(quizRequestSchema.safeParse({ lessonId: "first-steps", optionIndex: 0 }).success).toBe(true);
    expect(quizRequestSchema.safeParse({ lessonId: "first-steps", optionIndex: -1 }).success).toBe(false);
  });
});
