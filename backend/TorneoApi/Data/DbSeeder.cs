using Microsoft.AspNetCore.Identity;
using TorneoApi.Models;

namespace TorneoApi.Data;

public static class DbSeeder
{
    public const string AdminEmail = "admin@torneo.com";
    public const string OrganizerEmail = "organizador@torneo.com";
    public const string PlayerEmail = "jugador@torneo.com";
    public const string DemoPassword = "Demo1234!";

    public static void Seed(AppDbContext db, IPasswordHasher<User> hasher)
    {
        if (db.Users.Any()) return;

        var admin = NewUser("Administrador", AdminEmail, UserRole.Admin, hasher);
        var organizer = NewUser("Organizador Demo", OrganizerEmail, UserRole.Organizer, hasher);
        var player = NewUser("Jugador Demo", PlayerEmail, UserRole.Player, hasher);
        db.Users.AddRange(admin, organizer, player);
        db.SaveChanges();

        var teamNames = new[] { "Halcones FC", "Tigres del Norte", "Leones United", "Pumas Rojos" };
        var teams = teamNames.Select((name, i) => new Team
        {
            Name = name,
            City = i % 2 == 0 ? "Lima" : "Arequipa",
            OwnerId = player.Id,
            Players = Enumerable.Range(1, 5).Select(n => new Player
            {
                FullName = $"Jugador {n} {name.Split(' ')[0]}",
                JerseyNumber = n,
                Position = n == 1 ? "Arquero" : n <= 3 ? "Defensa" : "Delantero"
            }).ToList()
        }).ToList();
        db.Teams.AddRange(teams);

        var start = DateTime.UtcNow.Date.AddDays(7);
        var tournament = new Tournament
        {
            Name = "Copa Primavera 2026",
            Description = "Torneo de fútbol amateur de demostración.",
            Sport = "Fútbol",
            Category = "Libre",
            Rules = "Partidos de 2 tiempos de 25 minutos. Victoria 3 pts, empate 1 pt.",
            Format = TournamentFormat.RoundRobin,
            Status = TournamentStatus.RegistrationOpen,
            MaxTeams = 8,
            StartDate = start,
            EndDate = start.AddDays(60),
            OrganizerId = organizer.Id
        };
        db.Tournaments.Add(tournament);
        db.SaveChanges();

        db.Registrations.AddRange(teams.Select(t => new Registration
        {
            TournamentId = tournament.Id,
            TeamId = t.Id,
            Status = RegistrationStatus.Approved
        }));
        db.SaveChanges();
    }

    private static User NewUser(string name, string email, UserRole role, IPasswordHasher<User> hasher)
    {
        var user = new User { FullName = name, Email = email, Role = role };
        user.PasswordHash = hasher.HashPassword(user, DemoPassword);
        return user;
    }
}
