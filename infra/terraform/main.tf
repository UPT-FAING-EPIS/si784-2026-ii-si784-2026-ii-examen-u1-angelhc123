# ---------------------------------------------------------------------
# Proyecto y entorno
# ---------------------------------------------------------------------
resource "railway_project" "torneo" {
  name         = var.project_name
  description  = "Aplicación de torneos deportivos en línea (React + .NET + PostgreSQL)"
  private      = true
  workspace_id = var.workspace_id

  default_environment = {
    name = var.environment_name
  }
}

locals {
  environment_id = railway_project.torneo.default_environment.id
  app_port       = "8080"
}

# Sufijo para que los subdominios *.up.railway.app sean únicos
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "random_password" "postgres" {
  length  = 32
  special = false
}

resource "random_password" "jwt_key" {
  length  = 64
  special = false
}

# ---------------------------------------------------------------------
# Base de datos PostgreSQL con volumen persistente
# ---------------------------------------------------------------------
resource "railway_service" "postgres" {
  name         = "postgres"
  project_id   = railway_project.torneo.id
  source_image = var.postgres_image

  volume = {
    name       = "postgres-data"
    mount_path = "/var/lib/postgresql/data"
  }
}

resource "railway_variable_collection" "postgres" {
  environment_id = local.environment_id
  service_id     = railway_service.postgres.id

  variables = [
    { name = "POSTGRES_USER", value = "torneo" },
    { name = "POSTGRES_PASSWORD", value = random_password.postgres.result },
    { name = "POSTGRES_DB", value = "torneo" },
    { name = "PGDATA", value = "/var/lib/postgresql/data/pgdata" },
  ]
}

locals {
  # Red privada de Railway: <servicio>.railway.internal
  database_url = "postgresql://torneo:${random_password.postgres.result}@${railway_service.postgres.name}.railway.internal:5432/torneo"
}

# ---------------------------------------------------------------------
# Backend (.NET) - se construye con backend/Dockerfile
# ---------------------------------------------------------------------
resource "railway_service" "backend" {
  name               = "backend"
  project_id         = railway_project.torneo.id
  source_repo        = var.github_repo
  source_repo_branch = var.github_branch
  root_directory     = "backend"
}

resource "railway_service_domain" "backend" {
  subdomain      = "torneo-api-${random_string.suffix.result}"
  environment_id = local.environment_id
  service_id     = railway_service.backend.id
}

# ---------------------------------------------------------------------
# Frontend (React + nginx) - se construye con frontend/Dockerfile
# ---------------------------------------------------------------------
resource "railway_service" "frontend" {
  name               = "frontend"
  project_id         = railway_project.torneo.id
  source_repo        = var.github_repo
  source_repo_branch = var.github_branch
  root_directory     = "frontend"
}

resource "railway_service_domain" "frontend" {
  subdomain      = "torneo-web-${random_string.suffix.result}"
  environment_id = local.environment_id
  service_id     = railway_service.frontend.id
}

# ---------------------------------------------------------------------
# Variables de entorno de cada servicio
# ---------------------------------------------------------------------
resource "railway_variable_collection" "backend" {
  environment_id = local.environment_id
  service_id     = railway_service.backend.id

  variables = [
    { name = "DATABASE_URL", value = local.database_url },
    { name = "Jwt__Key", value = random_password.jwt_key.result },
    { name = "CORS_ORIGINS", value = "https://${railway_service_domain.frontend.domain}" },
    { name = "PORT", value = local.app_port },
    { name = "SeedDemoData", value = tostring(var.seed_demo_data) },
  ]
}

resource "railway_variable_collection" "frontend" {
  environment_id = local.environment_id
  service_id     = railway_service.frontend.id

  variables = [
    { name = "VITE_API_URL", value = "https://${railway_service_domain.backend.domain}" },
    { name = "PORT", value = local.app_port },
  ]
}
