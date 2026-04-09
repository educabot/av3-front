import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from './configStore';
import type { OrgConfig } from '@/types';

const TEST_CONFIG: OrgConfig = {
  topic_max_levels: 4,
  topic_level_names: ['Eje', 'Nucleo', 'Area', 'Categoria'],
  topic_selection_level: 4,
  shared_classes_enabled: true,
  desarrollo_max_activities: 5,
  coord_doc_sections: [],
  modules: { contenido: false, planificacion: true },
  visual_identity: { platform_name: 'Test Platform', logo_url: null, primary_color: '#ff0000' },
};

describe('configStore', () => {
  beforeEach(() => {
    useConfigStore.getState().reset();
  });

  it('starts with default config and isLoaded false', () => {
    const state = useConfigStore.getState();
    expect(state.isLoaded).toBe(false);
    expect(state.orgConfig.topic_max_levels).toBe(3);
  });

  it('sets org config and marks as loaded', () => {
    useConfigStore.getState().setOrgConfig(TEST_CONFIG);

    const state = useConfigStore.getState();
    expect(state.isLoaded).toBe(true);
    expect(state.orgConfig.topic_max_levels).toBe(4);
    expect(state.orgConfig.modules.contenido).toBe(false);
    expect(state.orgConfig.visual_identity?.platform_name).toBe('Test Platform');
  });

  it('resets to defaults', () => {
    useConfigStore.getState().setOrgConfig(TEST_CONFIG);
    useConfigStore.getState().reset();

    const state = useConfigStore.getState();
    expect(state.isLoaded).toBe(false);
    expect(state.orgConfig.topic_max_levels).toBe(3);
  });
});
