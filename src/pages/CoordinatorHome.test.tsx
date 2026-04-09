import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useReferenceStore } from '@/store/referenceStore';
import { useCoordinationStore } from '@/store/coordinationStore';
import { CoordinatorHome } from './CoordinatorHome';
import type { Course, CoordinationDocument } from '@/types';

const mockCourses: Course[] = [
  { id: 1, name: '1A', school_year: 2026, created_at: '2026-01-01' },
  { id: 2, name: '1B', school_year: 2026, created_at: '2026-01-01' },
];

const mockDocuments: CoordinationDocument[] = [
  {
    id: 10,
    organization_id: 1,
    name: 'Doc publicado',
    area_id: 1,
    area_name: 'Matematicas',
    start_date: '2026-03-01',
    end_date: '2026-07-01',
    status: 'published',
    sections: {},
    topics: [],
    subjects: [],
    org_config: { coord_doc_sections: [] },
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
  {
    id: 11,
    organization_id: 1,
    name: 'Doc en progreso',
    area_id: 1,
    area_name: 'Matematicas',
    start_date: '2026-03-01',
    end_date: '2026-07-01',
    status: 'in_progress',
    sections: {},
    topics: [],
    subjects: [],
    org_config: { coord_doc_sections: [] },
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

function renderHome() {
  return render(
    <MemoryRouter>
      <CoordinatorHome />
    </MemoryRouter>,
  );
}

describe('CoordinatorHome', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 1, name: 'Carlos Test', email: 'c@t.com', avatar: '', roles: ['coordinator'] },
    });
    useReferenceStore.setState({ courses: mockCourses });
    useCoordinationStore.setState({ documents: mockDocuments });
  });

  it('greets the user by first name', () => {
    renderHome();
    expect(screen.getByText(/Hola Carlos/i)).toBeInTheDocument();
  });

  it('shows document stats', () => {
    renderHome();
    expect(screen.getByText('1 publicados')).toBeInTheDocument();
  });

  it('lists the courses from the reference store', () => {
    renderHome();
    expect(screen.getByText('1A')).toBeInTheDocument();
    expect(screen.getByText('1B')).toBeInTheDocument();
  });

  it('lists coordination documents', () => {
    renderHome();
    // "Doc publicado" appears in both the main list and the PublishedDocumentsCard preview
    expect(screen.getAllByText('Doc publicado').length).toBeGreaterThan(0);
    expect(screen.getByText('Doc en progreso')).toBeInTheDocument();
  });

  it('shows empty state when there are no documents', () => {
    useCoordinationStore.setState({ documents: [] });
    renderHome();
    expect(screen.getByText('Sin documentos')).toBeInTheDocument();
  });
});
