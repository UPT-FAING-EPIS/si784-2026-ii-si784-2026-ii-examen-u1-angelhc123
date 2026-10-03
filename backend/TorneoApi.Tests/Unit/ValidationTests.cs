using System.ComponentModel.DataAnnotations;
using TorneoApi.Data;
using TorneoApi.Dtos;
using TorneoApi.Models;

namespace TorneoApi.Tests.Unit;

public class ValidationTests
{
    private static List<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    private static TournamentRequest ValidTournament() => new()
    {
        Name = "Copa Test", Sport = "Fútbol", Category = "Libre", MaxTeams = 8,
        StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2026, 2, 1)
    };

    [Fact]
    public void Valid_tournament_has_no_errors() => Assert.Empty(Validate(ValidTournament()));

    [Fact]
    public void Tournament_end_before_start_is_invalid()
    {
        var t = ValidTournament();
        t.EndDate = t.StartDate.AddDays(-1);
        Assert.Contains(Validate(t), r => r.MemberNames.Contains(nameof(TournamentRequest.EndDate)));
    }

    [Fact]
    public void Knockout_requires_power_of_two_teams()
    {
        var t = ValidTournament();
        t.Format = TournamentFormat.Knockout;
        t.MaxTeams = 6;
        Assert.Contains(Validate(t), r => r.MemberNames.Contains(nameof(TournamentRequest.MaxTeams)));
    }

    [Theory]
    [InlineData("corto")]
    [InlineData("sinmayuscula1")]
    [InlineData("SinNumeroAqui")]
    public void Weak_passwords_are_rejected(string password)
    {
        var r = new RegisterRequest { FullName = "Usuario Test", Email = "a@b.com", Password = password };
        Assert.Contains(Validate(r), x => x.MemberNames.Contains(nameof(RegisterRequest.Password)));
    }

    [Fact]
    public void Match_against_itself_is_invalid()
    {
        var m = new MatchRequest { TournamentId = 1, HomeTeamId = 5, AwayTeamId = 5, ScheduledAt = DateTime.UtcNow };
        Assert.NotEmpty(Validate(m));
    }

    [Fact]
    public void Database_url_is_converted_to_npgsql_connection_string()
    {
        var cs = DatabaseConfig.FromDatabaseUrl("postgresql://postgres:s3cr%40t@db.railway.internal:5432/railway");

        Assert.Contains("Host=db.railway.internal", cs);
        Assert.Contains("Port=5432", cs);
        Assert.Contains("Database=railway", cs);
        Assert.Contains("Username=postgres", cs);
        Assert.Contains("Password=s3cr@t", cs);
    }

    [Fact]
    public void Classic_connection_string_is_returned_unchanged()
    {
        const string cs = "Host=localhost;Database=torneo";
        Assert.Equal(cs, DatabaseConfig.FromDatabaseUrl(cs));
    }
}
