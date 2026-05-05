import { z } from 'zod';

const envSchema = z.object({
  API_BASE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse({
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
});

if (!result.success) {
  const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration — ${issues}`);
}

export const env: Env = result.data;
