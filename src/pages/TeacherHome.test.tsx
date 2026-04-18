import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient } from '@/test-utils';
import { referenceKeys } from '@/hooks/queries/useReferenceQueries';
import { useAuthStore } from '@/store/authStore';
import { TeacherHome } from './TeacherHome';
import type { CourseSubject } from '@/types';

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    notificationsApi: {
      list: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
      markAsRead: vi.fn().mockResolvedValue(undefined),
    },
  };
});

const mockCourseSubjects: CourseSubject[] = [
  {
    id: 1,
    course_id: 10,
    subject_id: 20,
    teacher_id: 3,
    school_year: 2026,
    subject: { id: 20, name: 'Matematicas' },
    teacher: { id: 3, first_name: 'Maria', last_name: 'Docente' },
  },
  {
    id: 2,
    course_id: 11,
    subject_id: 21,
    teacher_id: 3,
    school_year: 2026,
    subject: { id: 21, name: 'Fisica' },
    teacher: { id: 3, first_name: 'Maria', last_name: 'Docente' },
  },
  {
    id: 3,
    course_id: 12,
    subject_id: 22,
    teacher_id: 99, // different teacher
    school_year: 2026,
    subject: { id: 22, name: 'Otra materia' },
    teacher: { id: 99, first_name: 'Otro', last_name: '' },
  },
];

let queryClient: ReturnType<typeof createTestQueryClient>;

function renderHome() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeacherHome />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherHome', () => {
  beforeEach(() => {
    queryClient = createTestQueryClient();
    useAuthStore.setState({
      user: { id: 3, name: 'Maria Docente', email: 'm@t.com', avatar: '', roles: ['teacher'] },
    });
    queryClient.setQueryData(referenceKeys.courseSubjects, mockCourseSubjects);
  });

  it('greets the user by first name', () => {
    renderHome();
    expect(screen.getByText(/Hola Maria/i)).toBeInTheDocument();
  });

  it('lists only the teacher own course subjects', () => {
    renderHome();
    expect(screen.getByText('Matematicas')).toBeInTheDocument();
    expect(screen.getByText('Fisica')).toBeInTheDocument();
    expect(screen.queryByText('Otra materia')).not.toBeInTheDocument();
  });
});
