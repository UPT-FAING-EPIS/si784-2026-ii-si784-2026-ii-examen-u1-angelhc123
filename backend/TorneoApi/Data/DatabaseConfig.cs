using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace TorneoApi.Data;

public static class DatabaseConfig
{
    /// <summary>
    /// Usa PostgreSQL cuando existe DATABASE_URL (Railway) o ConnectionStrings:Postgres;
    /// en otro caso usa SQLite local (ConnectionStrings:Sqlite).
    /// </summary>
    public static IServiceCollection AddAppDatabase(this IServiceCollection services, IConfiguration config)
    {
        var databaseUrl = config["DATABASE_URL"];
        var postgres = !string.IsNullOrWhiteSpace(databaseUrl)
            ? FromDatabaseUrl(databaseUrl)
            : config.GetConnectionString("Postgres");

        if (!string.IsNullOrWhiteSpace(postgres))
        {
            services.AddDbContext<AppDbContext>(o => o.UseNpgsql(postgres));
        }
        else
        {
            var sqlite = config.GetConnectionString("Sqlite") ?? "Data Source=torneo.db";
            services.AddDbContext<AppDbContext>(o => o.UseSqlite(sqlite));
        }

        return services;
    }

    /// <summary>Convierte postgresql://user:pass@host:port/db en una cadena de conexión de Npgsql.</summary>
    public static string FromDatabaseUrl(string databaseUrl)
    {
        if (!databaseUrl.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
            return databaseUrl; // ya es una cadena de conexión clásica

        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null
        };

        if (uri.Query.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase))
            builder.SslMode = SslMode.Require;

        return builder.ConnectionString;
    }
}
