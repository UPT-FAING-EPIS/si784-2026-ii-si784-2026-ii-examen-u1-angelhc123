using System.ComponentModel.DataAnnotations;

namespace TorneoApi.Dtos;

public class TeamRequest
{
    [Required(ErrorMessage = "El nombre del equipo es obligatorio.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 100 caracteres.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(80)]
    public string? City { get; set; }

    [Url(ErrorMessage = "La URL del logo no es válida.")]
    [StringLength(300)]
    public string? LogoUrl { get; set; }
}

public class PlayerRequest
{
    [Required(ErrorMessage = "El nombre del jugador es obligatorio.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 100 caracteres.")]
    public string FullName { get; set; } = string.Empty;

    [Range(0, 99, ErrorMessage = "El número de camiseta debe estar entre 0 y 99.")]
    public int? JerseyNumber { get; set; }

    [StringLength(40)]
    public string? Position { get; set; }

    public DateTime? BirthDate { get; set; }
}

public record MyRegistrationDto(
    int Id, int TournamentId, string TournamentName, string TournamentStatus,
    int TeamId, string TeamName, string Status, DateTime RegisteredAt);

public record PlayerDto(int Id, string FullName, int? JerseyNumber, string? Position, DateTime? BirthDate);

public record TeamDto(
    int Id, string Name, string? City, string? LogoUrl, int OwnerId, string OwnerName,
    IReadOnlyList<PlayerDto> Players);
