using TorneoApi.Models;
using TorneoApi.Services;

namespace TorneoApi.Tests.Unit;

public class StandingsCalculatorTests
{
    private static readonly Team A = new() { Id = 1, Name = "Alfa" };
    private static readonly Team B = new() { Id = 2, Name = "Beta" };
    private static readonly Team C = new() { Id = 3, Name = "Gamma" };

    private static Match Played(int home, int away, int hs, int aws) => new()
    {
        HomeTeamId = home, AwayTeamId = away, HomeScore = hs, AwayScore = aws, Status = MatchStatus.Played
    };

    [Fact]
    public void Calculates_points_and_goals()
    {
        var matches = new[] { Played(1, 2, 3, 1), Played(2, 3, 2, 2), Played(3, 1, 0, 1) };

        var table = StandingsCalculator.Calculate([A, B, C], matches);

        var alfa = table.Single(r => r.TeamId == 1);
        Assert.Equal(1, alfa.Position);
        Assert.Equal(6, alfa.Points);
        Assert.Equal(2, alfa.Won);
        Assert.Equal(4, alfa.GoalsFor);
        Assert.Equal(1, alfa.GoalsAgainst);
        Assert.Equal(3, alfa.GoalDifference);

        var beta = table.Single(r => r.TeamId == 2);
        Assert.Equal(1, beta.Points);
        Assert.Equal(1, beta.Drawn);
        Assert.Equal(1, beta.Lost);
    }

    [Fact]
    public void Ignores_matches_not_played()
    {
        var pending = new Match { HomeTeamId = 1, AwayTeamId = 2, Status = MatchStatus.Scheduled };

        var table = StandingsCalculator.Calculate([A, B], [pending]);

        Assert.All(table, r => Assert.Equal(0, r.Played));
    }

    [Fact]
    public void Tie_on_points_is_broken_by_goal_difference()
    {
        var matches = new[] { Played(1, 3, 1, 0), Played(2, 3, 4, 0) };

        var table = StandingsCalculator.Calculate([A, B, C], matches);

        Assert.Equal("Beta", table[0].TeamName);
        Assert.Equal("Alfa", table[1].TeamName);
        Assert.Equal("Gamma", table[2].TeamName);
    }
}
