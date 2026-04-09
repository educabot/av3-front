import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicTree } from './TopicTree';
import type { Topic } from '@/types';

const TOPICS: Topic[] = [
  {
    id: 1,
    name: 'Ciencias Naturales',
    level: 1,
    parent_id: null,
    children: [
      {
        id: 10,
        name: 'Seres vivos',
        level: 2,
        parent_id: 1,
        children: [
          { id: 100, name: 'Ecosistemas', level: 3, parent_id: 10, children: [] },
          { id: 101, name: 'Biodiversidad', level: 3, parent_id: 10, children: [] },
        ],
      },
    ],
  },
];

const defaultProps = {
  topics: TOPICS,
  maxLevels: 3,
  levelNames: ['Nucleo', 'Area', 'Categoria'],
  selectionLevel: 3,
  selected: [] as number[],
  onSelect: vi.fn(),
};

describe('TopicTree', () => {
  it('renders top-level topics', () => {
    render(<TopicTree {...defaultProps} />);
    expect(screen.getByText('Ciencias Naturales')).toBeInTheDocument();
  });

  it('renders level legend', () => {
    render(<TopicTree {...defaultProps} />);
    expect(screen.getByText('Nucleo')).toBeInTheDocument();
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('Categoria')).toBeInTheDocument();
  });

  it('shows children when parent is expanded (auto-expanded for level 1)', () => {
    render(<TopicTree {...defaultProps} />);
    // Level 1 auto-expanded, so level 2 should be visible
    expect(screen.getByText('Seres vivos')).toBeInTheDocument();
  });

  it('selects a topic at selection level', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    // Need to expand level 2 to see level 3
    render(<TopicTree {...defaultProps} onSelect={onSelect} />);

    // Expand "Seres vivos" to show level 3
    await user.click(screen.getByText('Seres vivos'));

    // Click on "Ecosistemas" (level 3 = selectionLevel)
    await user.click(screen.getByText('Ecosistemas'));
    expect(onSelect).toHaveBeenCalledWith([100]);
  });

  it('deselects a previously selected topic', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<TopicTree {...defaultProps} selected={[100]} onSelect={onSelect} />);

    // Expand to see level 3
    await user.click(screen.getByText('Seres vivos'));

    await user.click(screen.getByText('Ecosistemas'));
    expect(onSelect).toHaveBeenCalledWith([]);
  });

  it('shows empty state when no topics', () => {
    render(<TopicTree {...defaultProps} topics={[]} />);
    expect(screen.getByText('No hay temas disponibles')).toBeInTheDocument();
  });
});
