using TorneoApi.Dtos;
using TorneoApi.Models;

namespace TorneoApi.Extensions;

public static class MappingExtensions
{
    public static UserDto ToDto(this User u) => new(u.Id, u.FullName, u.Email, u.Role.ToString());

    public static PlayerDto ToDto(this Player p) => new(p.Id, p.FullName, p.JerseyNumber, p.Position, p.BirthDate);

    public static TeamDto ToDto(this Team t) => new(
        t.Id, t.Name, t.City, t.LogoUrl, t.OwnerId, t.Owner?.FullName ?? string.Empty,
        t.Players.OrderBy(p => p.JerseyNumber ?? int.MaxValue).ThenBy(p => p.FullName).Select(p => p.ToDto()).ToList());

    public static RegistrationDto ToDto(this Registration r) =>
        new(r.Id, r.TeamId, r.Team?.Name ?? string.Empty, r.Status.ToString(), r.RegisteredAt);

    public static MatchDto ToDto(this Match m) => new(
        m.Id, m.TournamentId, m.Tournament?.Name ?? string.Empty, m.Round, m.ScheduledAt, m.Venue, m.Status.ToString(),
        m.HomeTeamId, m.HomeTeam?.Name ?? string.Empty, m.AwayTeamId, m.AwayTeam?.Name ?? string.Empty,
        m.HomeScore, m.AwayScore);

    public static TournamentSummaryDto ToSummaryDto(this Tournament t) => new(
        t.Id, t.Name, t.Sport, t.Category, t.Format.ToString(), t.Status.ToString(), t.MaxTeams,
        t.Registrations.Count(r => r.Status == RegistrationStatus.Approved),
        t.StartDate, t.EndDate, t.OrganizerId, t.Organizer?.FullName ?? string.Empty);

    public static TournamentDetailDto ToDetailDto(this Tournament t) => new(
        t.Id, t.Name, t.Description, t.Sport, t.Category, t.Rules, t.Format.ToString(), t.Status.ToString(),
        t.MaxTeams, t.StartDate, t.EndDate, t.OrganizerId, t.Organizer?.FullName ?? string.Empty,
        t.Registrations.OrderBy(r => r.RegisteredAt).Select(r => r.ToDto()).ToList(),
        t.Matches.Count);
}
