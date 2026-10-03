import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '../utils/schemas';
import { Alert, Field } from '../components/ui';

const DEMO = [
  { label: 'Organizador', email: 'organizador@torneo.com' },
  { label: 'Jugador', email: 'jugador@torneo.com' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (data) => {
    setError('');
    try {
      const user = await login(data);
      const fallback = user.role === 'Player' ? '/dashboard' : '/organizer';
      navigate(location.state?.from ?? fallback, { replace: true });
    } catch (e) {
      setError(e.message);
    }
  };

  const fillDemo = (email) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Demo1234!', { shouldValidate: true });
  };

  return (
    <div className="auth">
      <form className="card auth__card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <h1>Iniciar sesión</h1>
        <Alert>{error}</Alert>

        <Field label="Correo electrónico" error={errors.email} htmlFor="email">
          <input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password} htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" {...register('password')} />
        </Field>

        <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p className="muted center">
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>

        <div className="demo">
          <span className="muted small">Cuentas de prueba (contraseña Demo1234!):</span>
          <div className="demo__buttons">
            {DEMO.map((d) => (
              <button key={d.email} type="button" className="btn btn--ghost btn--sm" onClick={() => fillDemo(d.email)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
