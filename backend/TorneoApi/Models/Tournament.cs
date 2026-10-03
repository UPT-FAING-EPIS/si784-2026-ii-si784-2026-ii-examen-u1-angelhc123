namespace TorneoApi.Models;

public class Tournament
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Sport { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Rules { get; set; }
    public TournamentFormat Format { get; set; } = TournamentFormat.RoundRobin;
    public TournamentStatus Status { get; set; } = TournamentStatus.RegistrationOpen;
    public int MaxTeams { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int OrganizerId { get; set; }
    public User? Organizer { get; set; }

    public ICollection<Registration> Registrations { get; set; } = new List<Registration>();
    public ICollection<Match> Matches { get; set; } = new List<Match>();
}
