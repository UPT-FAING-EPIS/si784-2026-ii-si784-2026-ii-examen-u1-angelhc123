using TorneoApi.Services;

namespace TorneoApi.Tests.Unit;

public class FixtureGeneratorTests
{
    private static readonly DateTime Start = new(2026, 1, 10, 15, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(2)]
    [InlineData(4)]
    [InlineData(5)]
    [InlineData(8)]
    public void RoundRobin_every_pair_plays_exactly_once(int teamCount)
    {
        var teams = Enumerable.Range(1, teamCount).ToList();

        var fixture = FixtureGenerator.RoundRobin(teams, Start, 7);

        Assert.Equal(teamCount * (teamCount - 1) / 2, fixture.Count);
        var pairs = fixture.Select(m => (Math.Min(m.HomeTeamId, m.AwayTeamId), Math.Max(m.HomeTeamId, m.AwayTeamId)));
        Assert.Equal(fixture.Count, pairs.Distinct().Count());
        Assert.DoesNotContain(fixture, m => m.HomeTeamId == m.AwayTeamId);
    }

    [Fact]
    public void RoundRobin_team_plays_at_most_once_per_round()
    {
        var fixture = FixtureGenerator.RoundRobin(Enumerable.Range(1, 6).ToList(), Start, 7);

        foreach (var round in fixture.GroupBy(m => m.Round))
        {
            var ids = round.SelectMany(m => new[] { m.HomeTeamId, m.AwayTeamId }).ToList();
            Assert.Equal(ids.Count, ids.Distinct().Count());
        }
    }

    [Fact]
    public void RoundRobin_schedules_rounds_separated_by_given_days()
    {
        var fixture = FixtureGenerator.RoundRobin([1, 2, 3, 4], Start, 3);

        Assert.Equal(3, fixture.Max(m => m.Round));
        Assert.All(fixture, m => Assert.Equal(Start.AddDays((m.Round - 1) * 3), m.ScheduledAt));
    }

    [Fact]
    public void RoundRobin_with_less_than_two_teams_throws()
    {
        Assert.Throws<ArgumentException>(() => FixtureGenerator.RoundRobin([1], Start, 7));
    }

    [Fact]
    public void KnockoutRound_pairs_teams_in_order()
    {
        var round = FixtureGenerator.KnockoutRound([10, 20, 30, 40], 1, Start);

        Assert.Equal(2, round.Count);
        Assert.Equal((10, 20), (round[0].HomeTeamId, round[0].AwayTeamId));
        Assert.Equal((30, 40), (round[1].HomeTeamId, round[1].AwayTeamId));
    }

    [Theory]
    [InlineData(3)]
    [InlineData(6)]
    public void KnockoutRound_requires_power_of_two(int count)
    {
        Assert.Throws<ArgumentException>(() =>
            FixtureGenerator.KnockoutRound(Enumerable.Range(1, count).ToList(), 1, Start));
    }

    [Fact]
    public void Shuffle_keeps_same_elements()
    {
        var items = Enumerable.Range(1, 16).ToList();
        var shuffled = FixtureGenerator.Shuffle(items);
        Assert.Equal(items, shuffled.OrderBy(x => x));
    }
}
