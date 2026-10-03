import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { teamSchema } from '../utils/schemas';
import { Alert, Field } from './ui';

export default function TeamForm({ initial, onSubmit, onCancel, submitLabel = 'Guardar' }) {
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: initial?.name ?? '', city: initial?.city ?? '', logoUrl: initial?.logoUrl ?? '' },
  });

  const submit = async (data) => {
    setError('');
    try {
      await onSubmit({ name: data.name, city: data.city || null, logoUrl: data.logoUrl || null });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Alert>{error}</Alert>
      <Field label="Nombre del equipo *" error={errors.name} htmlFor="team-name">
        <input id="team-name" {...register('name')} />
      </Field>
      <Field label="Ciudad" error={errors.city} htmlFor="team-city">
        <input id="team-city" {...register('city')} />
      </Field>
      <Field label="URL del logo" error={errors.logoUrl} htmlFor="team-logo" hint="Opcional, ej. https://...">
        <input id="team-logo" type="url" {...register('logoUrl')} />
      </Field>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
