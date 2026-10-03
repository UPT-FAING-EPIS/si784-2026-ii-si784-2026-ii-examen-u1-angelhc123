using System.Security.Cryptography;

namespace TorneoApi.Services;

public record FixtureMatch(int Round, int HomeTeamId, int AwayTeamId, DateTime ScheduledAt);

public static class FixtureGenerator
{
    /// <summary>
    /// Todos contra todos (método del círculo). Con número impar de equipos,
    /// cada jornada un equipo descansa.
    /// </summary>
    public static IReadOnlyList<FixtureMatch> RoundRobin(IReadOnlyList<int> teamIds, DateTime firstRoundDate, int daysBetweenRounds)
    {
        if (teamIds.Count < 2)
            throw new ArgumentException("Se necesitan al menos 2 equipos para generar el fixture.", nameof(teamIds));

        const int bye = 0;
        var teams = teamIds.ToList();
        if (teams.Count % 2 != 0) teams.Add(bye);

        var rounds = teams.Count - 1;
        var half = teams.Count / 2;
        var result = new List<FixtureMatch>();

        for (var round = 0; round < rounds; round++)
        {
            var date = firstRoundDate.AddDays(round * daysBetweenRounds);
            for (var i = 0; i < half; i++)
            {
                var home = teams[i];
                var away = teams[teams.Count - 1 - i];
                if (home == bye || away == bye) continue;

                // Alterna localía para que el equipo fijo no sea siempre local.
                if (i == 0 && round % 2 == 1) (home, away) = (away, home);
                result.Add(new FixtureMatch(round + 1, home, away, date));
            }

            // Rotación: el primero queda fijo, el resto gira una posición.
            var last = teams[^1];
            teams.RemoveAt(teams.Count - 1);
            teams.Insert(1, last);
        }

        return result;
    }

    /// <summary>Empareja equipos de dos en dos para una ronda de eliminación directa.</summary>
    public static IReadOnlyList<FixtureMatch> KnockoutRound(IReadOnlyList<int> teamIds, int round, DateTime date)
    {
        if (teamIds.Count < 2 || !IsPowerOfTwo(teamIds.Count))
            throw new ArgumentException("En eliminación directa el número de equipos debe ser potencia de 2.", nameof(teamIds));

        var result = new List<FixtureMatch>();
        for (var i = 0; i < teamIds.Count; i += 2)
            result.Add(new FixtureMatch(round, teamIds[i], teamIds[i + 1], date));
        return result;
    }

    public static bool IsPowerOfTwo(int n) => n > 0 && (n & (n - 1)) == 0;

    /// <summary>Mezcla aleatoria (Fisher-Yates) usando un generador criptográfico.</summary>
    public static List<int> Shuffle(IEnumerable<int> items)
    {
        var list = items.ToList();
        for (var i = list.Count - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
        return list;
    }
}
