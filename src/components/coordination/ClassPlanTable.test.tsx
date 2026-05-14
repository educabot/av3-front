import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassPlanTable } from './ClassPlanTable';
import type { DocumentSubject } from '@/types';

const SUBJECTS: DocumentSubject[] = [
  {
    id: 1,
    subject_id: 1,
    subject_name: 'Biologia',
    class_count: 2,
    observations: '',
    topics: [{ id: 10, topic_id: 100, name: 'Ecosistemas' }],
    classes: [
      {
        id: 1,
        class_number: 1,
        title: 'Ecosistemas',
        objective: 'Comprender ecosistemas',
        topic_ids: [],
      },
      {
        id: 2,
        class_number: 2,
        title: 'Cadenas troficas',
        objective: 'Analizar cadenas',
        topic_ids: [100],
      },
    ],
  },
  {
    id: 2,
    subject_id: 2,
    subject_name: 'Fisica',
    class_count: 1,
    observations: '',
    topics: [],
    classes: [],
  },
];

describe('ClassPlanTable', () => {
  it('renders subject names', () => {
    render(<ClassPlanTable subjects={SUBJECTS} />);
    expect(screen.getByText('Biologia')).toBeInTheDocument();
    expect(screen.getByText('Fisica')).toBeInTheDocument();
  });

  it('renders class titles and objectives', () => {
    render(<ClassPlanTable subjects={SUBJECTS} />);
    expect(screen.getAllByText('Ecosistemas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Comprender ecosistemas')).toBeInTheDocument();
    expect(screen.getByText('Cadenas troficas')).toBeInTheDocument();
  });

  it('shows topic badges on classes that reference subject topics', () => {
    render(<ClassPlanTable subjects={SUBJECTS} />);
    const ecosistemaElements = screen.getAllByText('Ecosistemas');
    expect(ecosistemaElements.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state for subjects without classes', () => {
    render(<ClassPlanTable subjects={SUBJECTS} />);
    expect(screen.getByText('Sin clases planificadas')).toBeInTheDocument();
  });

  it('shows empty state when no subjects', () => {
    render(<ClassPlanTable subjects={[]} />);
    expect(screen.getByText('No hay disciplinas asignadas')).toBeInTheDocument();
  });

  it('shows class count per subject', () => {
    render(<ClassPlanTable subjects={SUBJECTS} />);
    expect(screen.getByText('(2 clases)')).toBeInTheDocument();
    expect(screen.getByText('(0 clases)')).toBeInTheDocument();
  });
});
