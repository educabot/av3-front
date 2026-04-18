import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseOverview } from './CourseOverview';
import type { Course } from '@/types';

const baseCourse: Course = {
  id: 1,
  name: '6to A',
};

describe('CourseOverview', () => {
  it('shows the course name and the school year when provided', () => {
    render(<CourseOverview course={baseCourse} schoolYear={2026} onClick={() => {}} />);
    expect(screen.getByText('6to A')).toBeInTheDocument();
    expect(screen.getByText('Ciclo 2026')).toBeInTheDocument();
  });

  it('omits the school year line when schoolYear is not provided', () => {
    render(<CourseOverview course={baseCourse} onClick={() => {}} />);
    expect(screen.queryByText(/Ciclo/)).not.toBeInTheDocument();
  });

  it('does not render subject count when omitted', () => {
    render(<CourseOverview course={baseCourse} onClick={() => {}} />);
    expect(screen.queryByText(/materia/)).not.toBeInTheDocument();
  });

  it('renders pluralised subject count when more than one', () => {
    render(<CourseOverview course={baseCourse} subjectCount={3} onClick={() => {}} />);
    expect(screen.getByText('3 materias')).toBeInTheDocument();
  });

  it('renders singular subject count when exactly one', () => {
    render(<CourseOverview course={baseCourse} subjectCount={1} onClick={() => {}} />);
    expect(screen.getByText('1 materia')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<CourseOverview course={baseCourse} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter is pressed', () => {
    const onClick = vi.fn();
    render(<CourseOverview course={baseCourse} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when space is pressed', () => {
    const onClick = vi.fn();
    render(<CourseOverview course={baseCourse} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
