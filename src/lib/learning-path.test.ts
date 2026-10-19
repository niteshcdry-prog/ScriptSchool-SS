import { describe, expect, it } from "vitest";
import { getPrerequisiteMap, getNextUnlockedLesson, isLessonUnlocked } from "@/lib/learning-path";

describe("learning path prerequisites", () => {
  const lessons = [
    { id: "first-steps", category: "Core", sortOrder: 1 },
    { id: "variables", category: "Core", sortOrder: 2 },
    { id: "types", category: "Core", sortOrder: 3 },
    { id: "conditionals", category: "Control flow", sortOrder: 4 },
    { id: "loops", category: "Control flow", sortOrder: 5 },
  ];

  it("requires the previous lesson in the same category before unlocking the next one", () => {
    const prerequisites = getPrerequisiteMap(lessons);
    expect(prerequisites.get("variables")).toEqual(["first-steps"]);
    expect(prerequisites.get("conditionals")).toEqual(["types"]);
  });

  it("also requires the last lesson from the previous category when it is the first lesson in a new category", () => {
    const prerequisites = getPrerequisiteMap(lessons);
    expect(prerequisites.get("conditionals")).toContain("types");
  });

  it("locks a lesson until its prerequisites are complete", () => {
    expect(isLessonUnlocked("conditionals", lessons, new Set(["first-steps", "variables"]))).toBe(false);
    expect(isLessonUnlocked("conditionals", lessons, new Set(["first-steps", "variables", "types"]))).toBe(true);
  });

  it("returns the next unlockable lesson in the course sequence", () => {
    const firstNext = getNextUnlockedLesson(lessons, new Set(["first-steps", "variables"]));
    expect(firstNext).not.toBeNull();
    if (!firstNext) throw new Error("Expected a next unlocked lesson.");
    expect(firstNext.id).toBe("types");

    const secondNext = getNextUnlockedLesson(lessons, new Set(["first-steps", "variables", "types"]));
    expect(secondNext).not.toBeNull();
    if (!secondNext) throw new Error("Expected an unlocked lesson after types.");
    expect(secondNext.id).toBe("conditionals");
  });

  it("uses administrator-configured prerequisite IDs instead of inferred ordering", () => {
    const explicitLessons = [
      { id: "first-steps", category: "Core", sortOrder: 1, prerequisiteIds: [] },
      { id: "variables", category: "Core", sortOrder: 2, prerequisiteIds: [] },
      { id: "arrays", category: "Data", sortOrder: 3, prerequisiteIds: ["first-steps"] },
    ];

    expect(isLessonUnlocked("variables", explicitLessons, [])).toBe(true);
    expect(isLessonUnlocked("arrays", explicitLessons, [])).toBe(false);
    expect(isLessonUnlocked("arrays", explicitLessons, ["first-steps"])).toBe(true);
  });
});
