import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  rpc: vi.fn(),
  adminClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminActor: mocks.actor,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.adminClient,
}));

import { POST as saveCourse } from "./courses/route";
import { POST as saveLesson } from "./lessons/route";
import { POST as saveModule } from "./modules/route";
import { PATCH as updateRole } from "./users/[userId]/route";
import { DELETE as resetProgress } from "./users/[userId]/progress/route";

const actorId = "77a3af87-0f53-43c2-9ca8-43f25bc9efc0";
const learnerId = "4bc5c54e-43af-4b30-8024-9ae8e270f7a4";

function createRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/admin", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "DELETE" ? undefined : JSON.stringify(body),
  });
}

describe("atomic administrator mutation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ id: actorId });
    mocks.adminClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  it("saves course fields through the transaction that records its audit event", async () => {
    const response = await saveCourse(createRequest({
      id: "javascript-foundations",
      title: "JavaScript: Beginner to Advanced",
      description: "Learn JavaScript.",
      language: "javascript",
      level: "Beginner to Advanced",
      estimatedMinutes: 420,
      recommendedPrerequisites: [],
      learningOutcomes: ["Write JavaScript programs."],
      published: true,
    }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_save_course", {
      p_actor_id: actorId,
      p_course: {
        id: "javascript-foundations",
        title: "JavaScript: Beginner to Advanced",
        description: "Learn JavaScript.",
        language: "javascript",
        level: "Beginner to Advanced",
        estimatedMinutes: 420,
        recommendedPrerequisites: [],
        learningOutcomes: ["Write JavaScript programs."],
        published: true,
      },
    });
  });

  it("saves module fields through its audited transaction", async () => {
    const response = await saveModule(createRequest({
      id: "functions",
      courseId: "javascript-foundations",
      title: "Functions",
      sortOrder: 2,
    }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_save_module", {
      p_actor_id: actorId,
      p_module: {
        id: "functions",
        courseId: "javascript-foundations",
        title: "Functions",
        sortOrder: 2,
      },
    });
  });

  it("saves lesson and quiz data through one audited database transaction", async () => {
    const lesson = {
      id: "new-concept",
      moduleId: "functions",
      title: "New concept",
      icon: "JS",
      duration: 5,
      level: "Beginner",
      description: "A short lesson.",
      explanation: "Understand the concept.",
      code: "const answer = 42;",
      tip: "Try it.",
      practicePrompt: "Change the example to print your own answer.",
      practiceStarter: "console.log(42);",
      practiceHint: "Pass the value to console.log().",
      practiceSolution: "console.log(42);",
      quizExplanation: "console.log() writes the value to the developer console.",
      sortOrder: 1,
      published: false,
      prerequisiteIds: [],
      quiz: "Which answer?",
      options: ["42", "0"],
      answer: 0,
    };
    const response = await saveLesson(createRequest(lesson));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_save_lesson", {
      p_actor_id: actorId,
      p_lesson: lesson,
    });
  });

  it("records role-change failure without returning a success-shaped response", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "At least one administrator account must remain" },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await updateRole(createRequest({ role: "learner" }, "PATCH"), {
      params: Promise.resolve({ userId: learnerId }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("At least one administrator") });
    errorSpy.mockRestore();
  });

  it("resets progress through the same transaction that writes its audit event", async () => {
    const response = await resetProgress(createRequest(undefined, "DELETE"), {
      params: Promise.resolve({ userId: learnerId }),
    });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_reset_progress", {
      p_actor_id: actorId,
      p_user_id: learnerId,
    });
  });

  it("denies admin mutations before calling the elevated database client", async () => {
    mocks.actor.mockResolvedValue(null);
    const response = await saveCourse(createRequest({
      id: "blocked",
      title: "Blocked",
      description: "No access.",
      published: false,
    }));

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
