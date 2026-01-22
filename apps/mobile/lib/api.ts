import type { Session } from '@supabase/supabase-js';

const baseUrl: string = (() => {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!value) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');
  }
  return value;
})();

export class ApiError extends Error {
  status: number;
  bodyText: string;

  constructor(status: number, message: string, bodyText: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.bodyText = bodyText;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export async function apiFetch<T>(
  session: Session,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  const hasBody = init.body !== undefined;
  const hasContentType = headers.has('Content-Type') || headers.has('content-type');

  // Avoid sending `Content-Type: application/json` for requests with no body.
  // Fastify will reject empty JSON bodies when this header is present.
  if (hasBody && !hasContentType) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Cannot reach API at ${baseUrl}. Is apps/api running? (npm run api:dev)\n${message}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text || res.statusText;
    try {
      const parsed = text ? (JSON.parse(text) as any) : null;
      if (parsed && typeof parsed === 'object') {
        message =
          (typeof parsed.message === 'string' && parsed.message) ||
          (typeof parsed.error === 'string' && parsed.error) ||
          message;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(res.status, `API ${res.status}: ${message}`, text);
  }

  return (await res.json()) as T;
}
