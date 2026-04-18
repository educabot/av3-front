import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient } from '@/test-utils';
import { referenceKeys } from '@/hooks/queries/useReferenceQueries';
import { Resources } from './Resources';
import type { Resource, CourseSubject } from '@/types';
import { resourcesApi } from '@/services/api';

vi.mock('@/services/api', () => ({
  resourcesApi: {
    list: vi.fn().mockResolvedValue({ items: [], more: false }),
    delete: vi.fn(),
  },
  resourceTypesApi: {
    list: vi.fn().mockResolvedValue({ items: [], more: false }),
  },
}));

const listMock = resourcesApi.list as ReturnType<typeof vi.fn>;

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
    subject_id: 1,
    teacher_id: 3,
    school_year: 2026,
    subject: { id: 1, name: 'Matematicas' },
    teacher: { id: 3, first_name: 'Maria', last_name: 'Docente' },
  },
  {
    id: 11,
    course_id: 2,
    subject_id: 2,
    teacher_id: 3,
    school_year: 2026,
    subject: { id: 2, name: 'Fisica' },
    teacher: { id: 3, first_name: 'Maria', last_name: 'Docente' },
  },
];

let queryClient: ReturnType<typeof createTestQueryClient>;

function renderResources() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Resources />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Resources page', () => {
  beforeEach(() => {
    queryClient = createTestQueryClient();
    listMock.mockResolvedValue({ items: mockResources, more: false });
    queryClient.setQueryData(referenceKeys.courseSubjects, mockCourseSubjects);
    queryClient.setQueryData(referenceKeys.subjects, []);
  });

  it('shows the page title', async () => {
    renderResources();
    expect(screen.getByRole('heading', { name: 'Recursos' })).toBeInTheDocument();
  });

  it('shows empty state when there are no resources', async () => {
    listMock.mockResolvedValue({ items: [], more: false });
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
    });
    expect(screen.getByText('Guia Fisica')).toBeInTheDocument();
  });
});
