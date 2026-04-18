import { create } from 'zustand';
import type { OrgConfig } from '@/types';

const DEFAULT_CONFIG: OrgConfig = {
  topic_max_levels: 3,
  topic_level_names: ['Nivel 1', 'Nivel 2', 'Nivel 3'],
  topic_selection_level: 3,
  shared_classes_enabled: false,
  desarrollo_max_activities: 3,
  coord_doc_sections: [],
  features: {},
};

interface ConfigState {
  orgConfig: OrgConfig;
  isLoaded: boolean;

  setOrgConfig: (config: OrgConfig) => void;
  reset: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  orgConfig: DEFAULT_CONFIG,
  isLoaded: false,

  setOrgConfig: (config) => set({ orgConfig: config, isLoaded: true }),
  reset: () => set({ orgConfig: DEFAULT_CONFIG, isLoaded: false }),
}));
