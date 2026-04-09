import { create } from 'zustand';
import { resourcesApi, resourceTypesApi } from '@/services/api';
import type { Resource, ResourceCreate, ResourceType } from '@/types';

interface ResourceState {
  resources: Resource[];
  resourceTypes: ResourceType[];
  currentResource: Resource | null;
  isGenerating: boolean;

  setResources: (resources: Resource[]) => void;
  setResourceTypes: (types: ResourceType[]) => void;
  setCurrentResource: (resource: Resource | null) => void;
  setIsGenerating: (v: boolean) => void;

  fetchResourceTypes: () => Promise<void>;
  fetchResources: () => Promise<void>;
  createResource: (data: ResourceCreate) => Promise<Resource>;
  updateResource: (id: number, data: { title?: string; content?: Record<string, unknown>; status?: string }) => Promise<void>;
  generateContent: (id: number, customInstruction?: string) => Promise<Record<string, unknown>>;
  deleteResource: (id: number) => Promise<void>;
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  resources: [],
  resourceTypes: [],
  currentResource: null,
  isGenerating: false,

  setResources: (resources) => set({ resources }),
  setResourceTypes: (resourceTypes) => set({ resourceTypes }),
  setCurrentResource: (currentResource) => set({ currentResource }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  fetchResourceTypes: async () => {
    const res = await resourceTypesApi.list();
    set({ resourceTypes: res.items });
  },

  fetchResources: async () => {
    const res = await resourcesApi.list();
    set({ resources: res.items });
  },

  createResource: async (data) => {
    const resource = await resourcesApi.create(data);
    set((s) => ({ resources: [...s.resources, resource] }));
    return resource;
  },

  updateResource: async (id, data) => {
    const updated = await resourcesApi.update(id, data);
    set((s) => ({
      resources: s.resources.map((r) => (r.id === id ? { ...r, ...updated } : r)),
      currentResource: s.currentResource?.id === id ? { ...s.currentResource, ...updated } : s.currentResource,
    }));
  },

  generateContent: async (id, customInstruction) => {
    set({ isGenerating: true });
    try {
      const result = await resourcesApi.generate(id, customInstruction ? { custom_instruction: customInstruction } : undefined);
      // Refetch to get updated content
      const resource = await resourcesApi.getById(id);
      set((s) => ({
        currentResource: s.currentResource?.id === id ? resource : s.currentResource,
        resources: s.resources.map((r) => (r.id === id ? resource : r)),
      }));
      return result.content;
    } finally {
      set({ isGenerating: false });
    }
  },

  deleteResource: async (id) => {
    await resourcesApi.delete(id);
    set((s) => ({
      resources: s.resources.filter((r) => r.id !== id),
      currentResource: s.currentResource?.id === id ? null : s.currentResource,
    }));
  },
}));
