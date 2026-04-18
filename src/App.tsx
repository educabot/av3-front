import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { createQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/authStore';
import { useConfigStore } from '@/store/configStore';
import { referenceKeys } from '@/hooks/queries/useReferenceQueries';

const queryClient = createQueryClient();
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RequireModule } from '@/components/auth/RequireModule';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteBoundary } from '@/components/RouteBoundary';
import { LoadingFallback } from '@/components/LoadingFallback';
import { ComingSoon } from '@/components/ComingSoon';
import { MainLayout } from './components/layout/MainLayout';
import { applyVisualIdentity, clearVisualIdentity } from '@/lib/visual-identity';
import {
  areasApi,
  coursesApi,
  activitiesApi,
  topicsApi,
  orgApi,
  subjectsApi,
  courseSubjectsApi,
} from './services/api';

// Lazy-loaded pages — each becomes its own chunk
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const TeacherHome = lazy(() => import('./pages/TeacherHome').then((m) => ({ default: m.TeacherHome })));
const Course = lazy(() => import('./pages/Course').then((m) => ({ default: m.Course })));
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })));
const AdminHome = lazy(() => import('./pages/AdminHome').then((m) => ({ default: m.AdminHome })));
const AdminAreas = lazy(() => import('./pages/AdminAreas').then((m) => ({ default: m.AdminAreas })));
const AdminSubjects = lazy(() => import('./pages/AdminSubjects').then((m) => ({ default: m.AdminSubjects })));
const AdminCourses = lazy(() => import('./pages/AdminCourses').then((m) => ({ default: m.AdminCourses })));
const AdminTopics = lazy(() => import('./pages/AdminTopics').then((m) => ({ default: m.AdminTopics })));
const AdminActivities = lazy(() => import('./pages/AdminActivities').then((m) => ({ default: m.AdminActivities })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

async function loadOrgConfig(): Promise<void> {
  const org = await orgApi.getMy();
  useConfigStore.getState().setOrgConfig(org.config);
  applyVisualIdentity(org.config);
}

async function loadReferenceData(): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: referenceKeys.courses,
      queryFn: async () => (await coursesApi.list()).items,
    }),
    queryClient.prefetchQuery({
      queryKey: referenceKeys.areas,
      queryFn: async () => (await areasApi.list()).items,
    }),
    queryClient.prefetchQuery({
      queryKey: referenceKeys.subjects,
      queryFn: async () => (await subjectsApi.list()).items,
    }),
    queryClient.prefetchQuery({
      queryKey: referenceKeys.courseSubjects,
      queryFn: async () => (await courseSubjectsApi.list()).items,
    }),
    queryClient.prefetchQuery({
      queryKey: referenceKeys.topics,
      queryFn: async () => (await topicsApi.getTree()).items,
    }),
    queryClient.prefetchQuery({
      queryKey: referenceKeys.activitiesByMoment,
      queryFn: async () => {
        const [apertura, desarrollo, cierre] = await Promise.all([
          activitiesApi.list({ moment: 'apertura' }),
          activitiesApi.list({ moment: 'desarrollo' }),
          activitiesApi.list({ moment: 'cierre' }),
        ]);
        return { apertura: apertura.items, desarrollo: desarrollo.items, cierre: cierre.items };
      },
    }),
  ]);
}

