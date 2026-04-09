import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useReferenceStore } from '@/store/referenceStore';
import { TeacherHome } from './TeacherHome';
import type { CourseSubject } from '@/types';

// Mock notifications data since it's not critical to what we're testing
vi.mock('@/mocks/mock-config', () => ({
  MOCK_NOTIFICATIONS: [],
}));

const mockCourseSubjects: CourseSubject[] = [
  {
    id: 1,
    course_id: 10,
    course_name: '1A',
    subject_id: 20,
    subject_name: 'Matematicas',
    teacher_id: 3,
    teacher_name: 'Maria Docente',
    school_year: 2026,
  },
  {
    id: 2,
    course_id: 11,
    course_name: '2B',
    subject_id: 21,
    subject_name: 'Fisica',
    teacher_id: 3,
    teacher_name: 'Maria Docente',
    school_year: 2026,
  },
  {
    id: 3,
    course_id: 12,
    course_name: '3C',
    subject_id: 22,
    subject_name: 'Otra materia',
    teacher_id: 99, // different teacher
    teacher_name: 'Otro',
    school_year: 2026,
  },
];

function renderHome() {
  return render(
    <MemoryRouter>
      <TeacherHome />
    </MemoryRouter>,
  );
}

describe('TeacherHome', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 3, name: 'Maria Docente', email: 'm@t.com', avatar: '', roles: ['teacher'] },
    });
    useReferenceStore.setState({ courseSubjects: mockCourseSubjects });
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
