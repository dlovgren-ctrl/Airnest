import { supabase } from "./supabase";

export type ProgramMode = "quick" | "eco" | "normal";

export type ActiveProgram = {
  mode: ProgramMode;
  endTime: number;
};

const STORAGE_KEY_PREFIX = "activeProgram:";

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export async function loadActiveProgram(
  userId: string
): Promise<ActiveProgram | null> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ActiveProgram;
    if (!parsed?.endTime || parsed.endTime <= Date.now()) {
      localStorage.removeItem(getStorageKey(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveActiveProgram(
  userId: string,
  program: ActiveProgram
): Promise<void> {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(program));
  } catch {
    // ignore storage errors
  }
}

export async function clearActiveProgram(userId: string): Promise<void> {
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch {
    // ignore storage errors
  }
}

