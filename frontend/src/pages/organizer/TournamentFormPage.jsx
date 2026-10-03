import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { tournamentsApi } from '../../api/services';
import { Alert, Field, Loading } from '../../components/ui';
import { tournamentSchema } from '../../utils/schemas';
import { SPORTS, dateInputToIso, isoToDateInput } from '../../utils/format';

const EMPTY = {
  name: '', description: '', sport: 'Fútbol', category: '', rules: '',
  format: 'RoundRobin', maxTeams: 8, startDate: '', endDate: '',
};

export default function TournamentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(tournamentSchema), defaultValues: EMPTY });
  const format = useWatch({ control, name: 'format' });

  useEffect(() => {
    if (!isEdit) return;
    tournamentsApi
      .get(id)
      .then((t) =>
        reset({
          name: t.name, description: t.description ?? '', sport: t.sport, category: t.category,
          rules: t.rules ?? '', format: t.format, maxTeams: t.maxTeams,
          startDate: isoToDateInput(t.startDate), endDate: isoToDateInput(t.endDate),
        }),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  const onSubmit = async (d) => {
    setError('');
    const payload = {
      ...d,
      description: d.description || null,
      rules: d.rules || null,
      maxTeams: Number(d.maxTeams),
      startDate: dateInputToIso(d.startDate),
      endDate: dateInputToIso(d.endDate),
    };
    try {
      const saved = isEdit ? await tournamentsApi.update(id, payload) : await tournamentsApi.create(payload);
      navigate(`/organizer/tournaments/${saved.id}`);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <div className="page-header">
        <Link to="/organizer" className="back">← Panel de organizador</Link>
        <h1>{isEdit ? 'Editar torneo' : 'Crear torneo'}</h1>
      </div>

      <form className="card form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Alert>{error}</Alert>

        <Field label="Nombre del torneo *" error={errors.name} htmlFor="name">
          <input id="name" {...register('name')} placeholder="Ej. Copa Verano 2026" />
        </Field>

        <div className="row">
          <Field label="Deporte *" error={errors.sport} htmlFor="sport">
            <select id="sport" {...register('sport')}>
              {SPORTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Categoría *" error={errors.category} htmlFor="category" hint="Ej. Sub-17, Libre, Femenino">
            <input id="category" {...register('category')} />
          </Field>
        </div>

        <div className="row">
          <Field label="Formato *" error={errors.format} htmlFor="format">
            <select id="format" {...register('format')}>
              <option value="RoundRobin">Todos contra todos (liga)</option>
              <option value="Knockout">Eliminación directa</option>
            </select>
          </Field>
          <Field
            label="Máximo de equipos *"
            error={errors.maxTeams}
            htmlFor="maxTeams"
            hint={format === 'Knockout' ? 'Debe ser 2, 4, 8, 16, 32 o 64' : 'Entre 2 y 64'}
          >
            <input id="maxTeams" type="number" min="2" max="64" {...register('maxTeams')} />
          </Field>
        </div>

        <div className="row">
          <Field label="Fecha de inicio *" error={errors.startDate} htmlFor="startDate">
            <input id="startDate" type="date" {...register('startDate')} />
          </Field>
          <Field label="Fecha de fin *" error={errors.endDate} htmlFor="endDate">
            <input id="endDate" type="date" {...register('endDate')} />
          </Field>
        </div>

        <Field label="Descripción" error={errors.description} htmlFor="description">
          <textarea id="description" rows="3" {...register('description')} />
        </Field>
        <Field label="Reglamento" error={errors.rules} htmlFor="rules" hint="Duración, puntuación, sanciones, etc.">
          <textarea id="rules" rows="5" {...register('rules')} />
        </Field>

        <div className="form-actions">
          <Link to="/organizer" className="btn btn--ghost">Cancelar</Link>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear torneo'}
          </button>
        </div>
      </form>
    </>
  );
}
