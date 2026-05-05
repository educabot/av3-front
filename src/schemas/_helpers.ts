import { z } from 'zod';

/**
 * Backend (team-ai-toolkit) wraps paginated responses as `{ items, more }`.
 * Use this helper to compose a schema with the item type.
 */
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    more: z.boolean(),
  });
}

export type Paginated<T> = {
  items: T[];
  more: boolean;
};
