import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PublishedDocumentsCard } from './PublishedDocumentsCard';
import type { CoordinationDocument } from '@/types';

const makeDoc = (overrides: Partial<CoordinationDocument>): CoordinationDocument => ({
  id: 1,
  organization_id: 1,
  name: 'Itinerario Matematicas',
  area_id: 10,
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
  ...overrides,
});

describe('PublishedDocumentsCard', () => {
  it('counts only published documents', () => {
    const docs = [
      makeDoc({ id: 1, status: 'published' }),
      makeDoc({ id: 2, status: 'in_progress' }),
      makeDoc({ id: 3, status: 'pending' }),
    ];
    render(<PublishedDocumentsCard documents={docs} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('lists each published document with name and area', () => {
    const docs = [
      makeDoc({ id: 1, name: 'Itinerario Lengua', area_name: 'Lengua' }),
      makeDoc({ id: 2, name: 'Itinerario Matematicas', area_name: 'Matematicas' }),
    ];
    render(<PublishedDocumentsCard documents={docs} />);
    expect(screen.getByText('Itinerario Lengua')).toBeInTheDocument();
    expect(screen.getByText('Itinerario Matematicas')).toBeInTheDocument();
    expect(screen.getByText('Lengua')).toBeInTheDocument();
  });

  it('shows empty state when there are no published docs', () => {
    render(<PublishedDocumentsCard documents={[makeDoc({ status: 'in_progress' })]} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/Aun no publicaste/)).toBeInTheDocument();
  });

  it('respects maxItems and shows the remaining count', () => {
    const docs = [
      makeDoc({ id: 1, name: 'A' }),
      makeDoc({ id: 2, name: 'B' }),
      makeDoc({ id: 3, name: 'C' }),
      makeDoc({ id: 4, name: 'D' }),
    ];
    render(<PublishedDocumentsCard documents={docs} maxItems={2} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
    expect(screen.getByText('+2 mas')).toBeInTheDocument();
  });

  it('falls back to "Documento #id" when name is empty', () => {
    render(<PublishedDocumentsCard documents={[makeDoc({ id: 42, name: '' })]} />);
    expect(screen.getByText('Documento #42')).toBeInTheDocument();
  });

  it('calls onViewDocument when a row is clicked', () => {
    const onViewDocument = vi.fn();
    const docs = [makeDoc({ id: 1, name: 'Itinerario Lengua' })];
    render(<PublishedDocumentsCard documents={docs} onViewDocument={onViewDocument} />);
    fireEvent.click(screen.getByText('Itinerario Lengua').closest('button') as HTMLButtonElement);
    expect(onViewDocument).toHaveBeenCalledWith(docs[0]);
  });
});
