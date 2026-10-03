import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerSchema } from '../utils/schemas';
import { Alert, Field } from '../components/ui';

export default function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', role: 'Player' },
  });

  const onSubmit = async ({ confirmPassword: _ignored, ...data }) => {
    setError('');
    try {
      const user = await signUp(data);
      navigate(user.role === 'Organizer' ? '/organizer' : '/dashboard', { replace: true });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="auth">
      <form className="card auth__card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <h1>Crear cuenta</h1>
        <Alert>{error}</Alert>

        <Field label="Nombre completo" error={errors.fullName} htmlFor="fullName">
          <input id="fullName" autoComplete="name" {...register('fullName')} />
        </Field>
        <Field label="Correo electrónico" error={errors.email} htmlFor="email">
          <input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <div className="row">
          <Field label="Contraseña" error={errors.password} htmlFor="password" hint="Mín. 8, con mayúscula, minúscula y número">
            <input id="password" type="password" autoComplete="new-password" {...register('password')} />
          </Field>
          <Field label="Confirmar contraseña" error={errors.confirmPassword} htmlFor="confirmPassword">
            <input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </Field>
        </div>

        <Field label="Tipo de cuenta" error={errors.role}>
          <div className="radio-group">
            <label className="radio-card">
              <input type="radio" value="Player" {...register('role')} />
              <span>
                <strong>Jugador / Capitán</strong>
                <small>Gestiona equipos e inscríbete en torneos</small>
              </span>
            </label>
            <label className="radio-card">
              <input type="radio" value="Organizer" {...register('role')} />
              <span>
                <strong>Organizador</strong>
                <small>Crea torneos, aprueba inscripciones y registra resultados</small>
              </span>
            </label>
          </div>
        </Field>

        <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
        <p className="muted center">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
