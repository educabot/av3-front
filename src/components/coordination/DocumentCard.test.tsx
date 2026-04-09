import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentCard } from './DocumentCard';
import type { CoordinationDocument } from '@/types';

const baseDoc: CoordinationDocument = {
  id: 42,
  organization_id: 1,
  name: 'Itinerario Matematicas 2026',
  area_id: 10,
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
};

describe('DocumentCard', () => {
  it('shows the document name', () => {
    render(<DocumentCard document={baseDoc} onClick={() => {}} />);
    expect(screen.getByText('Itinerario Matematicas 2026')).toBeInTheDocument();
  });

  it('shows the area name and start year', () => {
    render(<DocumentCard document={{ ...baseDoc, name: 'Plan Anual', area_name: 'Lengua' }} onClick={() => {}} />);
    // The subtitle combines area name and start year
    expect(screen.getByText(/Lengua/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('falls back to "Documento #id" when name is empty', () => {
    render(<DocumentCard document={{ ...baseDoc, name: '' }} onClick={() => {}} />);
    expect(screen.getByText('Documento #42')).toBeInTheDocument();
  });

  it('renders the "En progreso" badge for in_progress status', () => {
    render(<DocumentCard document={baseDoc} onClick={() => {}} />);
    expect(screen.getByText('En progreso')).toBeInTheDocument();
  });

  it('renders the "Publicado" badge for published status', () => {
    render(<DocumentCard document={{ ...baseDoc, status: 'published' }} onClick={() => {}} />);
    expect(screen.getByText('Publicado')).toBeInTheDocument();
  });

  it('renders the "Borrador" badge for pending status', () => {
    render(<DocumentCard document={{ ...baseDoc, status: 'pending' }} onClick={() => {}} />);
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<DocumentCard document={baseDoc} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter is pressed', () => {
    const onClick = vi.fn();
    render(<DocumentCard document={baseDoc} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
