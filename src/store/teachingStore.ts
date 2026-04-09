import { create } from 'zustand';
import type { CourseSubject, LessonPlan, ChatMessage, Moments, ResourcesMode } from '@/types';

interface LessonWizardData {
  step: number;
  classNumber: number | null;
  title: string;
  topicIds: number[];
  objective: string;
  knowledgeContent: string;
  didacticStrategies: string;
  classFormat: string;
  moments: Moments;
  customInstruction: string;
  resourcesMode: ResourcesMode;
  globalFontId: number | null;
  momentFontIds: { apertura: number | null; desarrollo: number | null; cierre: number | null };
}

const initialLessonWizardData: LessonWizardData = {
  step: 1,
  classNumber: null,
  title: '',
  topicIds: [],
  objective: '',
  knowledgeContent: '',
  didacticStrategies: '',
  classFormat: '',
  moments: {
    apertura: { activities: [], activityContent: {} },
    desarrollo: { activities: [], activityContent: {} },
    cierre: { activities: [], activityContent: {} },
  },
  customInstruction: '',
  resourcesMode: 'global',
  globalFontId: null,
  momentFontIds: { apertura: null, desarrollo: null, cierre: null },
};

interface TeachingState {
  teacherCourses: CourseSubject[];
  currentCourseSubject: CourseSubject | null;
  lessonPlans: LessonPlan[];
  lessonWizardData: LessonWizardData;
  currentLessonPlan: LessonPlan | null;
  teacherChatHistory: ChatMessage[];

  setTeacherCourses: (courses: CourseSubject[]) => void;
  setCurrentCourseSubject: (cs: CourseSubject | null) => void;
  setLessonPlans: (plans: LessonPlan[]) => void;
  updateLessonWizardData: (data: Partial<LessonWizardData>) => void;
  resetLessonWizardData: () => void;
  setCurrentLessonPlan: (plan: LessonPlan | null) => void;
  addTeacherChatMessage: (message: ChatMessage) => void;
  clearTeacherChatHistory: () => void;
}

export const useTeachingStore = create<TeachingState>((set) => ({
  teacherCourses: [],
  currentCourseSubject: null,
  lessonPlans: [],
  lessonWizardData: { ...initialLessonWizardData },
  currentLessonPlan: null,
  teacherChatHistory: [],

  setTeacherCourses: (teacherCourses) => set({ teacherCourses }),
  setCurrentCourseSubject: (currentCourseSubject) => set({ currentCourseSubject }),
  setLessonPlans: (lessonPlans) => set({ lessonPlans }),
  updateLessonWizardData: (data) =>
    set((state) => ({ lessonWizardData: { ...state.lessonWizardData, ...data } })),
  resetLessonWizardData: () => set({ lessonWizardData: { ...initialLessonWizardData } }),
  setCurrentLessonPlan: (currentLessonPlan) => set({ currentLessonPlan }),
  addTeacherChatMessage: (message) =>
    set((state) => ({ teacherChatHistory: [...state.teacherChatHistory, message] })),
  clearTeacherChatHistory: () => set({ teacherChatHistory: [] }),
}));
