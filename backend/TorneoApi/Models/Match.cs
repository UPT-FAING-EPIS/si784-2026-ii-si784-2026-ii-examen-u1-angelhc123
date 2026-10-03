namespace TorneoApi.Models;

public class Match
{
    public int Id { get; set; }
    public int Round { get; set; } = 1;
    public DateTime ScheduledAt { get; set; }
    public string? Venue { get; set; }
    public MatchStatus Status { get; set; } = MatchStatus.Scheduled;
    public int? HomeScore { get; set; }
    public int? AwayScore { get; set; }

    public int TournamentId { get; set; }
    public Tournament? Tournament { get; set; }

    public int HomeTeamId { get; set; }
    public Team? HomeTeam { get; set; }

    public int AwayTeamId { get; set; }
    public Team? AwayTeam { get; set; }
}
