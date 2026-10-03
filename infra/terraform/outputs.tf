output "project_id" {
  description = "ID del proyecto en Railway."
  value       = railway_project.torneo.id
}

output "environment_id" {
  description = "ID del entorno."
  value       = local.environment_id
}

output "frontend_url" {
  description = "URL pública del frontend."
  value       = "https://${railway_service_domain.frontend.domain}"
}

output "backend_url" {
  description = "URL pública del backend."
  value       = "https://${railway_service_domain.backend.domain}"
}

output "swagger_url" {
  description = "Documentación interactiva de la API."
  value       = "https://${railway_service_domain.backend.domain}/swagger"
}
