const lockedProjects = new Set<string>();

export function acquireLock(projectId: string) {
  if (lockedProjects.has(projectId)) return undefined;
  lockedProjects.add(projectId);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockedProjects.delete(projectId);
  };
}
