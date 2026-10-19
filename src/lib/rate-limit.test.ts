import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.adminClient,
}));

import { consumeRequestRateLimit } from "./rate-limit";

describe("consumeRequestRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.adminClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: true, error: null });
  });

  it("passes the validated policy to the database function", async () => {
    await expect(consumeRequestRateLimit("quiz-check", "203.0.113.1", 30, 60)).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("consume_api_rate_limit", {
      p_scope: "quiz-check",
      p_client_key: "203.0.113.1",
      p_max_requests: 30,
      p_window_seconds: 60,
    });
  });

  it("surfaces database errors", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("database unavailable") });
    await expect(consumeRequestRateLimit("quiz-check", "203.0.113.1", 30, 60))
      .rejects.toThrow("The request rate limit could not be checked.");
  });

  it("rejects unexpected database results", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(consumeRequestRateLimit("quiz-check", "203.0.113.1", 30, 60))
      .rejects.toThrow("The request rate limit returned an invalid response.");
  });
});
