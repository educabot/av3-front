import { z } from 'zod';

export const subjectSchema = z.object({
  id: z.number(),
  area_id: z.number(),
  name: z.string(),
  description: z.string().optional(),
});
export type Subject = z.infer<typeof subjectSchema>;

export const subjectUpdateSchema = z.object({
  name: z.string().optional(),
  area_id: z.number().optional(),
  description: z.string().optional(),
});
export type SubjectUpdate = z.infer<typeof subjectUpdateSchema>;

export const subjectCreateSchema = z.object({
  name: z.string(),
  area_id: z.number(),
  description: z.string().optional(),
});
export type SubjectCreate = z.infer<typeof subjectCreateSchema>;

export const subjectCompactSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type SubjectCompact = z.infer<typeof subjectCompactSchema>;
