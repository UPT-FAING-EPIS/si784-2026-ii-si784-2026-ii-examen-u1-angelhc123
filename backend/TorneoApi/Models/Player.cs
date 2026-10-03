namespace TorneoApi.Models;

public class Player
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public int? JerseyNumber { get; set; }
    public string? Position { get; set; }
    public DateTime? BirthDate { get; set; }

    public int TeamId { get; set; }
    public Team? Team { get; set; }
}
