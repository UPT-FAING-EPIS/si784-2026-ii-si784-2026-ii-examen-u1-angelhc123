using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using TorneoApi.Models;

namespace TorneoApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Registration> Registrations => Set<Registration>();
    public DbSet<Match> Matches => Set<Match>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.Property(u => u.FullName).HasMaxLength(100).IsRequired();
            e.Property(u => u.Email).HasMaxLength(150).IsRequired();
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.PasswordHash).HasMaxLength(255).IsRequired();
            e.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<Tournament>(e =>
        {
            e.ToTable("tournaments");
            e.Property(t => t.Name).HasMaxLength(120).IsRequired();
            e.Property(t => t.Description).HasMaxLength(1000);
            e.Property(t => t.Sport).HasMaxLength(50).IsRequired();
            e.Property(t => t.Category).HasMaxLength(50).IsRequired();
            e.Property(t => t.Rules).HasMaxLength(2000);
            e.Property(t => t.Format).HasConversion<string>().HasMaxLength(20);
            e.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            e.HasOne(t => t.Organizer)
                .WithMany(u => u.OrganizedTournaments)
                .HasForeignKey(t => t.OrganizerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Team>(e =>
        {
            e.ToTable("teams");
            e.Property(t => t.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(t => t.Name).IsUnique();
            e.Property(t => t.City).HasMaxLength(80);
            e.Property(t => t.LogoUrl).HasMaxLength(300);
            e.HasOne(t => t.Owner)
                .WithMany(u => u.Teams)
                .HasForeignKey(t => t.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Player>(e =>
        {
            e.ToTable("players");
            e.Property(p => p.FullName).HasMaxLength(100).IsRequired();
            e.Property(p => p.Position).HasMaxLength(40);
            e.HasOne(p => p.Team)
                .WithMany(t => t.Players)
                .HasForeignKey(p => p.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Registration>(e =>
        {
            e.ToTable("registrations");
            e.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(r => new { r.TournamentId, r.TeamId }).IsUnique();
            e.HasOne(r => r.Tournament)
                .WithMany(t => t.Registrations)
                .HasForeignKey(r => r.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Team)
                .WithMany(t => t.Registrations)
                .HasForeignKey(r => r.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Match>(e =>
        {
            e.ToTable("matches");
            e.Property(m => m.Venue).HasMaxLength(120);
            e.Property(m => m.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(m => new { m.TournamentId, m.Round });
            e.HasOne(m => m.Tournament)
                .WithMany(t => t.Matches)
                .HasForeignKey(m => m.TournamentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.HomeTeam)
                .WithMany()
                .HasForeignKey(m => m.HomeTeamId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.AwayTeam)
                .WithMany()
                .HasForeignKey(m => m.AwayTeamId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        ApplyComments(modelBuilder);

        // Todas las fechas se guardan y se leen como UTC (requisito de PostgreSQL 'timestamp with time zone').
        var utcConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.ToUniversalTime(), DateTimeKind.Utc),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var nullableUtcConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v == null ? v : v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value.ToUniversalTime(), DateTimeKind.Utc),
            v => v == null ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                    property.SetValueConverter(utcConverter);
                else if (property.ClrType == typeof(DateTime?))
                    property.SetValueConverter(nullableUtcConverter);
            }
        }
    }

    /// <summary>Descripciones de tablas y columnas (COMMENT ON en PostgreSQL) usadas por el diccionario de datos.</summary>
    private static readonly Dictionary<Type, (string Table, Dictionary<string, string> Columns)> Comments = new()
    {
        [typeof(User)] = ("Usuarios registrados en la plataforma.", new()
        {
            [nameof(User.Id)] = "Identificador del usuario.",
            [nameof(User.FullName)] = "Nombre completo.",
            [nameof(User.Email)] = "Correo electrónico (único, usado para iniciar sesión).",
            [nameof(User.PasswordHash)] = "Hash de la contraseña (PBKDF2).",
            [nameof(User.Role)] = "Rol: Player, Organizer o Admin.",
            [nameof(User.CreatedAt)] = "Fecha de registro (UTC)."
        }),
        [typeof(Tournament)] = ("Torneos deportivos creados por los organizadores.", new()
        {
            [nameof(Tournament.Id)] = "Identificador del torneo.",
            [nameof(Tournament.Name)] = "Nombre del torneo.",
            [nameof(Tournament.Description)] = "Descripción general.",
            [nameof(Tournament.Sport)] = "Deporte (Fútbol, Básquet, etc.).",
            [nameof(Tournament.Category)] = "Categoría (Libre, Sub-17, Femenino, etc.).",
            [nameof(Tournament.Rules)] = "Reglamento del torneo.",
            [nameof(Tournament.Format)] = "Formato: RoundRobin (todos contra todos) o Knockout (eliminación).",
            [nameof(Tournament.Status)] = "Estado: Draft, RegistrationOpen, InProgress o Finished.",
            [nameof(Tournament.MaxTeams)] = "Número máximo de equipos.",
            [nameof(Tournament.StartDate)] = "Fecha de inicio (UTC).",
            [nameof(Tournament.EndDate)] = "Fecha de fin (UTC).",
            [nameof(Tournament.CreatedAt)] = "Fecha de creación (UTC).",
            [nameof(Tournament.OrganizerId)] = "Usuario organizador (FK users)."
        }),
        [typeof(Team)] = ("Equipos registrados por los usuarios.", new()
        {
            [nameof(Team.Id)] = "Identificador del equipo.",
            [nameof(Team.Name)] = "Nombre del equipo (único).",
            [nameof(Team.City)] = "Ciudad de procedencia.",
            [nameof(Team.LogoUrl)] = "URL del logo.",
            [nameof(Team.CreatedAt)] = "Fecha de creación (UTC).",
            [nameof(Team.OwnerId)] = "Usuario capitán/dueño del equipo (FK users)."
        }),
        [typeof(Player)] = ("Jugadores que integran cada equipo.", new()
        {
            [nameof(Player.Id)] = "Identificador del jugador.",
            [nameof(Player.FullName)] = "Nombre completo del jugador.",
            [nameof(Player.JerseyNumber)] = "Número de camiseta (0-99, único por equipo).",
            [nameof(Player.Position)] = "Posición de juego.",
            [nameof(Player.BirthDate)] = "Fecha de nacimiento.",
            [nameof(Player.TeamId)] = "Equipo al que pertenece (FK teams)."
        }),
        [typeof(Registration)] = ("Inscripciones de equipos en torneos.", new()
        {
            [nameof(Registration.Id)] = "Identificador de la inscripción.",
            [nameof(Registration.Status)] = "Estado: Pending, Approved o Rejected.",
            [nameof(Registration.RegisteredAt)] = "Fecha de inscripción (UTC).",
            [nameof(Registration.TournamentId)] = "Torneo (FK tournaments).",
            [nameof(Registration.TeamId)] = "Equipo inscrito (FK teams)."
        }),
        [typeof(Match)] = ("Partidos programados dentro de un torneo.", new()
        {
            [nameof(Match.Id)] = "Identificador del partido.",
            [nameof(Match.Round)] = "Jornada o ronda.",
            [nameof(Match.ScheduledAt)] = "Fecha y hora programada (UTC).",
            [nameof(Match.Venue)] = "Sede o cancha.",
            [nameof(Match.Status)] = "Estado: Scheduled, Played o Cancelled.",
            [nameof(Match.HomeScore)] = "Goles/puntos del equipo local.",
            [nameof(Match.AwayScore)] = "Goles/puntos del equipo visitante.",
            [nameof(Match.TournamentId)] = "Torneo (FK tournaments).",
            [nameof(Match.HomeTeamId)] = "Equipo local (FK teams).",
            [nameof(Match.AwayTeamId)] = "Equipo visitante (FK teams)."
        })
    };

    private static void ApplyComments(ModelBuilder modelBuilder)
    {
        foreach (var (type, (table, columns)) in Comments)
        {
            var entity = modelBuilder.Entity(type);
            entity.ToTable(t => t.HasComment(table));
            foreach (var (property, comment) in columns)
                entity.Property(property).HasComment(comment);
        }
    }
}