function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  const getUserRole = useAuthStore((s) => s.getUserRole);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    if (user) {
      setIsBootstrapping(true);
      Promise.all([loadOrgConfig(), loadReferenceData()])
        .catch((err) => {
          console.error('[Alizia] Bootstrap failed:', err);
        })
        .finally(() => {
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
      <RouteBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='*' element={<Navigate to='/login' replace />} />
          </Routes>
        </Suspense>
      </RouteBoundary>
    );
  }

  if (isBootstrapping) {
    return <LoadingFallback />;
  }

  return (
    <RouteBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path='/login' element={<Navigate to='/' replace />} />
          <Route
            path='/onboarding'
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path='/coordinator/courses/:id/documents/new'
            element={
              <ProtectedRoute roles={['coordinator']}>
                <ComingSoon title='Nuevo documento de coordinacion' backHref='/' />
              </ProtectedRoute>
            }
          />
          <Route
            path='/coordinator/documents/new'
            element={
              <ProtectedRoute roles={['coordinator']}>
                <ComingSoon title='Nuevo documento de coordinacion' backHref='/' />
              </ProtectedRoute>
            }
          />
          <Route
            path='/coordinator/documents/:id'
            element={
              <ProtectedRoute roles={['coordinator']}>
                <ComingSoon title='Documento de coordinacion' backHref='/' />
              </ProtectedRoute>
            }
          />
          <Route
            path='/teacher/plans/:id'
            element={
              <ProtectedRoute roles={['teacher']}>
                <RequireModule module='planificacion'>
                  <ComingSoon title='Plan de clase' backHref='/' />
                </RequireModule>
              </ProtectedRoute>
            }
          />
          <Route
            path='/resources/new'
            element={
              <ProtectedRoute roles={['teacher']}>
                <RequireModule module='contenido'>
                  <ComingSoon title='Nuevo recurso' backHref='/' />
                </RequireModule>
              </ProtectedRoute>
            }
          />
          <Route
            path='/resources/:id'
            element={
              <ProtectedRoute roles={['teacher']}>
                <RequireModule module='contenido'>
                  <ComingSoon title='Recurso' backHref='/' />
                </RequireModule>
              </ProtectedRoute>
            }
          />
          <Route
            path='*'
            element={
              <ProtectedRoute>
                <MainLayout>
                  <RouteBoundary>
                    <Routes>
                      <Route
                        path='/'
                        element={
                          userRole === 'coordinator' ? (
                            <ComingSoon
                              title='Coordinacion'
                              description='El modulo de coordinacion esta en desarrollo. Pronto podras gestionar documentos y planificaciones aca.'
                              backHref='/'
                              backLabel='Cerrar sesion para volver a entrar'
                            />
                          ) : userRole === 'teacher' ? (
                            <TeacherHome />
                          ) : userRole === 'admin' ? (
                            <AdminHome />
                          ) : (
                            <Navigate to='/login' replace />
                          )
                        }
                      />
                      <Route
                        path='/coordinator/documents'
                        element={
                          userRole === 'coordinator' ? (
                            <ComingSoon title='Documentos de coordinacion' backHref='/' />
                          ) : (
                            <Navigate to='/' replace />
                          )
                        }
                      />
                      <Route
                        path='/admin/areas'
                        element={userRole === 'admin' ? <AdminAreas /> : <Navigate to='/' replace />}
                      />
                      <Route
                        path='/admin/subjects'
                        element={userRole === 'admin' ? <AdminSubjects /> : <Navigate to='/' replace />}
                      />
                      <Route
                        path='/admin/courses'
                        element={userRole === 'admin' ? <AdminCourses /> : <Navigate to='/' replace />}
                      />
                      <Route
                        path='/admin/topics'
                        element={userRole === 'admin' ? <AdminTopics /> : <Navigate to='/' replace />}
                      />
                      <Route
                        path='/admin/activities'
                        element={userRole === 'admin' ? <AdminActivities /> : <Navigate to='/' replace />}
                      />
                      <Route path='/coordinator/courses/:id' element={<Course />} />
                      <Route
                        path='/teacher/courses/:id'
                        element={<ComingSoon title='Materia' backHref='/' />}
                      />
                      <Route
                        path='/teacher/courses/:csId/plans/:classNumber/new'
                        element={
                          <RequireModule module='planificacion'>
                            <ComingSoon title='Nuevo plan de clase' backHref='/' />
                          </RequireModule>
                        }
                      />
                      <Route
                        path='/resources'
                        element={
                          <RequireModule module='contenido'>
                            <ComingSoon title='Recursos' backHref='/' />
                          </RequireModule>
                        }
                      />
                      <Route path='*' element={<NotFound />} />
                    </Routes>
                  </RouteBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </RouteBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster position='top-right' richColors closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
