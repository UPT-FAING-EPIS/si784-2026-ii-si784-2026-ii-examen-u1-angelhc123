using System.Net;
using System.Net.Http.Json;
using TorneoApi.Data;
using TorneoApi.Dtos;

namespace TorneoApi.Tests.Integration;

public class ApiTests(TorneoApiFactory factory) : IClassFixture<TorneoApiFactory>
{
    private static readonly System.Text.Json.JsonSerializerOptions Json = TorneoApiFactory.Json;

    private static object NewTournament(string name, string format = "RoundRobin", int maxTeams = 8) => new
    {
        name, sport = "Fútbol", category = "Sub-20", format, maxTeams,
        startDate = DateTime.UtcNow.Date.AddDays(1), endDate = DateTime.UtcNow.Date.AddDays(90)
    };

    [Fact]
    public async Task Health_endpoint_responds_ok()
    {
        var res = await factory.CreateClient().GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Register_and_login_return_token()
    {
        var client = factory.CreateClient();
        var email = $"nuevo{Guid.NewGuid():N}@test.com";

        var reg = await client.PostAsJsonAsync("/auth/register",
            new { fullName = "Nuevo Usuario", email, password = "Password1", role = "Player" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

        var login = await client.PostAsJsonAsync("/auth/login", new { email, password = "Password1" });
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>(Json);
        Assert.False(string.IsNullOrEmpty(auth!.Token));
        Assert.Equal("Player", auth.User.Role);
    }

    [Fact]
    public async Task Register_with_invalid_data_returns_400()
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/auth/register",
            new { fullName = "A", email = "no-es-correo", password = "123" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/auth/login",
            new { email = DbSeeder.OrganizerEmail, password = "Incorrecta1" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Anonymous_can_list_tournaments()
    {
        var list = await factory.CreateClient().GetFromJsonAsync<List<TournamentSummaryDto>>("/tournaments", Json);
        Assert.NotEmpty(list!);
    }

    [Fact]
    public async Task Creating_tournament_requires_authentication()
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/tournaments", NewTournament("Sin token"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Player_cannot_create_tournament()
    {
        var player = await factory.CreateClientAs(DbSeeder.PlayerEmail);
        var res = await player.PostAsJsonAsync("/tournaments", NewTournament("Prohibido"));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Organizer_creates_tournament_and_gets_detail()
    {
        var org = await factory.CreateClientAs(DbSeeder.OrganizerEmail);

        var res = await org.PostAsJsonAsync("/tournaments", NewTournament("Liga Integración"));
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var created = await res.Content.ReadFromJsonAsync<TournamentDetailDto>(Json);

        var detail = await org.GetFromJsonAsync<TournamentDetailDto>($"/tournaments/{created!.Id}", Json);
        Assert.Equal("Liga Integración", detail!.Name);
        Assert.Equal("RegistrationOpen", detail.Status);
    }

    [Fact]
    public async Task Full_flow_team_registration_fixture_and_result()
    {
        var org = await factory.CreateClientAs(DbSeeder.OrganizerEmail);
        var player = await factory.CreateClientAs(DbSeeder.PlayerEmail);

        var tRes = await org.PostAsJsonAsync("/tournaments", NewTournament($"Flujo {Guid.NewGuid():N}"[..20], maxTeams: 4));
        var tournament = await tRes.Content.ReadFromJsonAsync<TournamentDetailDto>(Json);

        // El jugador crea dos equipos y los inscribe.
        var teamIds = new List<int>();
        for (var i = 0; i < 2; i++)
        {
            var teamRes = await player.PostAsJsonAsync("/teams", new { name = $"Equipo {Guid.NewGuid():N}"[..20], city = "Lima" });
            Assert.Equal(HttpStatusCode.Created, teamRes.StatusCode);
            var team = await teamRes.Content.ReadFromJsonAsync<TeamDto>(Json);
            teamIds.Add(team!.Id);

            var reg = await player.PostAsJsonAsync($"/tournaments/{tournament!.Id}/registrations", new { teamId = team.Id });
            Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        }

        // Inscripción duplicada -> 409
        var dup = await player.PostAsJsonAsync($"/tournaments/{tournament!.Id}/registrations", new { teamId = teamIds[0] });
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);

        // El organizador aprueba las inscripciones.
        var regs = await org.GetFromJsonAsync<List<RegistrationDto>>($"/tournaments/{tournament.Id}/registrations", Json);
        foreach (var r in regs!)
        {
            var ok = await org.PutAsJsonAsync($"/tournaments/{tournament.Id}/registrations/{r.Id}", new { status = "Approved" });
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        }

        // Genera fixture.
        var fx = await org.PostAsJsonAsync($"/tournaments/{tournament.Id}/fixture", new { daysBetweenRounds = 7, venue = "Estadio" });
        Assert.Equal(HttpStatusCode.OK, fx.StatusCode);

        var matches = await org.GetFromJsonAsync<List<MatchDto>>($"/matches?tournamentId={tournament.Id}", Json);
        Assert.Single(matches!);

        // Registra resultado y verifica la tabla.
        var result = await org.PutAsJsonAsync($"/matches/{matches![0].Id}/result", new { homeScore = 2, awayScore = 0 });
        Assert.Equal(HttpStatusCode.OK, result.StatusCode);

        var standings = await org.GetFromJsonAsync<List<StandingDto>>($"/tournaments/{tournament.Id}/standings", Json);
        Assert.Equal(matches[0].HomeTeamId, standings![0].TeamId);
        Assert.Equal(3, standings[0].Points);

        var report = await org.GetFromJsonAsync<TournamentReportDto>($"/tournaments/{tournament.Id}/report", Json);
        Assert.Equal(1, report!.PlayedMatches);
        Assert.Equal(2, report.TotalGoals);

        // Equipos del usuario
        var me = await player.GetFromJsonAsync<UserDto>("/auth/me", Json);
        var myTeams = await player.GetFromJsonAsync<List<TeamDto>>($"/teams?userId={me!.Id}", Json);
        Assert.Contains(myTeams!, t => t.Id == teamIds[0]);
    }

    [Fact]
    public async Task Player_cannot_register_team_of_another_user()
    {
        var org = await factory.CreateClientAs(DbSeeder.OrganizerEmail);
        var orgTeam = await (await org.PostAsJsonAsync("/teams", new { name = $"Org {Guid.NewGuid():N}"[..20] }))
            .Content.ReadFromJsonAsync<TeamDto>(Json);
        var tournaments = await org.GetFromJsonAsync<List<TournamentSummaryDto>>("/tournaments?status=RegistrationOpen", Json);

        var player = await factory.CreateClientAs(DbSeeder.PlayerEmail);
        var res = await player.PostAsJsonAsync($"/tournaments/{tournaments![0].Id}/registrations", new { teamId = orgTeam!.Id });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Manual_match_with_same_team_returns_400()
    {
        var org = await factory.CreateClientAs(DbSeeder.OrganizerEmail);
        var res = await org.PostAsJsonAsync("/matches", new
        {
            tournamentId = 1, homeTeamId = 1, awayTeamId = 1, scheduledAt = DateTime.UtcNow.AddDays(10)
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
