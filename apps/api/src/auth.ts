import type { FastifyRequest } from "fastify";

import { createAdminSupabaseClient } from "./supabase";

export type AuthedRequest = FastifyRequest & {
  user: {
    id: string;
    email: string | null;
  };
};

export function getBearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [kind, token] = header.split(" ");
  if (kind?.toLowerCase() !== "bearer") return null;
  if (!token) return null;
  return token;
}

export async function requireUser(
  req: FastifyRequest,
): Promise<AuthedRequest["user"]> {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error("Missing Authorization header");
    // @ts-expect-error fastify statusCode
    err.statusCode = 401;
    throw err;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    const err = new Error("Invalid or expired session");
    // @ts-expect-error fastify statusCode
    err.statusCode = 401;
    throw err;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}
