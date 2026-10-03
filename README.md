# TorneoPro: aplicación de torneos deportivos en línea

Plataforma web para organizar, gestionar y participar en torneos deportivos: inscripción de equipos y jugadores, generación automática de fixtures, calendario, resultados, tabla de posiciones, estadísticas y reportes.

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite, React Router, React Hook Form + Zod (validaciones) |
| Backend | .NET 10 (ASP.NET Core Web API), EF Core, JWT + roles |
| Base de datos | SQLite en local · PostgreSQL en producción (Railway) |
| Pruebas | xUnit: pruebas unitarias + integración (WebApplicationFactory) |
| Contenedor | `backend/Dockerfile` |

## Estructura

```
backend/
  TorneoApi/          API REST (Controllers, Models, Dtos, Services, Data)
  TorneoApi.Tests/    Pruebas unitarias (Unit/) y de integración (Integration/)
  Dockerfile
frontend/             SPA React (src/pages, src/components, src/api)
```

## Ejecutar en local (VS Code)

Requisitos: .NET SDK 10 y Node.js 20+.

**Opción rápida:** `Ctrl+Shift+B` ejecuta la tarea **"Levantar todo"** (backend y frontend).

**Manual:**

```bash
# Backend  ->  http://localhost:5269  (Swagger en /swagger)
cd backend/TorneoApi
dotnet run --launch-profile http

# Frontend ->  http://localhost:5173
cd frontend
npm install
npm run dev

# Pruebas
cd backend
dotnet test
```

La base SQLite (`backend/TorneoApi/torneo.db`) se crea sola con datos de demostración. Para reiniciarla, borra ese archivo.

### Cuentas de prueba (contraseña `Demo1234!`)

| Rol | Correo |
|-----|--------|
| Organizador | organizador@torneo.com |
| Jugador / Capitán | jugador@torneo.com |
| Administrador | admin@torneo.com |

## Roles

- **Player (jugador/capitán):** crea equipos, gestiona jugadores, inscribe equipos en torneos y ve su panel (próximos partidos, inscripciones, resultados).
- **Organizer:** todo lo anterior, más crear y editar torneos, aprobar o rechazar inscripciones, generar el fixture, programar partidos, registrar resultados y ver reportes.
- **Admin:** puede gestionar cualquier torneo o equipo.

## Endpoints principales

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` · `/auth/login` | Registro / login (devuelve JWT) | — |
| GET | `/auth/me` | Usuario actual | JWT |
| POST | `/tournaments` | Crear torneo | Organizer |
| GET | `/tournaments` | Listar torneos (`status`, `sport`, `search`, `organizerId`) | — |
| GET | `/tournaments/{id}` | Detalle de torneo | — |
| PUT / DELETE | `/tournaments/{id}` | Editar / eliminar | Organizer |
| PATCH | `/tournaments/{id}/status` | Cambiar estado | Organizer |
| POST | `/tournaments/{id}/registrations` | Inscribir equipo | JWT |
| PUT | `/tournaments/{id}/registrations/{regId}` | Aprobar / rechazar | Organizer |
| POST | `/tournaments/{id}/fixture` | Generar fixture automático | Organizer |
| POST | `/tournaments/{id}/fixture/next-round` | Siguiente ronda (eliminación) | Organizer |
| GET | `/tournaments/{id}/standings` | Tabla de posiciones | — |
| GET | `/tournaments/{id}/report` | Reporte del organizador | Organizer |
| POST | `/teams` | Registrar equipo | JWT |
| GET | `/teams?userId={id}` | Equipos de un usuario | — |
| GET | `/teams/registrations` | Inscripciones de mis equipos | JWT |
| POST/PUT/DELETE | `/teams/{id}/players[/{playerId}]` | Gestionar jugadores | Dueño |
| POST | `/matches` | Programar partido | Organizer |
| GET | `/matches?tournamentId={id}` | Partidos (también `teamId`, `userId`, `from`, `to`) | — |
| PUT | `/matches/{id}/result` | Registrar resultado | Organizer |
| PUT / PATCH / DELETE | `/matches/{id}` · `/matches/{id}/cancel` | Reprogramar / cancelar / eliminar | Organizer |

La documentación interactiva completa está en `http://localhost:5269/swagger`.

## Variables de entorno (producción)

| Backend | Descripción |
|---------|-------------|
| `DATABASE_URL` | URL de PostgreSQL (Railway la inyecta). Si existe, se usa Postgres en lugar de SQLite. |
| `Jwt__Key` | Clave secreta JWT (mínimo 32 caracteres). **Obligatoria.** |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma (URL del frontend). |
| `PORT` | Puerto (lo asigna Railway). |
| `SeedDemoData` | `true`/`false`: cargar datos demo si la BD está vacía. |

| Frontend | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL pública del backend (ver `frontend/.env.example`). |

## Pendiente

- [ ] Repositorio en GitHub
- [ ] Despliegue en Railway (backend + frontend + PostgreSQL) → `deploy.yml`
- [ ] `infra.yml` (Terraform)
- [ ] `snyk-semgrep.yml`
- [ ] `generate-documentation.yml` (diccionario de datos y diagramas Mermaid)
- [ ] `sonar.yml` (al final)
