type Env = {
  PORT: number;
  HOST: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  LEVEL_UP_EVERY_DAYS: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getEnv(): Env {
  return {
    PORT: Number(process.env.PORT ?? 3000),
    HOST: process.env.HOST ?? "0.0.0.0",
    SUPABASE_URL: requireEnv("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    LEVEL_UP_EVERY_DAYS: Number(process.env.LEVEL_UP_EVERY_DAYS ?? 7),
  };
}
