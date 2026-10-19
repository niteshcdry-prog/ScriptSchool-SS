import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  consumeRateLimit: vi.fn(),
  serverRpc: vi.fn(),
  serverGetUser: vi.fn(),
  adminRpc: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isConfigured,
}));
vi.mock("@/lib/rate-limit", () => ({
  consumeRequestRateLimit: mocks.consumeRateLimit,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.serverGetUser },
    rpc: mocks.serverRpc,
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({ rpc: mocks.adminRpc })),
}));

import { POST } from "./route";

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/quiz/check", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/quiz/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isConfigured.mockReturnValue(true);
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.serverGetUser.mockResolvedValue({ data: { user: { id: "4bc5c54e-43af-4b30-8024-9ae8e270f7a4" } }, error: null });
    mocks.serverRpc.mockResolvedValue({ data: true, error: null });
    mocks.adminRpc.mockResolvedValue({ data: true, error: null });
  });

  it("requires an enabled account backend before checking quiz answers", async () => {
    mocks.isConfigured.mockReturnValue(false);
    const response = await POST(createRequest({ lessonId: "first-steps", optionIndex: 0 }));

    expect(response.status).toBe(503);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it("rejects anonymous quiz checks before rate limiting or accessing answers", async () => {
    mocks.serverGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(createRequest({ lessonId: "first-steps", optionIndex: 0 }));

    expect(response.status).toBe(401);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it("rejects malformed answers before accessing the backend", async () => {
    const response = await POST(createRequest({ lessonId: "", optionIndex: -1 }));

    expect(response.status).toBe(400);
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("returns 429 with a retry delay when the database rate limit is exceeded", async () => {
    mocks.isConfigured.mockReturnValue(true);
    mocks.consumeRateLimit.mockResolvedValue(false);

    const response = await POST(createRequest({ lessonId: "first-steps", optionIndex: 0 }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith("quiz-check", "203.0.113.8", 30, 60);
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it("returns 503 rather than skipping rate enforcement when its store is unavailable", async () => {
    mocks.isConfigured.mockReturnValue(true);
    mocks.consumeRateLimit.mockRejectedValue(new Error("database unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(createRequest({ lessonId: "first-steps", optionIndex: 0 }));

    expect(response.status).toBe(503);
    expect(mocks.serverRpc).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("checks valid answers only after consuming a rate-limit request", async () => {
    mocks.isConfigured.mockReturnValue(true);
    const response = await POST(createRequest({ lessonId: "first-steps", optionIndex: 0 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isCorrect: true });
    expect(mocks.consumeRateLimit).toHaveBeenCalledOnce();
    expect(mocks.adminRpc).toHaveBeenCalledWith("check_lesson_answer", {
      p_lesson_id: "first-steps",
      p_option_index: 0,
      p_user_id: "4bc5c54e-43af-4b30-8024-9ae8e270f7a4",
    });
  });

  it("passes the verified learner identity to the private attempt-recording RPC", async () => {
    mocks.isConfigured.mockReturnValue(true);
    mocks.serverGetUser.mockResolvedValue({
      data: { user: { id: "4bc5c54e-43af-4b30-8024-9ae8e270f7a4" } },
      error: null,
    });

    const response = await POST(createRequest({ lessonId: "first-steps", optionIndex: 1 }));

    expect(response.status).toBe(200);
    expect(mocks.adminRpc).toHaveBeenCalledWith("check_lesson_answer", {
      p_lesson_id: "first-steps",
      p_option_index: 1,
      p_user_id: "4bc5c54e-43af-4b30-8024-9ae8e270f7a4",
    });
  });
});
