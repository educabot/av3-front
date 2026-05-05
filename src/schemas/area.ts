import { z } from 'zod';
import { subjectSchema } from './subject';

export const userCompactSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  avatar_url: z.string().nullable(),
});
export type UserCompact = z.infer<typeof userCompactSchema>;

export const areaCoordinatorSchema = z.object({
  id: z.number(),
  area_id: z.number(),
  user: userCompactSchema.nullable(),
});
export type AreaCoordinator = z.infer<typeof areaCoordinatorSchema>;

export const areaSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  subjects: z.array(subjectSchema).optional(),
  coordinators: z.array(areaCoordinatorSchema).optional(),
});
export type Area = z.infer<typeof areaSchema>;
