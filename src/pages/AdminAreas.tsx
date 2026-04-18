import { useState } from 'react';
import { Layers, Plus, Pencil, Trash2, UserPlus, UserMinus, Users } from 'lucide-react';
import { areasApi } from '@/services/api';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useQueryClient } from '@tanstack/react-query';
import { referenceKeys } from '@/hooks/queries/useReferenceQueries';
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
import type { Area } from '@/types';

/**
 * CRUD completo de Areas (RFC §6.10 — admin panel).
 *
 * Areas es la unica entidad con soporte full CRUD en el backend al dia de hoy
 * (list/get/create/update/delete). El resto de entidades de referencia solo
 * tiene list+create, por eso solo exponemos esta pantalla por ahora.
 *
 * Cada mutacion dispara `queryClient.invalidateQueries({ queryKey: referenceKeys.areas })` para refrescar el store global
 * que consumen el Wizard, el home del coordinador y los filtros.
 */

interface AreaFormState {
  name: string;
  description: string;
}

const EMPTY_FORM: AreaFormState = { name: '', description: '' };

export function AdminAreas() {
  const queryClient = useQueryClient();
  const { items, hasMore, loadMore, isLoading, isLoadingMore, error, reload } = usePaginatedList(
    (limit, offset) => areasApi.list({ limit, offset }),
    {},
  );

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [form, setForm] = useState<AreaFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [coordTarget, setCoordTarget] = useState<Area | null>(null);
  const [coordUserId, setCoordUserId] = useState('');
  const [isCoordBusy, setIsCoordBusy] = useState(false);

  const openCreate = () => {
    setEditingArea(null);
    setForm(EMPTY_FORM);
    setDialogMode('create');
  };

  const openEdit = (area: Area) => {
    setEditingArea(area);
    setForm({ name: area.name, description: area.description ?? '' });
    setDialogMode('edit');
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setDialogMode('closed');
    setEditingArea(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const payload = {
      name,
      description: form.description.trim() || undefined,
    };
    setIsSubmitting(true);
    try {
      if (dialogMode === 'edit' && editingArea) {
        await areasApi.update(editingArea.id, payload);
        toastSuccess('Area actualizada');
      } else {
        await areasApi.create(payload);
        toastSuccess('Area creada');
      }
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: referenceKeys.areas })]);
      setDialogMode('closed');
      setEditingArea(null);
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
      await areasApi.delete(deleteTarget.id);
      toastSuccess('Area eliminada');
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: referenceKeys.areas })]);
      setDeleteTarget(null);
    } catch (err) {
      showApiError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const refreshCoordTarget = async () => {
    if (!coordTarget) return;
    await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: referenceKeys.areas })]);
    // Re-fetch the single area to refresh the dialog content
    try {
      const fresh = await areasApi.getById(coordTarget.id);
      setCoordTarget(fresh);
    } catch (err) {
      showApiError(err);
    }
  };

  const handleAddCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordTarget) return;
    const userId = Number(coordUserId);
    if (!userId || isNaN(userId) || userId <= 0) {
      showApiError(new Error('ID de usuario invalido'));
      return;
    }
    setIsCoordBusy(true);
    try {
      await areasApi.addCoordinator(coordTarget.id, userId);
      toastSuccess('Coordinador asignado');
      setCoordUserId('');
      await refreshCoordTarget();
    } catch (err) {
      showApiError(err);
    } finally {
      setIsCoordBusy(false);
    }
  };

  const handleRemoveCoordinator = async (userId: number) => {
    if (!coordTarget) return;
    setIsCoordBusy(true);
    try {
      await areasApi.removeCoordinator(coordTarget.id, userId);
      toastSuccess('Coordinador removido');
      await refreshCoordTarget();
    } catch (err) {
      showApiError(err);
    } finally {
      setIsCoordBusy(false);
    }
  };

  return (
    <div className='max-w-4xl mx-auto px-6 py-8'>
      <div className='flex items-start justify-between mb-6'>
        <div>
          <h1 className='title-2-emphasized text-[#10182B]'>Areas</h1>
          <p className='body-2-regular text-muted-foreground mt-1'>
            Gestiona las areas de conocimiento de tu organizacion.
          </p>
        </div>
        <Button onClick={openCreate} className='gap-2'>
          <Plus className='w-4 h-4' />
          Nueva area
        </Button>
      </div>

      <DataState
        loading={isLoading}
        error={error}
        data={items}
        onRetry={reload}
        emptyState={
          <div className='text-center py-16 activity-card-bg rounded-2xl'>
            <Layers className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
            <h3 className='headline-1-bold text-foreground mb-2'>Aun no hay areas</h3>
            <p className='body-2-regular text-muted-foreground mb-4'>
              Crea la primera area para empezar a organizar el contenido.
            </p>
            <Button onClick={openCreate} className='gap-2'>
              <Plus className='w-4 h-4' />
              Nueva area
            </Button>
          </div>
        }
      >
        <ul className='space-y-3'>
          {items.map((area) => (
            <li key={area.id} className='activity-card-bg rounded-2xl p-4 flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <h3 className='headline-1-bold text-[#10182B] truncate'>{area.name}</h3>
                {area.description && (
                  <p className='body-2-regular text-muted-foreground mt-1 line-clamp-2'>{area.description}</p>
                )}
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCoordTarget(area)}
                  aria-label={`Coordinadores de ${area.name}`}
                  className='gap-1'
                >
                  <Users className='w-4 h-4' />
                  Coordinadores
                  {area.coordinators && area.coordinators.length > 0 && (
                    <span className='ml-1 text-xs bg-primary/10 text-primary rounded px-1.5'>
                      {area.coordinators.length}
                    </span>
                  )}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openEdit(area)}
                  aria-label={`Editar ${area.name}`}
                  className='gap-1'
                >
                  <Pencil className='w-4 h-4' />
                  Editar
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setDeleteTarget(area)}
                  aria-label={`Eliminar ${area.name}`}
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
            <Button variant='outline' onClick={loadMore} disabled={isLoadingMore} aria-label='Cargar mas areas'>
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
            <DialogTitle>{dialogMode === 'edit' ? 'Editar area' : 'Nueva area'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'edit'
                ? 'Actualiza los datos del area. Los cambios se aplican inmediatamente.'
                : 'Completa los datos para crear una nueva area de conocimiento.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='area-name'>Nombre</Label>
              <Input
                id='area-name'
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='Ej: Ciencias Naturales'
                required
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='area-description'>Descripcion (opcional)</Label>
              <Textarea
                id='area-description'
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder='Describe brevemente el alcance del area.'
                rows={3}
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
            <DialogTitle>Eliminar area</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara el area <strong>{deleteTarget?.name}</strong> de tu
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

      {/* Coordinators dialog */}
      <Dialog
        open={coordTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isCoordBusy) {
            setCoordTarget(null);
            setCoordUserId('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coordinadores de {coordTarget?.name}</DialogTitle>
            <DialogDescription>
              Asigna o remueve coordinadores para esta area. Ingresa el ID numerico del usuario.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div>
              <h4 className='body-2-regular font-medium text-[#10182B] mb-2'>Asignados</h4>
              {coordTarget?.coordinators && coordTarget.coordinators.length > 0 ? (
                <ul className='space-y-2'>
                  {coordTarget.coordinators.map((c) => (
                    <li
                      key={c.id}
                      className='activity-card-bg rounded-lg p-3 flex items-center justify-between gap-3'
                    >
                      <div className='min-w-0'>
                        <p className='body-2-regular text-[#10182B] truncate'>
                          {c.user ? `${c.user.first_name} ${c.user.last_name}`.trim() : `Usuario #${c.id}`}
                        </p>
                        {c.user?.email && (
                          <p className='text-xs text-muted-foreground truncate'>{c.user.email}</p>
                        )}
                      </div>
                      {c.user && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleRemoveCoordinator(c.user!.id)}
                          disabled={isCoordBusy}
                          aria-label={`Quitar coordinador ${c.user.first_name}`}
                          className='gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0'
                        >
                          <UserMinus className='w-4 h-4' />
                          Quitar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='body-2-regular text-muted-foreground italic'>Sin coordinadores asignados.</p>
              )}
            </div>

            <form onSubmit={handleAddCoordinator} className='space-y-2 border-t pt-4'>
              <Label htmlFor='coord-user-id'>Asignar nuevo coordinador</Label>
              <div className='flex gap-2'>
                <Input
                  id='coord-user-id'
                  type='number'
                  min='1'
                  value={coordUserId}
                  onChange={(e) => setCoordUserId(e.target.value)}
                  placeholder='ID de usuario'
                  disabled={isCoordBusy}
                />
                <Button type='submit' disabled={isCoordBusy || !coordUserId.trim()} className='gap-1 shrink-0'>
                  <UserPlus className='w-4 h-4' />
                  Asignar
                </Button>
              </div>
              <p className='text-xs text-muted-foreground'>
                El listado visual de usuarios estara disponible cuando el backend exponga{' '}
                <code className='bg-muted px-1 rounded'>GET /users</code>.
              </p>
            </form>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setCoordTarget(null)} disabled={isCoordBusy}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
