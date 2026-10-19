import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  createServerClient: vi.fn(),
  databaseQuery: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isConfigured,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient,
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isConfigured.mockReturnValue(true);
    mocks.databaseQuery.mockResolvedValue({ error: null });
    mocks.createServerClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: mocks.databaseQuery,
        })),
      })),
    });
  });

  it("reports a healthy database connection", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", checks: { database: true } });
  });

  it("reports degraded when the database is not configured", async () => {
    mocks.isConfigured.mockReturnValue(false);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("reports degraded when the database query fails", async () => {
    mocks.databaseQuery.mockResolvedValue({ error: new Error("database unavailable") });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET();
    expect(response.status).toBe(503);
    errorSpy.mockRestore();
  });
});
