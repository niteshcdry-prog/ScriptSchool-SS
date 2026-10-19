export function isMissingAuthSession(error: unknown): boolean {
  return error instanceof Error && error.name === "AuthSessionMissingError";
}
