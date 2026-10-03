namespace TorneoApi.Models;

public class Team
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? LogoUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int OwnerId { get; set; }
    public User? Owner { get; set; }

    public ICollection<Player> Players { get; set; } = new List<Player>();
    public ICollection<Registration> Registrations { get; set; } = new List<Registration>();
}
