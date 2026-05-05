import { z } from 'zod';
import { userRoleSchema } from './auth';

export const sectionTypeSchema = z.enum(['text', 'select_text', 'markdown']);
export type SectionType = z.infer<typeof sectionTypeSchema>;

export const sectionConfigSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: sectionTypeSchema,
  options: z.array(z.string()).optional(),
  ai_prompt: z.string(),
  required: z.boolean(),
});
export type SectionConfig = z.infer<typeof sectionConfigSchema>;

export const profileFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'number', 'select', 'multiselect']),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});
export type ProfileField = z.infer<typeof profileFieldSchema>;

export const tourStepSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  roles: z.array(userRoleSchema).optional(),
  requires_feature: z.string().optional(),
});
export type TourStep = z.infer<typeof tourStepSchema>;

export const onboardingConfigSchema = z.object({
  skip_allowed: z.boolean(),
  profile_fields: z.array(profileFieldSchema),
  tour_steps: z.array(tourStepSchema),
});
export type OnboardingConfig = z.infer<typeof onboardingConfigSchema>;

export const orgConfigSchema = z.object({
  topic_max_levels: z.number(),
  topic_level_names: z.array(z.string()),
  topic_selection_level: z.number(),
  shared_classes_enabled: z.boolean(),
  desarrollo_max_activities: z.number(),
  coord_doc_sections: z.array(sectionConfigSchema),
  features: z.record(z.string(), z.boolean()),
  visual_identity: z
    .object({
      platform_name: z.string(),
      logo_url: z.string().nullable(),
      primary_color: z.string(),
    })
    .optional(),
  ai_settings: z
    .object({
      tone: z.string(),
      max_generation_length: z.number(),
      max_chat_interactions: z.number(),
    })
    .optional(),
  onboarding: onboardingConfigSchema.optional(),
});
export type OrgConfig = z.infer<typeof orgConfigSchema>;

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  config: orgConfigSchema,
});
export type Organization = z.infer<typeof organizationSchema>;
