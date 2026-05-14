import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublishValidation, validateDocumentForPublish, canPublishDocument } from './PublishValidation';
import type { CoordinationDocument, SectionConfig } from '@/types';

const sectionConfigs: SectionConfig[] = [
  { key: 'resumen', label: 'Resumen', type: 'text', ai_prompt: '', required: true },
  { key: 'opcional', label: 'Opcional', type: 'text', ai_prompt: '', required: false },
];

function makeDoc(overrides: Partial<CoordinationDocument> = {}): CoordinationDocument {
  return {
    id: 1,
    name: 'Doc',
    area_id: 10,
    area: { id: 10, name: 'Matematicas' },
    start_date: '2026-03-01',
    end_date: '2026-07-01',
    status: 'in_progress',
    sections: { resumen: { value: 'algo' } },
    topics: [],
    subjects: [
      {
        id: 1,
        subject_id: 1,
        subject_name: 'Algebra',
        class_count: 1,
        observations: '',
        topics: [],
        classes: [
          {
            id: 1,
            class_number: 1,
            title: 'Intro',
            objective: 'Conocer ecuaciones',
            topic_ids: [],
          },
        ],
      },
    ],
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('validateDocumentForPublish', () => {
  it('returns no issues for a fully valid document', () => {
    expect(validateDocumentForPublish(makeDoc(), sectionConfigs)).toEqual([]);
  });

  it('reports missing required sections', () => {
    const doc = makeDoc({ sections: {} });
    const issues = validateDocumentForPublish(doc, sectionConfigs);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe('missing_section');
    expect(issues[0].message).toContain('Resumen');
  });

  it('does not report optional sections as missing', () => {
    const doc = makeDoc({ sections: { resumen: { value: 'ok' } } });
    expect(validateDocumentForPublish(doc, sectionConfigs)).toEqual([]);
  });

  it('reports subjects without classes', () => {
    const doc = makeDoc({
      subjects: [
        {
          id: 1,
          subject_id: 1,
          subject_name: 'Algebra',
          class_count: 0,
          observations: '',
          topics: [],
          classes: [],
        },
      ],
    });
    const issues = validateDocumentForPublish(doc, sectionConfigs);
    expect(issues.some((i) => i.kind === 'subject_without_classes')).toBe(true);
  });

  it('reports classes missing title or objective', () => {
    const doc = makeDoc({
      subjects: [
        {
          id: 1,
          subject_id: 1,
          subject_name: 'Algebra',
          class_count: 1,
          observations: '',
          topics: [],
          classes: [
            {
              id: 1,
              class_number: 1,
              title: '',
              objective: 'Conocer',
              topic_ids: [],
            },
          ],
        },
      ],
    });
    const issues = validateDocumentForPublish(doc, sectionConfigs);
    expect(issues.some((i) => i.kind === 'class_missing_content')).toBe(true);
  });

  it('treats sections containing only whitespace as missing', () => {
    const doc = makeDoc({ sections: { resumen: { value: '   ' } } });
    expect(validateDocumentForPublish(doc, sectionConfigs)).toHaveLength(1);
  });
});

describe('canPublishDocument', () => {
  it('returns true for a valid document', () => {
    expect(canPublishDocument(makeDoc(), sectionConfigs)).toBe(true);
  });

  it('returns false when any issue is present', () => {
    expect(canPublishDocument(makeDoc({ sections: {} }), sectionConfigs)).toBe(false);
  });
});

describe('<PublishValidation />', () => {
  it('shows success message when document is valid', () => {
    render(<PublishValidation document={makeDoc()} sectionConfigs={sectionConfigs} />);
    expect(screen.getByRole('status')).toHaveTextContent(/listo para publicar/i);
  });

  it('lists every issue when document is invalid', () => {
    const doc = makeDoc({
      sections: {},
      subjects: [
        {
          id: 1,
          subject_id: 1,
          subject_name: 'Algebra',
          class_count: 0,
          observations: '',
          topics: [],
          classes: [],
        },
      ],
    });
    render(<PublishValidation document={doc} sectionConfigs={sectionConfigs} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/Resumen/);
    expect(alert).toHaveTextContent(/Algebra/);
  });
});
