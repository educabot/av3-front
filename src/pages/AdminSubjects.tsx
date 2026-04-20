import { useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { subjectsApi } from '@/services/api';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useAreasQuery, referenceKeys } from '@/hooks/queries/useReferenceQueries';
import { showApiError, toastSuccess } from '@/lib/toast';
import { DataState } from '@/components/DataState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Subject } from '@/types';

interface SubjectFormState {
  name: string;
  description: string;
  area_id: string;
}

const EMPTY_FORM: SubjectFormState = { name: '', description: '', area_id: '' };

export function AdminSubjects() {
  const queryClient = useQueryClient();
  const { data: areas = [] } = useAreasQuery();
  const { items, hasMore, loadMore, isLoading, isLoadingMore, error, reload } = usePaginatedList(
    (limit, offset) => subjectsApi.list({ limit, offset }),
    {},
  );

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const areaNameById = new Map(areas.map((a) => [a.id, a.name]));

  const openCreate = () => {
    setEditingSubject(null);
    setForm(EMPTY_FORM);
    setDialogMode('create');
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      description: subject.description ?? '',
      area_id: String(subject.area_id),
    });
    setDialogMode('edit');
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setDialogMode('closed');
    setEditingSubject(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const areaId = Number(form.area_id);
    if (!name || !areaId) return;
    const payload = {
      name,
      area_id: areaId,
      description: form.description.trim() || undefined,
    };
    setIsSubmitting(true);
    try {
      if (dialogMode === 'edit' && editingSubject) {
        await subjectsApi.update(editingSubject.id, payload);
        toastSuccess('Asignatura actualizada');
      } else {
        await subjectsApi.create(payload);
        toastSuccess('Asignatura creada');
      }
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: referenceKeys.subjects })]);
      setDialogMode('closed');
      setEditingSubject(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      showApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await subjectsApi.delete(deleteTarget.id);
      toastSuccess('Asignatura eliminada');
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: referenceKeys.subjects })]);
      setDeleteTarget(null);
    } catch (err) {
      showApiError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='max-w-4xl mx-auto px-6 py-8'>
      <div className='flex items-start justify-between mb-6'>
        <div>
          <h1 className='title-2-emphasized text-[#10182B]'>Asignaturas</h1>
          <p className='body-2-regular text-muted-foreground mt-1'>Gestiona las asignaturas de tu organizacion.</p>
        </div>
        <Button onClick={openCreate} className='gap-2' disabled={areas.length === 0}>
          <Plus className='w-4 h-4' />
          Nueva asignatura
        </Button>
      </div>

      {areas.length === 0 && (
        <div className='mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg body-2-regular text-amber-900'>
          Creá primero al menos un área antes de agregar asignaturas.
        </div>
      )}

      <DataState
        loading={isLoading}
        error={error}
        data={items}
        onRetry={reload}
        emptyState={
          <div className='text-center py-16 activity-card-bg rounded-2xl'>
            <BookOpen className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='headline-1-bold text-foreground mb-2'>Aun no hay asignaturas</h3>
            <p className='body-2-regular text-muted-foreground mb-4'>Crea la primera asignatura.</p>
            <Button onClick={openCreate} className='gap-2' disabled={areas.length === 0}>
              <Plus className='w-4 h-4' />
              Nueva asignatura
            </Button>
          </div>
        }
      >
        <ul className='space-y-3'>
          {items.map((subject) => (
            <li key={subject.id} className='activity-card-bg rounded-2xl p-4 flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <h3 className='headline-1-bold text-[#10182B] truncate'>{subject.name}</h3>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  Area: {areaNameById.get(subject.area_id) ?? `#${subject.area_id}`}
                </p>
                {subject.description && (
                  <p className='body-2-regular text-muted-foreground mt-1 line-clamp-2'>{subject.description}</p>
                )}
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openEdit(subject)}
                  aria-label={`Editar ${subject.name}`}
                  className='gap-1'
                >
                  <Pencil className='w-4 h-4' />
                  Editar
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setDeleteTarget(subject)}
                  aria-label={`Eliminar ${subject.name}`}
                  className='gap-1 text-red-600 hover:text-red-700 hover:bg-red-50'
                >
                  <Trash2 className='w-4 h-4' />
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {hasMore && (
          <div className='flex justify-center mt-6'>
            <Button variant='outline' onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Cargando...' : 'Cargar mas'}
            </Button>
          </div>
        )}
      </DataState>

      {/* Create/Edit dialog */}
      <Dialog
        open={dialogMode !== 'closed'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'edit' ? 'Editar asignatura' : 'Nueva asignatura'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'edit'
                ? 'Actualiza los datos de la asignatura. Los cambios se aplican inmediatamente.'
                : 'Completa los datos para crear una nueva asignatura.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='subject-area'>Area</Label>
              <Select value={form.area_id} onValueChange={(v) => setForm((f) => ({ ...f, area_id: v }))}>
                <SelectTrigger id='subject-area'>
                  <SelectValue placeholder='Selecciona un area' />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='subject-name'>Nombre</Label>
              <Input
                id='subject-name'
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='Ej: Matematicas'
                required
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='subject-description'>Descripcion (opcional)</Label>
              <Textarea
                id='subject-description'
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={closeDialog} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type='submit' disabled={isSubmitting || !form.name.trim() || !form.area_id}>
                {isSubmitting ? 'Guardando...' : dialogMode === 'edit' ? 'Guardar cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar asignatura</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara la asignatura <strong>{deleteTarget?.name}</strong> de tu
              organizacion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button
              type='button'
              onClick={handleDelete}
              disabled={isDeleting}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
