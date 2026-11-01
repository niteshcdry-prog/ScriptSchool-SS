import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  isAdminConfigured: vi.fn(),
  createAdminClient: vi.fn(),
  databaseQuery: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isConfigured,
  isSupabaseAdminConfigured: () => mocks.isConfigured() && mocks.isAdminConfigured(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createAdminClient,
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isConfigured.mockReturnValue(true);
    mocks.isAdminConfigured.mockReturnValue(true);
    mocks.databaseQuery.mockResolvedValue({ error: null });
    mocks.createAdminClient.mockReturnValue({
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
    const payload = await response.json();
    expect(payload.status).toBe("ok");
    expect(payload.service).toBe("script-school");
    expect(payload.checks).toEqual({ database: true });
    expect(typeof payload.timestamp).toBe("string");
  });

  it("reports degraded when the database is not configured", async () => {
    mocks.isConfigured.mockReturnValue(false);
    const response = await GET();
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.status).toBe("degraded");
    expect(payload.checks).toEqual({ database: false });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("reports degraded when the server-only database key is not configured", async () => {
    mocks.isAdminConfigured.mockReturnValue(false);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("reports degraded when the database query fails", async () => {
    mocks.databaseQuery.mockResolvedValue({ error: new Error("database unavailable") });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET();
    expect(response.status).toBe(503);
    errorSpy.mockRestore();
  });
});
