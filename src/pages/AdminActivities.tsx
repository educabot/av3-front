import { useState } from 'react';
import { ListChecks, Plus, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { activitiesApi } from '@/services/api';
import { useActivitiesByMomentQuery, referenceKeys } from '@/hooks/queries/useReferenceQueries';
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
import type { Activity, MomentKey } from '@/types';

interface ActivityFormState {
  name: string;
  description: string;
  moment: MomentKey;
  duration_minutes: string;
}

const EMPTY_FORM: ActivityFormState = { name: '', description: '', moment: 'apertura', duration_minutes: '' };

const MOMENT_LABEL: Record<MomentKey, string> = {
  apertura: 'Apertura',
  desarrollo: 'Desarrollo',
  cierre: 'Cierre',
};

export function AdminActivities() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useActivitiesByMomentQuery();

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState<ActivityFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = (moment?: MomentKey) => {
    setEditingActivity(null);
    setForm({ ...EMPTY_FORM, moment: moment ?? 'apertura' });
    setDialogMode('create');
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setForm({
      name: activity.name,
      description: activity.description ?? '',
      moment: activity.moment,
      duration_minutes: activity.duration_minutes ? String(activity.duration_minutes) : '',
    });
    setDialogMode('edit');
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setDialogMode('closed');
    setEditingActivity(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const duration = form.duration_minutes ? Number(form.duration_minutes) : undefined;
    if (duration !== undefined && (isNaN(duration) || duration <= 0)) {
      showApiError(new Error('Duracion invalida'));
      return;
    }
    setIsSubmitting(true);
    try {
      if (dialogMode === 'edit' && editingActivity) {
        await activitiesApi.update(editingActivity.id, {
          name,
          description: form.description.trim() || undefined,
          moment: form.moment,
          duration_minutes: duration,
        });
        toastSuccess('Actividad actualizada');
      } else {
        await activitiesApi.create({
          moment: form.moment,
          name,
          description: form.description.trim() || undefined,
          duration_minutes: duration,
        });
        toastSuccess('Actividad creada');
      }
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: referenceKeys.activitiesByMoment })]);
      setDialogMode('closed');
      setEditingActivity(null);
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
      await activitiesApi.delete(deleteTarget.id);
      toastSuccess('Actividad eliminada');
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: referenceKeys.activitiesByMoment })]);
      setDeleteTarget(null);
    } catch (err) {
      showApiError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const moments: MomentKey[] = ['apertura', 'desarrollo', 'cierre'];

  return (
    <div className='max-w-4xl mx-auto px-6 py-8'>
      <div className='flex items-start justify-between mb-6'>
        <div>
          <h1 className='title-2-emphasized text-[#10182B]'>Actividades didacticas</h1>
          <p className='body-2-regular text-muted-foreground mt-1'>Biblioteca de actividades por momento de clase.</p>
        </div>
        <Button onClick={() => openCreate()} className='gap-2'>
          <Plus className='w-4 h-4' />
          Nueva actividad
        </Button>
      </div>

      <DataState loading={isLoading} error={error} data={data ? [data] : []} onRetry={refetch} emptyState={null}>
        <div className='space-y-6'>
          {moments.map((moment) => {
            const items = (data?.[moment] ?? []) as Activity[];
            return (
              <section key={moment}>
                <div className='flex items-center justify-between mb-3'>
                  <h2 className='headline-1-bold text-[#10182B]'>
                    {MOMENT_LABEL[moment]} <span className='text-muted-foreground'>({items.length})</span>
                  </h2>
                  <Button size='sm' variant='outline' onClick={() => openCreate(moment)} className='gap-1'>
                    <Plus className='w-3.5 h-3.5' />
                    Agregar a {MOMENT_LABEL[moment].toLowerCase()}
                  </Button>
                </div>
                {items.length === 0 ? (
                  <div className='activity-card-bg rounded-xl p-6 text-center'>
                    <p className='body-2-regular text-muted-foreground'>
                      Aun no hay actividades de {MOMENT_LABEL[moment].toLowerCase()}.
                    </p>
                  </div>
                ) : (
                  <ul className='space-y-2'>
                    {items.map((activity) => (
                      <li
                        key={activity.id}
                        className='activity-card-bg rounded-xl p-3 flex items-start justify-between gap-4'
                      >
                        <div className='min-w-0'>
                          <div className='flex items-center gap-2'>
                            <ListChecks className='w-4 h-4 text-primary shrink-0' />
                            <h3 className='body-2-regular font-medium text-[#10182B] truncate'>{activity.name}</h3>
                            {activity.duration_minutes !== undefined && activity.duration_minutes > 0 && (
                              <span className='text-xs text-muted-foreground shrink-0'>
                                {activity.duration_minutes} min
                              </span>
                            )}
                          </div>
                          {activity.description && (
                            <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>{activity.description}</p>
                          )}
                        </div>
                        <div className='flex items-center gap-1 shrink-0'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => openEdit(activity)}
                            aria-label={`Editar ${activity.name}`}
                          >
                            <Pencil className='w-3.5 h-3.5' />
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setDeleteTarget(activity)}
                            aria-label={`Eliminar ${activity.name}`}
                            className='text-red-600 hover:text-red-700 hover:bg-red-50'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
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
            <DialogTitle>{dialogMode === 'edit' ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'edit'
                ? 'Actualiza los datos de la actividad. Los cambios se aplican inmediatamente.'
                : 'Crea una actividad didactica asociada a un momento de clase.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='activity-moment'>Momento</Label>
              <Select value={form.moment} onValueChange={(v) => setForm((f) => ({ ...f, moment: v as MomentKey }))}>
                <SelectTrigger id='activity-moment'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {moments.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MOMENT_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='activity-name'>Nombre</Label>
              <Input
                id='activity-name'
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='Ej: Lluvia de ideas'
                required
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='activity-description'>Descripcion (opcional)</Label>
              <Textarea
                id='activity-description'
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='activity-duration'>Duracion en minutos (opcional)</Label>
              <Input
                id='activity-duration'
                type='number'
                min='1'
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                placeholder='Ej: 15'
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={closeDialog} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type='submit' disabled={isSubmitting || !form.name.trim()}>
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
            <DialogTitle>Eliminar actividad</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara la actividad <strong>{deleteTarget?.name}</strong>.
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
