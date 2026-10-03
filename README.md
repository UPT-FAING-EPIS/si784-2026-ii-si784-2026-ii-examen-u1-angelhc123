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

## Automatizaciones (GitHub Actions)

| Workflow | Qué hace | Secretos / variables |
|----------|----------|----------------------|
| `deploy.yml` | Pruebas del backend, lint y build del frontend, despliegue a Railway con `railway up` y verificación de salud | `RAILWAY_TOKEN` (token de **proyecto**) |
| `infra.yml` | Terraform (`infra/terraform`): proyecto Railway, PostgreSQL con volumen, backend, frontend, dominios y variables. `plan` / `apply` / `destroy` manual | `RAILWAY_API_TOKEN` (token de **cuenta**), `TF_STATE_PASSPHRASE` |
| `snyk-semgrep.yml` | Semgrep (SAST), Snyk Code, Snyk Open Source (NuGet/npm) y Snyk Container (ambas imágenes). Reportes HTML/JSON/SARIF como artefactos | `SNYK_TOKEN` |
| `generate-documentation.yml` | Levanta PostgreSQL, crea el esquema y genera en `docs/` el diccionario de datos y los diagramas ER, de clases, de componentes y de despliegue (Mermaid + SVG) | — |
| `sonar.yml` | *(pendiente)* | `SONAR_TOKEN` |

Variables opcionales del repositorio (`Settings → Secrets and variables → Actions → Variables`): `RAILWAY_BACKEND_SERVICE`, `RAILWAY_FRONTEND_SERVICE`, `BACKEND_URL`, `FRONTEND_URL`.

## Documentación técnica

Ver [`docs/`](docs/README.md) (generada automáticamente).
