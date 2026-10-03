import { z } from 'zod';

const optionalText = (max) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`).optional().or(z.literal(''));

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingrese un correo válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Mínimo 3 caracteres.').max(100, 'Máximo 100 caracteres.'),
    email: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingrese un correo válido.'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres.')
      .max(64, 'Máximo 64 caracteres.')
      .regex(/[a-z]/, 'Debe incluir una minúscula.')
      .regex(/[A-Z]/, 'Debe incluir una mayúscula.')
      .regex(/\d/, 'Debe incluir un número.'),
    confirmPassword: z.string(),
    role: z.enum(['Player', 'Organizer']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;

export const tournamentSchema = z
  .object({
    name: z.string().trim().min(3, 'Mínimo 3 caracteres.').max(120, 'Máximo 120 caracteres.'),
    description: optionalText(1000),
    sport: z.string().trim().min(1, 'Seleccione un deporte.').max(50),
    category: z.string().trim().min(1, 'La categoría es obligatoria.').max(50, 'Máximo 50 caracteres.'),
    rules: optionalText(2000),
    format: z.enum(['RoundRobin', 'Knockout']),
    maxTeams: z.coerce
      .number({ message: 'Ingrese un número.' })
      .int('Debe ser entero.')
      .min(2, 'Mínimo 2 equipos.')
      .max(64, 'Máximo 64 equipos.'),
    startDate: z.string().min(1, 'La fecha de inicio es obligatoria.'),
    endDate: z.string().min(1, 'La fecha de fin es obligatoria.'),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: 'La fecha de fin debe ser posterior a la de inicio.',
    path: ['endDate'],
  })
  .refine((d) => d.format !== 'Knockout' || isPowerOfTwo(d.maxTeams), {
    message: 'En eliminación directa use 2, 4, 8, 16, 32 o 64 equipos.',
    path: ['maxTeams'],
  });

export const teamSchema = z.object({
  name: z.string().trim().min(3, 'Mínimo 3 caracteres.').max(100, 'Máximo 100 caracteres.'),
  city: optionalText(80),
  logoUrl: z.string().trim().url('Ingrese una URL válida (https://...).').max(300).optional().or(z.literal('')),
});

export const playerSchema = z.object({
  fullName: z.string().trim().min(3, 'Mínimo 3 caracteres.').max(100, 'Máximo 100 caracteres.'),
  jerseyNumber: z
    .union([z.literal(''), z.coerce.number().int('Debe ser entero.').min(0, 'Entre 0 y 99.').max(99, 'Entre 0 y 99.')])
    .optional(),
  position: optionalText(40),
  birthDate: z
    .string()
    .optional()
    .refine((v) => !v || new Date(v) <= new Date(), 'La fecha no puede ser futura.'),
});

export const matchSchema = z
  .object({
    homeTeamId: z.coerce.number().int().min(1, 'Seleccione el equipo local.'),
    awayTeamId: z.coerce.number().int().min(1, 'Seleccione el equipo visitante.'),
    scheduledAt: z.string().min(1, 'La fecha y hora son obligatorias.'),
    round: z.coerce.number().int('Debe ser entero.').min(1, 'Mínimo 1.').max(100, 'Máximo 100.'),
    venue: optionalText(120),
  })
  .refine((d) => d.homeTeamId !== d.awayTeamId, {
    message: 'Un equipo no puede jugar contra sí mismo.',
    path: ['awayTeamId'],
  });

export const fixtureSchema = z.object({
  firstRoundDate: z.string().optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida.').optional().or(z.literal('')),
  daysBetweenRounds: z.coerce.number().int('Debe ser entero.').min(1, 'Mínimo 1 día.').max(60, 'Máximo 60 días.'),
  venue: optionalText(120),
});

export const resultSchema = z.object({
  homeScore: z.coerce.number({ message: 'Requerido.' }).int().min(0, 'Mínimo 0.').max(999, 'Máximo 999.'),
  awayScore: z.coerce.number({ message: 'Requerido.' }).int().min(0, 'Mínimo 0.').max(999, 'Máximo 999.'),
});
