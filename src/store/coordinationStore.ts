import { create } from 'zustand';
import type { CoordinationDocument, ChatMessage } from '@/types';

interface WizardData {
  step: number;
  name: string;
  areaId: number | null;
  topicIds: number[];
  startDate: string;
  endDate: string;
  subjectsData: Record<string, unknown>;
}

const initialWizardData: WizardData = {
  step: 1,
  name: '',
  areaId: null,
  topicIds: [],
  startDate: '',
  endDate: '',
  subjectsData: {},
};

interface CoordinationState {
  documents: CoordinationDocument[];
  currentDocument: CoordinationDocument | null;
  wizardData: WizardData;
  chatHistory: ChatMessage[];
  isGenerating: boolean;
  expandedSubjects: Record<string, boolean>;

  setDocuments: (documents: CoordinationDocument[]) => void;
  setCurrentDocument: (doc: CoordinationDocument | null) => void;
  updateWizardData: (data: Partial<WizardData>) => void;
  resetWizardData: () => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  setIsGenerating: (isGenerating: boolean) => void;
  toggleSubjectExpanded: (subjectId: string) => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
  documents: [],
  currentDocument: null,
  wizardData: { ...initialWizardData },
  chatHistory: [],
  isGenerating: false,
  expandedSubjects: {},

  setDocuments: (documents) => set({ documents }),
  setCurrentDocument: (currentDocument) => set({ currentDocument }),
  updateWizardData: (data) =>
    set((state) => ({ wizardData: { ...state.wizardData, ...data } })),
  resetWizardData: () => set({ wizardData: { ...initialWizardData } }),
  addChatMessage: (message) =>
    set((state) => ({ chatHistory: [...state.chatHistory, message] })),
  clearChatHistory: () => set({ chatHistory: [] }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  toggleSubjectExpanded: (subjectId) =>
    set((state) => ({
      expandedSubjects: {
        ...state.expandedSubjects,
        [subjectId]: !state.expandedSubjects[subjectId],
      },
    })),
}));
