import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useResourceStore } from '@/store/resourceStore';
import { useReferenceStore } from '@/store/referenceStore';
import { Resources } from './Resources';
import type { Resource, CourseSubject } from '@/types';

const listResourcesMock = vi.fn();
vi.mock('@/services/api', () => ({
  resourcesApi: {
    list: (...args: unknown[]) => listResourcesMock(...args),
    delete: vi.fn(),
  },
  resourceTypesApi: {
    list: vi.fn().mockResolvedValue({ items: [], more: false }),
  },
}));

const mockResources: Resource[] = [
  {
    id: 1,
    resource_type_id: 1,
    resource_type_name: 'Guia de estudio',
    title: 'Guia Algebra',
    content: { body: 'texto' },
    user_id: 3,
    course_subject_id: 10,
    status: 'active',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 2,
    resource_type_id: 1,
    resource_type_name: 'Guia de estudio',
    title: 'Guia Fisica',
    content: {},
    user_id: 3,
    course_subject_id: 11,
    status: 'draft',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

const mockCourseSubjects: CourseSubject[] = [
  {
    id: 10,
    course_id: 1,
    course_name: '1A',
    subject_id: 1,
    subject_name: 'Matematicas',
    teacher_id: 3,
    teacher_name: 'Maria',
    school_year: 2026,
  },
  {
    id: 11,
    course_id: 2,
    course_name: '1B',
    subject_id: 2,
    subject_name: 'Fisica',
    teacher_id: 3,
    teacher_name: 'Maria',
    school_year: 2026,
  },
];

function renderResources() {
  return render(
    <MemoryRouter>
      <Resources />
    </MemoryRouter>,
  );
}

describe('Resources page', () => {
  beforeEach(() => {
    useResourceStore.setState({ resources: mockResources });
    useReferenceStore.setState({ courseSubjects: mockCourseSubjects, subjects: [] });
    listResourcesMock.mockResolvedValue({ items: mockResources, more: false });
  });

  it('shows the page title', async () => {
    renderResources();
    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument();
  });

  it('shows empty state when there are no resources', async () => {
    useResourceStore.setState({ resources: [] });
    listResourcesMock.mockResolvedValueOnce({ items: [], more: false });
    renderResources();
    await waitFor(() => {
      expect(screen.getByText('Sin recursos creados')).toBeInTheDocument();
    });
  });

  it('renders the create resource button', async () => {
    renderResources();
    expect(screen.getByRole('button', { name: /crear recurso/i })).toBeInTheDocument();
  });

  it('lists the resources', async () => {
    renderResources();
    await waitFor(() => {
      expect(screen.getByText('Guia Algebra')).toBeInTheDocument();
      expect(screen.getByText('Guia Fisica')).toBeInTheDocument();
    });
  });
});
