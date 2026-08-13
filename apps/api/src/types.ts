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
  status: "draft" | "in_progress" | "completed" | "failed";
  artStyle?: string;
  styleState?: "idle" | "running" | "failed" | "completed";
  styleError?: string;
  styleStartedAt?: string;
  geminiFileName?: string;
  geminiFileUri?: string;
  geminiFileExpiresAt?: string;
  characterState?: "idle" | "running" | "failed" | "completed";
  characterError?: string;
  portraitState?: "idle" | "running" | "failed" | "completed";
  portraitError?: string;
  characters?: CharacterRecord[];
  chapterState?: "idle" | "running" | "failed" | "completed";
  chapterError?: string;
  chapters?: ChapterRecord[];
}

export interface CharacterRecord {
  id: string;
  name: string;
  age: number;
  description: string;
  visualPrompt: string;
  portraitFile?: string;
}

export interface ChapterRecord {
  title: string;
  scenePrompt: string;
}

export interface StoreData {
  users: UserRecord[];
  sessions: SessionRecord[];
  projects: ProjectRecord[];
}

export function publicUser(user: UserRecord) {
  return { id: user.id, name: user.name, email: user.emailNormalized };
}
