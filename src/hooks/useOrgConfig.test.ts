import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConfigStore } from '@/store/configStore';
import { useOrgConfig, useFeatureFlag, useLevelName } from './useOrgConfig';

describe('useOrgConfig hooks', () => {
  beforeEach(() => {
    useConfigStore.getState().reset();
  });

  describe('useOrgConfig', () => {
    it('returns current org config', () => {
      const { result } = renderHook(() => useOrgConfig());
      expect(result.current.topic_max_levels).toBe(3);
    });
  });

  describe('useFeatureFlag', () => {
    it('defaults to true when module not set', () => {
      const { result } = renderHook(() => useFeatureFlag('contenido'));
      expect(result.current).toBe(true);
    });

    it('returns false when module is disabled', () => {
      useConfigStore.getState().setOrgConfig({
        ...useConfigStore.getState().orgConfig,
        modules: { contenido: false },
      });

      const { result } = renderHook(() => useFeatureFlag('contenido'));
      expect(result.current).toBe(false);
    });

    it('returns true when module is enabled', () => {
      useConfigStore.getState().setOrgConfig({
        ...useConfigStore.getState().orgConfig,
        modules: { planificacion: true },
      });

      const { result } = renderHook(() => useFeatureFlag('planificacion'));
      expect(result.current).toBe(true);
    });
  });

  describe('useLevelName', () => {
    it('returns level name from config', () => {
      const { result } = renderHook(() => useLevelName(1));
      expect(result.current).toBe('Nivel 1');
    });

    it('returns custom level names', () => {
      useConfigStore.getState().setOrgConfig({
        ...useConfigStore.getState().orgConfig,
        topic_level_names: ['Nucleo', 'Area', 'Categoria'],
      });

      const { result: r1 } = renderHook(() => useLevelName(1));
      expect(r1.current).toBe('Nucleo');

      const { result: r2 } = renderHook(() => useLevelName(2));
      expect(r2.current).toBe('Area');
    });

    it('falls back for out-of-range levels', () => {
      const { result } = renderHook(() => useLevelName(99));
      expect(result.current).toBe('Nivel 99');
    });
  });
});
