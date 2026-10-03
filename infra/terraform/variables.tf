variable "project_name" {
  description = "Nombre del proyecto en Railway."
  type        = string
  default     = "torneo-iac"
}

variable "environment_name" {
  description = "Nombre del entorno por defecto."
  type        = string
  default     = "production"
}

variable "workspace_id" {
  description = "ID del workspace de Railway (solo si el token tiene acceso a varios)."
  type        = string
  default     = null
}

variable "github_repo" {
  description = "Repositorio de GitHub (owner/nombre) con el código fuente."
  type        = string
  default     = "UPT-FAING-EPIS/si784-2026-ii-si784-2026-ii-examen-u1-angelhc123"
}

variable "github_branch" {
  description = "Rama a desplegar."
  type        = string
  default     = "main"
}

variable "postgres_image" {
  description = "Imagen de PostgreSQL."
  type        = string
  default     = "ghcr.io/railwayapp-templates/postgres-ssl:18"
}

variable "seed_demo_data" {
  description = "Cargar datos de demostración cuando la BD está vacía."
  type        = bool
  default     = true
}
