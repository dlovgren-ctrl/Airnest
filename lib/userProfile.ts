import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const META_FULL_NAME = "full_name";

function normalizeAlias(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function getFullNameFromUser(user: User | null): string {
  if (!user) return "";
  const raw = user.user_metadata?.[META_FULL_NAME];
  return typeof raw === "string" ? normalizeAlias(raw) : "";
}

export async function fetchAuthUserProfile(): Promise<{
  fullName: string;
  email: string;
} | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const u = data.user;
  const fullName = getFullNameFromUser(u);
  return {
    fullName,
    email: u.email ?? "",
  };
}
