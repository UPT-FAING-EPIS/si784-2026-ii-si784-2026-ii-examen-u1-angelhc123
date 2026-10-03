# ---------- Build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY TorneoApi/TorneoApi.csproj TorneoApi/
RUN dotnet restore TorneoApi/TorneoApi.csproj
COPY TorneoApi/ TorneoApi/
RUN dotnet publish TorneoApi/TorneoApi.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---------- Runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_RUNNING_IN_CONTAINER=true
COPY --from=build /app/publish .
# Usuario sin privilegios incluido en la imagen oficial
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "TorneoApi.dll"]
