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

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const lesson = {
  id: "variables",
  moduleId: "core",
  title: "Variables",
  icon: "JS",
  duration: 8,
  level: "Beginner",
  description: "Store values.",
  explanation: "Variables name values.",
  code: "const answer = 42;",
  tip: "Use const.",
  practicePrompt: "",
  practiceStarter: "",
  practiceHint: "",
  practiceSolution: "",
  quizExplanation: "",
  sortOrder: 2,
  published: false,
  prerequisiteIds: ["first-steps"],
  quiz: "What stores a value?",
  options: ["A variable", "A loop"],
  answer: 0,
};

describe("atomic content publishing route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ id: "admin-id" });
    mocks.rpc.mockResolvedValue({ data: "version-id", error: null });
    mocks.adminClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it("publishes the lesson through the transaction that saves its history", async () => {
    const response = await POST(request({
      entityType: "lesson",
      lesson,
      note: "Reviewed prerequisites and quiz",
    }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_publish_lesson", {
      p_actor_id: "admin-id",
      p_lesson: { ...lesson, published: true },
      p_note: "Reviewed prerequisites and quiz",
    });
  });

  it("publishes courses through their atomic persistence function", async () => {
    const course = {
      id: "javascript-foundations",
      title: "JavaScript: Beginner to Advanced",
      description: "Learn JavaScript.",
      language: "javascript",
      level: "Beginner to Advanced",
      estimatedMinutes: 420,
      recommendedPrerequisites: [],
      learningOutcomes: ["Write JavaScript programs."],
      published: false,
    };
    const response = await POST(request({ entityType: "course", course, note: "Launch" }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_publish_course", {
      p_actor_id: "admin-id",
      p_course: course,
      p_note: "Launch",
    });
  });

  it("denies publishing before calling the elevated database client", async () => {
    mocks.actor.mockResolvedValue(null);
    const response = await POST(request({ entityType: "lesson", lesson, note: "" }));
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
