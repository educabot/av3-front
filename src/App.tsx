import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useReferenceStore } from '@/store/referenceStore';
import { useCoordinationStore } from '@/store/coordinationStore';
import { useConfigStore } from '@/store/configStore';
import { useResourceStore } from '@/store/resourceStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RequireModule } from '@/components/auth/RequireModule';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingFallback } from '@/components/LoadingFallback';
import { MainLayout } from './components/layout/MainLayout';
import { applyVisualIdentity, clearVisualIdentity } from '@/lib/visual-identity';
import {
  areasApi,
  coursesApi,
  subjectsApi,
  coordinationDocumentsApi,
  courseSubjectsApi,
  activitiesApi,
  topicsApi,
  orgApi,
} from './services/api';
import {
  MOCK_ORG_CONFIG,
  MOCK_TOPICS,
  MOCK_AREAS,
  MOCK_SUBJECTS,
  MOCK_COURSES,
  MOCK_COURSE_SUBJECTS,
  MOCK_ACTIVITIES,
  MOCK_FONTS,
  MOCK_RESOURCE_TYPES,
  MOCK_RESOURCES,
} from '@/mocks/mock-config';

// Lazy-loaded pages — each becomes its own chunk
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const CoordinatorHome = lazy(() => import('./pages/CoordinatorHome').then((m) => ({ default: m.CoordinatorHome })));
const TeacherHome = lazy(() => import('./pages/TeacherHome').then((m) => ({ default: m.TeacherHome })));
const Course = lazy(() => import('./pages/Course').then((m) => ({ default: m.Course })));
const Wizard = lazy(() => import('./pages/Wizard').then((m) => ({ default: m.Wizard })));
const Document = lazy(() => import('./pages/Document').then((m) => ({ default: m.Document })));
const TeacherCourseSubject = lazy(() => import('./pages/TeacherCourseSubject').then((m) => ({ default: m.TeacherCourseSubject })));
const TeacherPlanWizard = lazy(() => import('./pages/TeacherPlanWizard').then((m) => ({ default: m.TeacherPlanWizard })));
const TeacherLessonPlan = lazy(() => import('./pages/TeacherLessonPlan').then((m) => ({ default: m.TeacherLessonPlan })));
const Resources = lazy(() => import('./pages/Resources').then((m) => ({ default: m.Resources })));
const ResourceCreate = lazy(() => import('./pages/ResourceCreate').then((m) => ({ default: m.ResourceCreate })));
const ResourceEditor = lazy(() => import('./pages/ResourceEditor').then((m) => ({ default: m.ResourceEditor })));
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })));

/** Try to load from API, fall back to mocks for local dev without backend */
async function loadOrgConfig(): Promise<void> {
  const setOrgConfig = useConfigStore.getState().setOrgConfig;
  try {
    const { config } = await orgApi.getConfig();
    setOrgConfig(config);
    applyVisualIdentity(config);
  } catch {
    console.warn('[Alizia] Backend unavailable — using mock org config');
    setOrgConfig(MOCK_ORG_CONFIG);
    applyVisualIdentity(MOCK_ORG_CONFIG);
  }
}

async function loadReferenceData(): Promise<void> {
  const { setCourses, setAreas, setSubjects, setTopics, setCourseSubjects, setActivitiesByMoment, setFonts } =
    useReferenceStore.getState();
  const setDocuments = useCoordinationStore.getState().setDocuments;

  try {
    const [courses, areas, subjects, topicsRes, documents, courseSubjects, apertura, desarrollo, cierre] =
      await Promise.all([
        coursesApi.list(),
        areasApi.list(),
        subjectsApi.list(),
        topicsApi.getTree(),
        coordinationDocumentsApi.list(),
        courseSubjectsApi.list(),
        activitiesApi.list({ moment: 'apertura' }),
        activitiesApi.list({ moment: 'desarrollo' }),
        activitiesApi.list({ moment: 'cierre' }),
      ]);

    setCourses(courses.items);
    setAreas(areas.items);
    setSubjects(subjects.items);
    setTopics(topicsRes.items);
    setDocuments(documents.items);
    setCourseSubjects(courseSubjects.items);
    setActivitiesByMoment({
      apertura: apertura.items,
      desarrollo: desarrollo.items,
      cierre: cierre.items,
    });
  } catch {
    console.warn('[Alizia] Backend unavailable — using mock reference data');
    setCourses(MOCK_COURSES);
    setAreas(MOCK_AREAS);
    setSubjects(MOCK_SUBJECTS);
    setTopics(MOCK_TOPICS);
    setCourseSubjects(MOCK_COURSE_SUBJECTS);
    setActivitiesByMoment(MOCK_ACTIVITIES);
    setFonts(MOCK_FONTS);
    setDocuments([]);
    useResourceStore.getState().setResourceTypes(MOCK_RESOURCE_TYPES);
    useResourceStore.getState().setResources(MOCK_RESOURCES);
  }
}

function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  const getUserRole = useAuthStore((s) => s.getUserRole);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    if (user) {
      setIsBootstrapping(true);
      Promise.all([loadOrgConfig(), loadReferenceData()]).finally(() => {
        setIsBootstrapping(false);
      });
    } else {
      useConfigStore.getState().reset();
      clearVisualIdentity();
      setIsBootstrapping(false);
    }
  }, [user]);

  const userRole = getUserRole();

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (isBootstrapping) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/courses/:id/documents/new"
          element={
            <ProtectedRoute roles={['coordinator']}>
              <Wizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/documents/:id"
          element={
            <ProtectedRoute roles={['coordinator']}>
              <Document />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/plans/:id"
          element={
            <ProtectedRoute roles={['teacher']}>
              <RequireModule module="planificacion">
                <TeacherLessonPlan />
              </RequireModule>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources/new"
          element={
            <ProtectedRoute roles={['teacher']}>
              <RequireModule module="contenido">
                <ResourceCreate />
              </RequireModule>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources/:id"
          element={
            <ProtectedRoute roles={['teacher']}>
              <RequireModule module="contenido">
                <ResourceEditor />
              </RequireModule>
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  <Route
                    path="/"
                    element={
                      userRole === 'coordinator' ? (
                        <CoordinatorHome />
                      ) : userRole === 'teacher' ? (
                        <TeacherHome />
                      ) : (
                        <Navigate to="/login" replace />
                      )
                    }
                  />
                  <Route path="/coordinator/courses/:id" element={<Course />} />
                  <Route path="/teacher/courses/:id" element={<TeacherCourseSubject />} />
                  <Route
                    path="/teacher/courses/:csId/plans/:classNumber/new"
                    element={
                      <RequireModule module="planificacion">
                        <TeacherPlanWizard />
                      </RequireModule>
                    }
                  />
                  <Route
                    path="/resources"
                    element={
                      <RequireModule module="contenido">
                        <Resources />
                      </RequireModule>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
