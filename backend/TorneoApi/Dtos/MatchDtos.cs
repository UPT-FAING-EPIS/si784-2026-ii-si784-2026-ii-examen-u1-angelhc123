using System.ComponentModel.DataAnnotations;

namespace TorneoApi.Dtos;

public class MatchRequest : IValidatableObject
{
    [Range(1, int.MaxValue, ErrorMessage = "Debe indicar el torneo.")]
    public int TournamentId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Debe indicar el equipo local.")]
    public int HomeTeamId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Debe indicar el equipo visitante.")]
    public int AwayTeamId { get; set; }

    [Required(ErrorMessage = "La fecha del partido es obligatoria.")]
    public DateTime ScheduledAt { get; set; }

    [Range(1, 100, ErrorMessage = "La jornada debe estar entre 1 y 100.")]
    public int Round { get; set; } = 1;

    [StringLength(120)]
    public string? Venue { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (HomeTeamId == AwayTeamId)
            yield return new ValidationResult("Un equipo no puede jugar contra sí mismo.", [nameof(AwayTeamId)]);
    }
}

public class MatchUpdateRequest
{
    [Required(ErrorMessage = "La fecha del partido es obligatoria.")]
    public DateTime ScheduledAt { get; set; }

    [StringLength(120)]
    public string? Venue { get; set; }
}

public class MatchResultRequest
{
    [Range(0, 999, ErrorMessage = "El marcador debe estar entre 0 y 999.")]
    public int HomeScore { get; set; }

    [Range(0, 999, ErrorMessage = "El marcador debe estar entre 0 y 999.")]
    public int AwayScore { get; set; }
}

public record MatchDto(
    int Id, int TournamentId, string TournamentName, int Round, DateTime ScheduledAt, string? Venue, string Status,
    int HomeTeamId, string HomeTeamName, int AwayTeamId, string AwayTeamName, int? HomeScore, int? AwayScore);
