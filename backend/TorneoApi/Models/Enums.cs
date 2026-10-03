namespace TorneoApi.Models;

public enum UserRole
{
    Player = 0,
    Organizer = 1,
    Admin = 2
}

public enum TournamentFormat
{
    RoundRobin = 0,
    Knockout = 1
}

public enum TournamentStatus
{
    Draft = 0,
    RegistrationOpen = 1,
    InProgress = 2,
    Finished = 3
}

public enum RegistrationStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public enum MatchStatus
{
    Scheduled = 0,
    Played = 1,
    Cancelled = 2
}
