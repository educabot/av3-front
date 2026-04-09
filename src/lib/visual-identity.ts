import type { OrgConfig } from '@/types';

/**
 * Applies the org's visual identity as CSS custom properties on :root.
 * Called once after config loads.
 */
export function applyVisualIdentity(config: OrgConfig) {
  const root = document.documentElement;
  const vi = config.visual_identity;

  if (!vi) return;

  if (vi.primary_color) {
    root.style.setProperty('--color-primary', vi.primary_color);
  }

  if (vi.platform_name) {
    document.title = vi.platform_name;
  }
}

/** Removes any visual identity overrides (e.g. on logout) */
export function clearVisualIdentity() {
  const root = document.documentElement;
  root.style.removeProperty('--color-primary');
  document.title = 'Alizia';
}
