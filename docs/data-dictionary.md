# Diccionario de datos

> Documento generado automáticamente por `generate-documentation.yml` — no editar a mano.

- **Motor:** PostgreSQL
- **Tablas:** 6
- **Generado:** 2026-10-03 02:29 UTC

## Índice

- [matches](#matches) — Partidos programados dentro de un torneo.
- [players](#players) — Jugadores que integran cada equipo.
- [registrations](#registrations) — Inscripciones de equipos en torneos.
- [teams](#teams) — Equipos registrados por los usuarios.
- [tournaments](#tournaments) — Torneos deportivos creados por los organizadores.
- [users](#users) — Usuarios registrados en la plataforma.

## matches

Partidos programados dentro de un torneo.

| # | Columna | Tipo | Nulo | Clave | Por defecto | Descripción |
|---|---------|------|------|-------|-------------|-------------|
| 1 | `Id` | integer | No | PK |  | Identificador del partido. |
| 2 | `Round` | integer | No |  |  | Jornada o ronda. |
| 3 | `ScheduledAt` | timestamp with time zone | No |  |  | Fecha y hora programada (UTC). |
| 4 | `Venue` | character varying(120) | Sí |  |  | Sede o cancha. |
| 5 | `Status` | character varying(20) | No |  |  | Estado: Scheduled, Played o Cancelled. |
| 6 | `HomeScore` | integer | Sí |  |  | Goles/puntos del equipo local. |
| 7 | `AwayScore` | integer | Sí |  |  | Goles/puntos del equipo visitante. |
| 8 | `TournamentId` | integer | No | FK → `tournaments.Id` |  | Torneo (FK tournaments). |
| 9 | `HomeTeamId` | integer | No | FK → `teams.Id` |  | Equipo local (FK teams). |
| 10 | `AwayTeamId` | integer | No | FK → `teams.Id` |  | Equipo visitante (FK teams). |

**Índices:**

- `IX_matches_AwayTeamId`: btree ("AwayTeamId")
- `IX_matches_HomeTeamId`: btree ("HomeTeamId")
- `IX_matches_TournamentId_Round`: btree ("TournamentId", "Round")
- `PK_matches`: btree ("Id")

## players

Jugadores que integran cada equipo.

| # | Columna | Tipo | Nulo | Clave | Por defecto | Descripción |
|---|---------|------|------|-------|-------------|-------------|
| 1 | `Id` | integer | No | PK |  | Identificador del jugador. |
| 2 | `FullName` | character varying(100) | No |  |  | Nombre completo del jugador. |
| 3 | `JerseyNumber` | integer | Sí |  |  | Número de camiseta (0-99, único por equipo). |
| 4 | `Position` | character varying(40) | Sí |  |  | Posición de juego. |
| 5 | `BirthDate` | timestamp with time zone | Sí |  |  | Fecha de nacimiento. |
| 6 | `TeamId` | integer | No | FK → `teams.Id` |  | Equipo al que pertenece (FK teams). |

**Índices:**

- `IX_players_TeamId`: btree ("TeamId")
- `PK_players`: btree ("Id")

## registrations

Inscripciones de equipos en torneos.

| # | Columna | Tipo | Nulo | Clave | Por defecto | Descripción |
|---|---------|------|------|-------|-------------|-------------|
| 1 | `Id` | integer | No | PK |  | Identificador de la inscripción. |
| 2 | `Status` | character varying(20) | No |  |  | Estado: Pending, Approved o Rejected. |
| 3 | `RegisteredAt` | timestamp with time zone | No |  |  | Fecha de inscripción (UTC). |
| 4 | `TournamentId` | integer | No | FK → `tournaments.Id` |  | Torneo (FK tournaments). |
| 5 | `TeamId` | integer | No | FK → `teams.Id` |  | Equipo inscrito (FK teams). |

**Índices:**

- `IX_registrations_TeamId`: btree ("TeamId")
- `IX_registrations_TournamentId_TeamId`: btree ("TournamentId", "TeamId")
- `PK_registrations`: btree ("Id")

## teams

Equipos registrados por los usuarios.

| # | Columna | Tipo | Nulo | Clave | Por defecto | Descripción |
|---|---------|------|------|-------|-------------|-------------|
| 1 | `Id` | integer | No | PK |  | Identificador del equipo. |
| 2 | `Name` | character varying(100) | No | UQ |  | Nombre del equipo (único). |
| 3 | `City` | character varying(80) | Sí |  |  | Ciudad de procedencia. |
| 4 | `LogoUrl` | character varying(300) | Sí |  |  | URL del logo. |
| 5 | `CreatedAt` | timestamp with time zone | No |  |  | Fecha de creación (UTC). |
| 6 | `OwnerId` | integer | No | FK → `users.Id` |  | Usuario capitán/dueño del equipo (FK users). |

**Índices:**

- `IX_teams_Name`: btree ("Name")
- `IX_teams_OwnerId`: btree ("OwnerId")
- `PK_teams`: btree ("Id")

## tournaments

Torneos deportivos creados por los organizadores.

| # | Columna | Tipo | Nulo | Clave | Por defecto | Descripción |
|---|---------|------|------|-------|-------------|-------------|
| 1 | `Id` | integer | No | PK |  | Identificador del torneo. |
| 2 | `Name` | character varying(120) | No |  |  | Nombre del torneo. |
| 3 | `Description` | character varying(1000) | Sí |  |  | Descripción general. |
| 4 | `Sport` | character varying(50) | No |  |  | Deporte (Fútbol, Básquet, etc.). |
| 5 | `Category` | character varying(50) | No |  |  | Categoría (Libre, Sub-17, Femenino, etc.). |
| 6 | `Rules` | character varying(2000) | Sí |  |  | Reglamento del torneo. |
| 7 | `Format` | character varying(20) | No |  |  | Formato: RoundRobin (todos contra todos) o Knockout (eliminación). |
| 8 | `Status` | character varying(20) | No |  |  | Estado: Draft, RegistrationOpen, InProgress o Finished. |
| 9 | `MaxTeams` | integer | No |  |  | Número máximo de equipos. |
| 10 | `StartDate` | timestamp with time zone | No |  |  | Fecha de inicio (UTC). |
| 11 | `EndDate` | timestamp with time zone | No |  |  | Fecha de fin (UTC). |
| 12 | `CreatedAt` | timestamp with time zone | No |  |  | Fecha de creación (UTC). |
| 13 | `OrganizerId` | integer | No | FK → `users.Id` |  | Usuario organizador (FK users). |

**Índices:**

- `IX_tournaments_OrganizerId`: btree ("OrganizerId")
- `PK_tournaments`: btree ("Id")

## users

Usuarios registrados en la plataforma.

| # | Columna | Tipo | Nulo | Clave | Por defecto | Descripción |
|---|---------|------|------|-------|-------------|-------------|
| 1 | `Id` | integer | No | PK |  | Identificador del usuario. |
| 2 | `FullName` | character varying(100) | No |  |  | Nombre completo. |
| 3 | `Email` | character varying(150) | No | UQ |  | Correo electrónico (único, usado para iniciar sesión). |
| 4 | `PasswordHash` | character varying(255) | No |  |  | Hash de la contraseña (PBKDF2). |
| 5 | `Role` | character varying(20) | No |  |  | Rol: Player, Organizer o Admin. |
| 6 | `CreatedAt` | timestamp with time zone | No |  |  | Fecha de registro (UTC). |

**Índices:**

- `IX_users_Email`: btree ("Email")
- `PK_users`: btree ("Id")
