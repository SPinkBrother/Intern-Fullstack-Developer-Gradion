export interface UserRecord {
  id: string;
  name: string;
  emailNormalized: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "in_progress" | "completed";
  current_step: number;
  completedSteps: number;
}

export interface StoreData {
  users: UserRecord[];
  sessions: SessionRecord[];
  projects: ProjectRecord[];
}

export function publicUser(user: UserRecord) {
  return { id: user.id, name: user.name, email: user.emailNormalized };
}
