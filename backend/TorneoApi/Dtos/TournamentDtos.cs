using System.ComponentModel.DataAnnotations;
using TorneoApi.Models;

namespace TorneoApi.Dtos;

public class TournamentRequest : IValidatableObject
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(120, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 120 caracteres.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [Required(ErrorMessage = "El deporte es obligatorio.")]
    [StringLength(50)]
    public string Sport { get; set; } = string.Empty;

    [Required(ErrorMessage = "La categoría es obligatoria.")]
    [StringLength(50)]
    public string Category { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? Rules { get; set; }

    [EnumDataType(typeof(TournamentFormat))]
    public TournamentFormat Format { get; set; } = TournamentFormat.RoundRobin;

    [Range(2, 64, ErrorMessage = "El número de equipos debe estar entre 2 y 64.")]
    public int MaxTeams { get; set; } = 8;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (EndDate < StartDate)
            yield return new ValidationResult("La fecha de fin debe ser posterior a la fecha de inicio.",
                [nameof(EndDate)]);

        if (Format == TournamentFormat.Knockout && (MaxTeams & (MaxTeams - 1)) != 0)
            yield return new ValidationResult("En eliminación directa el máximo de equipos debe ser potencia de 2 (2, 4, 8, 16...).",
                [nameof(MaxTeams)]);
    }
}

public class TournamentStatusRequest
{
    [EnumDataType(typeof(TournamentStatus))]
    public TournamentStatus Status { get; set; }
}

public record TournamentSummaryDto(
    int Id, string Name, string Sport, string Category, string Format, string Status,
    int MaxTeams, int ApprovedTeams, DateTime StartDate, DateTime EndDate,
    int OrganizerId, string OrganizerName);

public record TournamentDetailDto(
    int Id, string Name, string? Description, string Sport, string Category, string? Rules,
    string Format, string Status, int MaxTeams, DateTime StartDate, DateTime EndDate,
    int OrganizerId, string OrganizerName,
    IReadOnlyList<RegistrationDto> Registrations, int MatchCount);

public class RegistrationRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar un equipo.")]
    public int TeamId { get; set; }
}

public class RegistrationStatusRequest
{
    [EnumDataType(typeof(RegistrationStatus))]
    public RegistrationStatus Status { get; set; }
}

public record RegistrationDto(int Id, int TeamId, string TeamName, string Status, DateTime RegisteredAt);

public class FixtureRequest
{
    /// <summary>Fecha de la primera jornada. Si no se envía, se usa la fecha de inicio del torneo.</summary>
    public DateTime? FirstRoundDate { get; set; }

    [Range(1, 60, ErrorMessage = "Los días entre jornadas deben estar entre 1 y 60.")]
    public int DaysBetweenRounds { get; set; } = 7;

    [StringLength(120)]
    public string? Venue { get; set; }
}

public record StandingDto(
    int Position, int TeamId, string TeamName, int Played, int Won, int Drawn, int Lost,
    int GoalsFor, int GoalsAgainst, int GoalDifference, int Points);

public record TournamentReportDto(
    int TournamentId, string TournamentName, int RegisteredTeams, int ApprovedTeams, int PendingRegistrations,
    int TotalMatches, int PlayedMatches, int ScheduledMatches, int TotalGoals, double AverageGoalsPerMatch,
    StandingDto? Leader, string? TopScoringTeam, int TopScoringTeamGoals, string? BestDefenseTeam);
