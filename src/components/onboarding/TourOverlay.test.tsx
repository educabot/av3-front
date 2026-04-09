import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TourOverlay } from './TourOverlay';
import type { TourStep } from '@/types';

const STEPS: TourStep[] = [
  { target: '.nav', title: 'Navegacion', description: 'Desde aqui accedes a todo.' },
  { target: '.dashboard', title: 'Dashboard', description: 'Tu panel principal.' },
  { target: '.resources', title: 'Recursos', description: 'Materiales educativos.' },
];

describe('TourOverlay', () => {
  it('renders current step title and description', () => {
    render(<TourOverlay steps={STEPS} currentStep={0} onNext={vi.fn()} onSkip={vi.fn()} />);

    expect(screen.getByText('Navegacion')).toBeInTheDocument();
    expect(screen.getByText('Desde aqui accedes a todo.')).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
  });

  it('shows "Siguiente" button for non-last steps', () => {
    render(<TourOverlay steps={STEPS} currentStep={0} onNext={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Siguiente')).toBeInTheDocument();
  });

  it('shows "Finalizar" button for last step', () => {
    render(<TourOverlay steps={STEPS} currentStep={2} onNext={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Finalizar')).toBeInTheDocument();
  });

  it('calls onNext when clicking next button', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    render(<TourOverlay steps={STEPS} currentStep={0} onNext={onNext} onSkip={vi.fn()} />);

    await user.click(screen.getByText('Siguiente'));
    expect(onNext).toHaveBeenCalled();
  });

  it('calls onSkip when clicking skip', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();

    render(<TourOverlay steps={STEPS} currentStep={1} onNext={vi.fn()} onSkip={onSkip} />);

    await user.click(screen.getByText('Omitir tour'));
    expect(onSkip).toHaveBeenCalled();
  });

  it('renders nothing when steps are empty', () => {
    const { container } = render(<TourOverlay steps={[]} currentStep={0} onNext={vi.fn()} onSkip={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
