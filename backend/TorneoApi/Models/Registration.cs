namespace TorneoApi.Models;

/// <summary>Inscripción de un equipo en un torneo.</summary>
public class Registration
{
    public int Id { get; set; }
    public RegistrationStatus Status { get; set; } = RegistrationStatus.Pending;
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

    public int TournamentId { get; set; }
    public Tournament? Tournament { get; set; }

    public int TeamId { get; set; }
    public Team? Team { get; set; }
}
