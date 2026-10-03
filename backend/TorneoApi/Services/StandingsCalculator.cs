using TorneoApi.Dtos;
using TorneoApi.Models;

namespace TorneoApi.Services;

public static class StandingsCalculator
{
    public const int PointsForWin = 3;
    public const int PointsForDraw = 1;

    /// <summary>
    /// Calcula la tabla de posiciones: puntos, diferencia de goles, goles a favor y nombre.
    /// Solo cuenta partidos jugados.
    /// </summary>
    public static IReadOnlyList<StandingDto> Calculate(IEnumerable<Team> teams, IEnumerable<Match> matches)
    {
        var rows = teams.ToDictionary(t => t.Id, t => new Row(t.Id, t.Name));

        foreach (var m in matches.Where(m => m.Status == MatchStatus.Played && m.HomeScore.HasValue && m.AwayScore.HasValue))
        {
            if (!rows.TryGetValue(m.HomeTeamId, out var home) || !rows.TryGetValue(m.AwayTeamId, out var away))
                continue;

            var hs = m.HomeScore!.Value;
            var aws = m.AwayScore!.Value;
            home.Apply(hs, aws);
            away.Apply(aws, hs);
        }

        return rows.Values
            .OrderByDescending(r => r.Points)
            .ThenByDescending(r => r.GoalsFor - r.GoalsAgainst)
            .ThenByDescending(r => r.GoalsFor)
            .ThenBy(r => r.TeamName, StringComparer.OrdinalIgnoreCase)
            .Select((r, i) => new StandingDto(i + 1, r.TeamId, r.TeamName, r.Played, r.Won, r.Drawn, r.Lost,
                r.GoalsFor, r.GoalsAgainst, r.GoalsFor - r.GoalsAgainst, r.Points))
            .ToList();
    }

    private sealed class Row(int teamId, string teamName)
    {
        public int TeamId { get; } = teamId;
        public string TeamName { get; } = teamName;
        public int Played { get; private set; }
        public int Won { get; private set; }
        public int Drawn { get; private set; }
        public int Lost { get; private set; }
        public int GoalsFor { get; private set; }
        public int GoalsAgainst { get; private set; }
        public int Points => Won * PointsForWin + Drawn * PointsForDraw;

        public void Apply(int scored, int conceded)
        {
            Played++;
            GoalsFor += scored;
            GoalsAgainst += conceded;
            if (scored > conceded) Won++;
            else if (scored == conceded) Drawn++;
            else Lost++;
        }
    }
}
