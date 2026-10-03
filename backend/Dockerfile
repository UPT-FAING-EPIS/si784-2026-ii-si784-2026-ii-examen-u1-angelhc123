# ---------- Build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY TorneoApi/TorneoApi.csproj TorneoApi/
RUN dotnet restore TorneoApi/TorneoApi.csproj
COPY TorneoApi/ TorneoApi/
RUN dotnet publish TorneoApi/TorneoApi.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---------- Runtime ----------
# Imagen "chiseled": Ubuntu mínima sin shell ni gestor de paquetes (superficie de ataque reducida)
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080
COPY --from=build /app/publish .
# Usuario sin privilegios (UID 1654 "app") incluido en la imagen oficial
USER 1654
EXPOSE 8080
ENTRYPOINT ["dotnet", "TorneoApi.dll"]
