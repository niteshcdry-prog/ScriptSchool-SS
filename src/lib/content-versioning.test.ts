import { afterEach, describe, expect, it, vi } from "vitest";
import { applyVersionSnapshot, readVersionHistory, recordContentVersion } from "@/lib/content-versioning";

describe("content versioning workflow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads server-persisted history for a content item", async () => {
    const versions = [{
      id: "version-1",
      entityType: "course" as const,
      entityId: "javascript-foundations",
      title: "JavaScript Foundations",
      published: true,
      note: "Ready for learners",
      createdAt: "2026-10-17T10:00:00.000Z",
      snapshot: { published: true },
    }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ versions }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(readVersionHistory("course", "javascript-foundations")).resolves.toEqual(versions);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/versions?entityType=course&entityId=javascript-foundations");
  });

  it("persists a snapshot through the protected admin endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ saved: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const version = {
      entityType: "lesson" as const,
      entityId: "variables",
      title: "Variables",
      published: false,
      note: "Updated lesson",
      snapshot: { title: "Variables", published: false },
    };

    await expect(recordContentVersion(version)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/versions", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(version),
    }));
  });

  it("surfaces server errors instead of claiming a version was saved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Version history could not be loaded." }), { status: 500 }),
    ));
    await expect(readVersionHistory("course", "javascript-foundations"))
      .rejects.toThrow("Version history could not be loaded.");
  });

  it("merges a restored snapshot into the current draft without losing other fields", () => {
    const current = {
      id: "variables",
      title: "Variables",
      duration: 8,
      published: false,
    };

    const restored = applyVersionSnapshot({
      title: "Variables (updated)",
      published: true,
    }, current);

    expect(restored).toEqual({
      id: "variables",
      title: "Variables (updated)",
      duration: 8,
      published: true,
    });
  });
});
