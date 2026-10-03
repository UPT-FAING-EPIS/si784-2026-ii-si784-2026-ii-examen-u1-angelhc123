# Diagrama de despliegue

> Documento generado automáticamente por `generate-documentation.yml` — no editar a mano.

Infraestructura en Railway aprovisionada con Terraform y desplegada con GitHub Actions.

```mermaid
flowchart TB
    dev([Desarrollador - VS Code])
    subgraph GH[GitHub]
        repo[(Repositorio)]
        actions[GitHub Actions<br/>deploy.yml<br/>generate-documentation.yml<br/>infra.yml<br/>snyk-semgrep.yml]
    end
    subgraph RW[Railway - proyecto / entorno production]
        direction LR
        fe["Servicio frontend<br/>Contenedor nginxinc/nginx-unprivileged:alpine<br/>React SPA estática · puerto 8080"]
        be["Servicio backend<br/>Contenedor mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled<br/>TorneoApi.dll · puerto 8080"]
        pg[("PostgreSQL<br/>postgres-ssl · volumen persistente")]
    end
    tf[Terraform<br/>provider railway]
    browser([Usuario - Navegador])
    dev -->|git push| repo --> actions
    actions -->|deploy.yml · railway up| fe
    actions -->|deploy.yml · railway up| be
    actions -->|infra.yml| tf -->|aprovisiona| RW
    browser -->|HTTPS *.up.railway.app| fe
    browser -->|HTTPS REST + JWT| be
    be -->|red privada *.railway.internal:5432| pg
```
