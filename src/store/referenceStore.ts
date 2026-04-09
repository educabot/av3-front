import { create } from 'zustand';
import type { Area, Course, Subject, Topic, CourseSubject, Activity, Font } from '@/types';

interface ActivitiesByMoment {
  apertura: Activity[];
  desarrollo: Activity[];
  cierre: Activity[];
}

interface ReferenceState {
  courses: Course[];
  areas: Area[];
  subjects: Subject[];
  topics: Topic[];
  courseSubjects: CourseSubject[];
  activitiesByMoment: ActivitiesByMoment;
  fonts: Font[];

  setCourses: (courses: Course[]) => void;
  setAreas: (areas: Area[]) => void;
  setSubjects: (subjects: Subject[]) => void;
  setTopics: (topics: Topic[]) => void;
  setCourseSubjects: (courseSubjects: CourseSubject[]) => void;
  setActivitiesByMoment: (activitiesByMoment: ActivitiesByMoment) => void;
  setFonts: (fonts: Font[]) => void;
}

export const useReferenceStore = create<ReferenceState>((set) => ({
  courses: [],
  areas: [],
  subjects: [],
  topics: [],
  courseSubjects: [],
  activitiesByMoment: { apertura: [], desarrollo: [], cierre: [] },
  fonts: [],

  setCourses: (courses) => set({ courses }),
  setAreas: (areas) => set({ areas }),
  setSubjects: (subjects) => set({ subjects }),
  setTopics: (topics) => set({ topics }),
  setCourseSubjects: (courseSubjects) => set({ courseSubjects }),
  setActivitiesByMoment: (activitiesByMoment) => set({ activitiesByMoment }),
  setFonts: (fonts) => set({ fonts }),
}));
