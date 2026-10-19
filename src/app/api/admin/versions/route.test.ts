import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  adminClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAdminActor: mocks.actor,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.adminClient,
}));

import { GET, POST } from "./route";

function request(url: string, body?: unknown) {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("administrator content version endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ id: "admin-id" });
    mocks.rpc.mockResolvedValue({ data: "version-id", error: null });
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    });
    mocks.adminClient.mockReturnValue({ rpc: mocks.rpc, from: mocks.from });
  });

  it("requires administrator access to save a version", async () => {
    mocks.actor.mockResolvedValue(null);
    const response = await POST(request("http://localhost/api/admin/versions", {
      entityType: "course",
      entityId: "js",
      title: "JavaScript",
      published: false,
      note: "Draft",
      snapshot: { title: "JavaScript" },
    }));

    expect(response.status).toBe(403);
    expect(mocks.adminClient).not.toHaveBeenCalled();
  });

  it("stores snapshots through the admin-authorized database transaction", async () => {
    const payload = {
      entityType: "course",
      entityId: "javascript-foundations",
      title: "JavaScript Foundations",
      published: true,
      note: "Ready",
      snapshot: { title: "JavaScript Foundations", published: true },
    };
    const response = await POST(request("http://localhost/api/admin/versions", payload));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_save_content_version", {
      p_actor_id: "admin-id",
      p_entity_type: "course",
      p_entity_id: "javascript-foundations",
      p_title: "JavaScript Foundations",
      p_published: true,
      p_note: "Ready",
      p_snapshot: payload.snapshot,
    });
  });

  it("rejects unsupported version history queries", async () => {
    const response = await GET(request("http://localhost/api/admin/versions?entityType=profile&entityId=admin"));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
