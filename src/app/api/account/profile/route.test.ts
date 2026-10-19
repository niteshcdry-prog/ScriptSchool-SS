import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  adminClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInUser: mocks.user,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.adminClient,
}));

import { PATCH } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/account/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("learner profile update route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({ id: "learner-id" });
    mocks.eq.mockReturnValue({
      select: () => ({
        maybeSingle: async () => ({ data: { id: "learner-id" }, error: null }),
      }),
    });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.adminClient.mockReturnValue({
      from: () => ({ update: mocks.update }),
    });
  });

  it("updates only the signed-in user's display name", async () => {
    const response = await PATCH(request({ displayName: "Ada Learner" }));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ display_name: "Ada Learner" }));
    expect(mocks.eq).toHaveBeenCalledWith("id", "learner-id");
  });

  it("denies profile updates without a signed-in user", async () => {
    mocks.user.mockResolvedValue(null);
    const response = await PATCH(request({ displayName: "Ada Learner" }));

    expect(response.status).toBe(401);
    expect(mocks.adminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid display names", async () => {
    const response = await PATCH(request({ displayName: " " }));
    expect(response.status).toBe(400);
    expect(mocks.adminClient).not.toHaveBeenCalled();
  });
});
