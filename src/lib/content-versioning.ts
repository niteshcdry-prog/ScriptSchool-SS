export type ContentVersionEntity = "course" | "module" | "lesson";

export type ContentVersion = {
  id: string;
  entityType: ContentVersionEntity;
  entityId: string;
  title: string;
  published: boolean;
  note: string;
  createdAt: string;
  snapshot: Record<string, unknown>;
};

export function applyVersionSnapshot<T extends Record<string, unknown>>(snapshot: Partial<T>, current: T): T {
  return {
    ...current,
    ...snapshot,
  };
}

export async function readVersionHistory(entityType: ContentVersionEntity, entityId: string): Promise<ContentVersion[]> {
  const params = new URLSearchParams({ entityType, entityId });
  const response = await fetch(`/api/admin/versions?${params.toString()}`);
  const body = await response.json() as { error?: string; versions?: ContentVersion[] };
  if (!response.ok) throw new Error(body.error || "Version history could not be loaded.");
  return body.versions || [];
}

export async function recordContentVersion(version: Omit<ContentVersion, "id" | "createdAt">): Promise<void> {
  const response = await fetch("/api/admin/versions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(version),
  });
  const body = await response.json() as { error?: string };
  if (!response.ok) throw new Error(body.error || "The content version could not be saved.");
}
