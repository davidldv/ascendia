import type { Session } from "@supabase/supabase-js";

const baseUrl: string = (() => {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!value) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }
  return value;
})();

export async function apiFetch<T>(
  session: Session,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Cannot reach API at ${baseUrl}. Is apps/api running? (npm run api:dev)\n${message}`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}
