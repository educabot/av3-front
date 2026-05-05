import { z } from 'zod';

export const userRoleSchema = z.enum(['teacher', 'coordinator', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string().optional(),
  roles: z.array(userRoleSchema),
});
export type User = z.infer<typeof userSchema>;

export const loginRequestSchema = z.object({
  email: z.string(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const jwtClaimsSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string().optional(),
  roles: z.array(userRoleSchema),
  aud: z.array(z.string()).optional(),
  exp: z.number().optional(),
  iss: z.string().optional(),
});
export type JWTClaims = z.infer<typeof jwtClaimsSchema>;
