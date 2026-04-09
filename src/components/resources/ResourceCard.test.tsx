import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceCard } from './ResourceCard';
import type { Resource } from '@/types';

const RESOURCE: Resource = {
  id: 1,
  resource_type_id: 1,
  resource_type_name: 'Guia de lectura',
  title: 'Guia - Ecosistemas',
  content: {},
  user_id: 2,
  status: 'active',
  created_at: '2026-03-01',
  updated_at: '2026-03-15',
};

describe('ResourceCard', () => {
  it('renders title and type name', () => {
    render(<ResourceCard resource={RESOURCE} onClick={vi.fn()} />);

    expect(screen.getByText('Guia - Ecosistemas')).toBeInTheDocument();
    expect(screen.getByText('Guia de lectura')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<ResourceCard resource={RESOURCE} onClick={vi.fn()} />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows draft status', () => {
    const draft = { ...RESOURCE, status: 'draft' as const };
    render(<ResourceCard resource={draft} onClick={vi.fn()} />);
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<ResourceCard resource={RESOURCE} onClick={onClick} />);
    await user.click(screen.getByText('Guia - Ecosistemas'));

    expect(onClick).toHaveBeenCalled();
  });

  it('shows formatted date', () => {
    render(<ResourceCard resource={RESOURCE} onClick={vi.fn()} />);
    // Date is rendered with toLocaleDateString — format may vary by env
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});
