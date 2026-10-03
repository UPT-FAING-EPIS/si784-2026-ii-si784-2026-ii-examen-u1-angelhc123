# Proyecto: Aplicación de Torneo Deportivo en Línea

## Objetivo
Desarrollar una plataforma web que permita organizar, gestionar y participar en torneos deportivos en línea, facilitando la inscripción de equipos/jugadores, la programación de partidos y el seguimiento de resultados.

## Funcionalidades Principales
- Creación y gestión de torneos con reglas, categorías y fechas.
- Inscripción de equipos o jugadores a torneos.
- Generación automática de fixtures y programación de partidos.
- Visualización de calendarios, resultados y estadísticas.
- Panel de usuario para gestión de equipos, partidos y resultados.
- Panel de organizador para gestión de torneos, inscripciones y reportes.

## Backend (API)
- Framework sugerido: .NET Core.
- Endpoints RESTful:
  - `POST /tournaments` — Crear torneo.
  - `GET /tournaments` — Listar torneos disponibles.
  - `GET /tournaments/{id}` — Detalle de torneo.
  - `POST /teams` — Registrar equipo.
  - `GET /teams?userId={id}` — Listar equipos de un usuario.
  - `POST /matches` — Programar partido.
  - `GET /matches?tournamentId={id}` — Listar partidos de un torneo.
- Base de datos relacional (ej: SQL Server, PostgreSQL).
- Autenticación JWT y roles de usuario.
- Pruebas unitarias y de integración.

## Frontend
- Framework sugerido: Angular, React o Vue.
- Funcionalidades:
  - Panel de torneos, equipos y partidos.
  - Inscripción y gestión de equipos/jugadores.
  - Visualización de calendarios, resultados y estadísticas.
  - Panel de organizador para gestión de torneos y reportes.
 
## Consideraciones
- Crear la aplicación con el framework sugerido, puede utilizar tambien otro, incluir validación de datos en frontend y backend. Subir la aplicación al repositorio Github (2)
- Utilizar una imagen de contenedor para el backend. (1)
- Crear una automatizacion infra,yml para el aprovisionamiento de la infraestructura en el servicio nube de su preferencia utilizándooslo Terraform. (2)
- Crear una automatizaciòn sonar.yml para realizar el escaneo del còdigo. El còdigo no debera contener bugs, vulnerabilidades o security hotspots (2)
- Crear una automatizacion snyk-semgrep.yml para escanear el còdigo y la imagen del contenedor, no deberan contener vulnerabilidades evidenciando el reporte correspondiente. (2)
- Crear automatizacion deploy.yml para desplegar la aplicacion a los servicios nube respectivos. (2)
- Crear una automatización generase-documentation.yml que genere el diccionario de datos de la base de datos, diagrama entidad relacion de la base de datos, diagrama de clases, diagrama de componentes, diagramas de despliegue (formato mermaid) de la aplicación. (3)