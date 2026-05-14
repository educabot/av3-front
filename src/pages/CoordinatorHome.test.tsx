import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient } from '@/test-utils';
import { referenceKeys } from '@/hooks/queries/useReferenceQueries';
import { coordinationKeys } from '@/hooks/queries/useCoordinationQueries';
import { useAuthStore } from '@/store/authStore';
import { CoordinatorHome } from './CoordinatorHome';
import type { Course, CoordinationDocument } from '@/types';

const mockCourses: Course[] = [
  { id: 1, name: '1A' },
  { id: 2, name: '1B' },
];

const mockDocuments: CoordinationDocument[] = [
  {
    id: 10,
    name: 'Doc publicado',
    area_id: 1,
    area: { id: 1, name: 'Matematicas' },
    start_date: '2026-03-01',
    end_date: '2026-07-01',
    status: 'published',
    created_at: '2026-01-01',
  },
  {
    id: 11,
    name: 'Doc en progreso',
    area_id: 1,
    area: { id: 1, name: 'Matematicas' },
    start_date: '2026-03-01',
    end_date: '2026-07-01',
    status: 'in_progress',
    created_at: '2026-01-01',
  },
];

let queryClient: ReturnType<typeof createTestQueryClient>;

function renderHome() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CoordinatorHome />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CoordinatorHome', () => {
  beforeEach(() => {
    queryClient = createTestQueryClient();
    useAuthStore.setState({
      user: { id: 1, name: 'Carlos Test', email: 'c@t.com', avatar: '', roles: ['coordinator'] },
    });
    queryClient.setQueryData(referenceKeys.courses, mockCourses);
    queryClient.setQueryData(referenceKeys.courseSubjects, []);
    queryClient.setQueryData(coordinationKeys.all, mockDocuments);
  });

  it('greets the user by first name', () => {
    renderHome();
    expect(screen.getByText(/Hola Carlos/i)).toBeInTheDocument();
  });

  it('shows document stats', () => {
    renderHome();
    expect(screen.getByText('1 publicados')).toBeInTheDocument();
  });

  it('lists the courses from the query cache', () => {
    renderHome();
    expect(screen.getByText('1A')).toBeInTheDocument();
    expect(screen.getByText('1B')).toBeInTheDocument();
  });

  it('lists coordination documents', () => {
    renderHome();
    expect(screen.getAllByText('Doc publicado').length).toBeGreaterThan(0);
    expect(screen.getByText('Doc en progreso')).toBeInTheDocument();
  });

  it('shows empty state when there are no documents', () => {
    queryClient.setQueryData(coordinationKeys.all, []);
    renderHome();
    expect(screen.getByText('Sin documentos')).toBeInTheDocument();
  });
});
