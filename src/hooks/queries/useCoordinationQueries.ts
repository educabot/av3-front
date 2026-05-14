import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coordinationDocumentsApi, suggestedClassCountsApi } from '@/services/api';
import type {
  CoordinationDocumentCreate,
  GenerateRequest,
  PublishDocumentRequest,
  UpdateClassRequest,
  CoordDocChatRequest,
} from '@/types';

export const coordinationKeys = {
  all: ['coordinationDocuments'] as const,
  detail: (id: number) => ['coordinationDocuments', id] as const,
  chatHistory: (id: number) => ['coordinationDocuments', id, 'chatHistory'] as const,
  suggestedClassCounts: (areaId: number) => ['suggestedClassCounts', areaId] as const,
};

export function useCoordinationDocumentsQuery() {
  return useQuery({
    queryKey: coordinationKeys.all,
    queryFn: async () => (await coordinationDocumentsApi.list()).items,
  });
}

export function useCoordinationDocumentQuery(id: number) {
  return useQuery({
    queryKey: coordinationKeys.detail(id),
    queryFn: () => coordinationDocumentsApi.getById(id),
    enabled: id > 0,
  });
}

export function useCreateDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CoordinationDocumentCreate) => coordinationDocumentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coordinationKeys.all });
    },
  });
}

export function useUpdateSectionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sections }: { id: number; sections: Record<string, unknown> }) =>
      coordinationDocumentsApi.updateSections(id, sections),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: coordinationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: coordinationKeys.all });
    },
  });
}

export function useArchiveDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => coordinationDocumentsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coordinationKeys.all });
    },
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => coordinationDocumentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coordinationKeys.all });
    },
  });
}

export function useGenerateDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: GenerateRequest }) =>
      coordinationDocumentsApi.generate(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: coordinationKeys.detail(id) });
    },
  });
}

export function useUpdateClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, classId, data }: { docId: number; classId: number; data: UpdateClassRequest }) =>
      coordinationDocumentsApi.updateClass(docId, classId, data),
    onSuccess: (result, { docId }) => {
      queryClient.setQueryData(coordinationKeys.detail(docId), result);
    },
  });
}

export function usePublishDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: PublishDocumentRequest }) =>
      coordinationDocumentsApi.publish(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: coordinationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: coordinationKeys.all });
    },
  });
}

export function useChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CoordDocChatRequest }) =>
      coordinationDocumentsApi.chat(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: coordinationKeys.chatHistory(id) });
    },
  });
}

export function useChatHistoryQuery(id: number, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: coordinationKeys.chatHistory(id),
    queryFn: () => coordinationDocumentsApi.getChatHistory(id, params),
    enabled: id > 0,
  });
}

export function useSuggestedClassCountsQuery(
  areaId: number,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: [...coordinationKeys.suggestedClassCounts(areaId), startDate, endDate],
    queryFn: () => suggestedClassCountsApi.getByArea(areaId, startDate, endDate),
    enabled: areaId > 0 && Boolean(startDate) && Boolean(endDate),
  });
}
