using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TorneoApi.Data;
using TorneoApi.Dtos;
using TorneoApi.Extensions;
using TorneoApi.Models;
using TorneoApi.Services;

namespace TorneoApi.Controllers;

[Route("tournaments")]
public class TournamentsController(AppDbContext db) : ApiControllerBase
{
    private const string OrganizerRoles = "Organizer,Admin";

    /// <summary>Lista torneos con filtros opcionales.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<TournamentSummaryDto>>> GetAll(
        [FromQuery] TournamentStatus? status, [FromQuery] string? sport,
        [FromQuery] string? search, [FromQuery] int? organizerId)
    {
        var query = db.Tournaments.Include(t => t.Organizer).Include(t => t.Registrations).AsQueryable();
        if (status.HasValue) query = query.Where(t => t.Status == status.Value);
        if (organizerId.HasValue) query = query.Where(t => t.OrganizerId == organizerId.Value);
        if (!string.IsNullOrWhiteSpace(sport))
        {
            var s = sport.Trim().ToLower();
            query = query.Where(t => t.Sport.ToLower() == s);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t => t.Name.ToLower().Contains(term) || t.Category.ToLower().Contains(term));
        }

        var list = await query.OrderBy(t => t.StartDate).ToListAsync();
        return Ok(list.Select(t => t.ToSummaryDto()));
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<TournamentDetailDto>> GetById(int id)
    {
        var t = await LoadTournament(id);
        return t is null ? NotFoundProblem("Torneo no encontrado.") : Ok(t.ToDetailDto());
    }

    [HttpPost]
    [Authorize(Roles = OrganizerRoles)]
    [ProducesResponseType<TournamentDetailDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<TournamentDetailDto>> Create(TournamentRequest request)
    {
        var tournament = new Tournament { OrganizerId = CurrentUserId, Status = TournamentStatus.RegistrationOpen };
        Apply(tournament, request);
        db.Tournaments.Add(tournament);
        await db.SaveChangesAsync();

        var created = await LoadTournament(tournament.Id);
        return CreatedAtAction(nameof(GetById), new { id = tournament.Id }, created!.ToDetailDto());
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<TournamentDetailDto>> Update(int id, TournamentRequest request)
    {
        var t = await LoadTournament(id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();

        if (t.Matches.Count > 0 && t.Format != request.Format)
            return BadRule("No se puede cambiar el formato de un torneo que ya tiene partidos.");

        var approved = t.Registrations.Count(r => r.Status == RegistrationStatus.Approved);
        if (request.MaxTeams < approved)
            return BadRule($"Ya hay {approved} equipos aprobados; el máximo no puede ser menor.");

        Apply(t, request);
        await db.SaveChangesAsync();
        return Ok(t.ToDetailDto());
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<TournamentDetailDto>> ChangeStatus(int id, TournamentStatusRequest request)
    {
        var t = await LoadTournament(id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();

        t.Status = request.Status;
        await db.SaveChangesAsync();
        return Ok(t.ToDetailDto());
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<IActionResult> Delete(int id)
    {
        var t = await db.Tournaments.FindAsync(id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();

        db.Tournaments.Remove(t);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ---------- Inscripciones ----------

    [HttpGet("{id:int}/registrations")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<RegistrationDto>>> GetRegistrations(int id)
    {
        if (!await db.Tournaments.AnyAsync(t => t.Id == id)) return NotFoundProblem("Torneo no encontrado.");
        var regs = await db.Registrations.Include(r => r.Team)
            .Where(r => r.TournamentId == id).OrderBy(r => r.RegisteredAt).ToListAsync();
        return Ok(regs.Select(r => r.ToDto()));
    }

    /// <summary>Inscribe un equipo propio en el torneo (queda pendiente de aprobación).</summary>
    [HttpPost("{id:int}/registrations")]
    [Authorize]
    [ProducesResponseType<RegistrationDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<RegistrationDto>> Register(int id, RegistrationRequest request)
    {
        var t = await db.Tournaments.Include(x => x.Registrations).FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (t.Status != TournamentStatus.RegistrationOpen)
            return BadRule("Las inscripciones de este torneo están cerradas.");

        var team = await db.Teams.FindAsync(request.TeamId);
        if (team is null) return NotFoundProblem("Equipo no encontrado.");
        if (!CanManage(team)) return Forbidden("Solo puede inscribir equipos propios.");

        if (t.Registrations.Any(r => r.TeamId == team.Id))
            return ConflictProblem("El equipo ya está inscrito en este torneo.");
        if (t.Registrations.Count(r => r.Status != RegistrationStatus.Rejected) >= t.MaxTeams)
            return BadRule("El torneo alcanzó el número máximo de equipos.");

        var reg = new Registration { TournamentId = id, TeamId = team.Id, Team = team };
        db.Registrations.Add(reg);
        await db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, reg.ToDto());
    }

    [HttpPut("{id:int}/registrations/{registrationId:int}")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<RegistrationDto>> ChangeRegistrationStatus(int id, int registrationId, RegistrationStatusRequest request)
    {
        var t = await db.Tournaments.Include(x => x.Registrations).ThenInclude(r => r.Team)
            .Include(x => x.Matches).FirstOrDefaultAsync(x => x.Id == id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();

        var reg = t.Registrations.FirstOrDefault(r => r.Id == registrationId);
        if (reg is null) return NotFoundProblem("Inscripción no encontrada.");

        if (t.Matches.Count > 0 && reg.Status == RegistrationStatus.Approved && request.Status != RegistrationStatus.Approved)
            return BadRule("No se puede retirar un equipo cuando el fixture ya fue generado.");

        if (request.Status == RegistrationStatus.Approved && reg.Status != RegistrationStatus.Approved &&
            t.Registrations.Count(r => r.Status == RegistrationStatus.Approved) >= t.MaxTeams)
            return BadRule("El torneo ya tiene el máximo de equipos aprobados.");

        reg.Status = request.Status;
        await db.SaveChangesAsync();
        return Ok(reg.ToDto());
    }

    [HttpDelete("{id:int}/registrations/{registrationId:int}")]
    [Authorize]
    public async Task<IActionResult> CancelRegistration(int id, int registrationId)
    {
        var reg = await db.Registrations.Include(r => r.Team).Include(r => r.Tournament)
            .FirstOrDefaultAsync(r => r.Id == registrationId && r.TournamentId == id);
        if (reg is null) return NotFoundProblem("Inscripción no encontrada.");
        if (!CanManage(reg.Team!) && !CanManage(reg.Tournament!)) return Forbidden();

        var hasMatches = await db.Matches.AnyAsync(m =>
            m.TournamentId == id && (m.HomeTeamId == reg.TeamId || m.AwayTeamId == reg.TeamId));
        if (hasMatches) return BadRule("El equipo ya tiene partidos en este torneo; no se puede retirar.");

        db.Registrations.Remove(reg);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ---------- Fixture ----------

    /// <summary>Genera automáticamente el fixture con los equipos aprobados.</summary>
    [HttpPost("{id:int}/fixture")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<IEnumerable<MatchDto>>> GenerateFixture(int id, FixtureRequest request)
    {
        var t = await LoadTournament(id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();
        if (t.Matches.Count > 0) return ConflictProblem("El torneo ya tiene partidos. Elimine el fixture antes de regenerarlo.");

        var teamIds = t.Registrations.Where(r => r.Status == RegistrationStatus.Approved).Select(r => r.TeamId).ToList();
        if (teamIds.Count < 2) return BadRule("Se necesitan al menos 2 equipos aprobados.");

        // Sin fecha explícita: día de inicio a las 20:00 UTC (15:00 en UTC-5).
        var firstDate = request.FirstRoundDate ?? t.StartDate.Date.AddHours(20);
        IReadOnlyList<FixtureMatch> fixture;
        if (t.Format == TournamentFormat.RoundRobin)
        {
            fixture = FixtureGenerator.RoundRobin(teamIds, firstDate, request.DaysBetweenRounds);
        }
        else
        {
            if (!FixtureGenerator.IsPowerOfTwo(teamIds.Count))
                return BadRule($"Eliminación directa requiere 2, 4, 8, 16... equipos aprobados (hay {teamIds.Count}).");
            fixture = FixtureGenerator.KnockoutRound(FixtureGenerator.Shuffle(teamIds), 1, firstDate);
        }

        var matches = fixture.Select(f => new Match
        {
            TournamentId = id, Round = f.Round, HomeTeamId = f.HomeTeamId, AwayTeamId = f.AwayTeamId,
            ScheduledAt = f.ScheduledAt, Venue = request.Venue
        }).ToList();

        db.Matches.AddRange(matches);
        t.Status = TournamentStatus.InProgress;
        await db.SaveChangesAsync();

        return Ok(await MatchesOf(id));
    }

    /// <summary>Eliminación directa: genera la siguiente ronda con los ganadores de la última.</summary>
    [HttpPost("{id:int}/fixture/next-round")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<IEnumerable<MatchDto>>> NextRound(int id, FixtureRequest request)
    {
        var t = await LoadTournament(id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();
        if (t.Format != TournamentFormat.Knockout) return BadRule("Solo aplica a torneos de eliminación directa.");
        if (t.Matches.Count == 0) return BadRule("Primero genere el fixture.");

        var lastRound = t.Matches.Max(m => m.Round);
        var current = t.Matches.Where(m => m.Round == lastRound && m.Status != MatchStatus.Cancelled).ToList();
        if (current.Any(m => m.Status != MatchStatus.Played))
            return BadRule("Todos los partidos de la ronda actual deben tener resultado.");

        var winners = current.Select(m => m.HomeScore > m.AwayScore ? m.HomeTeamId : m.AwayTeamId).ToList();
        if (winners.Count == 1)
        {
            t.Status = TournamentStatus.Finished;
            await db.SaveChangesAsync();
            return BadRule("El torneo ya tiene campeón; se marcó como finalizado.");
        }

        var date = request.FirstRoundDate ?? current.Max(m => m.ScheduledAt).AddDays(request.DaysBetweenRounds);
        var next = FixtureGenerator.KnockoutRound(winners, lastRound + 1, date);
        db.Matches.AddRange(next.Select(f => new Match
        {
            TournamentId = id, Round = f.Round, HomeTeamId = f.HomeTeamId, AwayTeamId = f.AwayTeamId,
            ScheduledAt = f.ScheduledAt, Venue = request.Venue
        }));
        await db.SaveChangesAsync();
        return Ok(await MatchesOf(id));
    }

    [HttpDelete("{id:int}/fixture")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<IActionResult> DeleteFixture(int id)
    {
        var t = await LoadTournament(id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();
        if (t.Matches.Any(m => m.Status == MatchStatus.Played))
            return BadRule("No se puede eliminar el fixture porque ya hay partidos jugados.");

        db.Matches.RemoveRange(t.Matches);
        t.Status = TournamentStatus.RegistrationOpen;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ---------- Estadísticas y reportes ----------

    [HttpGet("{id:int}/standings")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<StandingDto>>> Standings(int id)
    {
        var t = await LoadTournament(id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        return Ok(ComputeStandings(t));
    }

    [HttpGet("{id:int}/report")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<TournamentReportDto>> Report(int id)
    {
        var t = await LoadTournament(id);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();

        var standings = ComputeStandings(t);
        var played = t.Matches.Where(m => m.Status == MatchStatus.Played).ToList();
        var totalGoals = played.Sum(m => (m.HomeScore ?? 0) + (m.AwayScore ?? 0));
        var topScoring = standings.Where(s => s.Played > 0).OrderByDescending(s => s.GoalsFor).FirstOrDefault();
        var bestDefense = standings.Where(s => s.Played > 0).OrderBy(s => s.GoalsAgainst).FirstOrDefault();

        return Ok(new TournamentReportDto(
            t.Id, t.Name,
            t.Registrations.Count,
            t.Registrations.Count(r => r.Status == RegistrationStatus.Approved),
            t.Registrations.Count(r => r.Status == RegistrationStatus.Pending),
            t.Matches.Count, played.Count, t.Matches.Count(m => m.Status == MatchStatus.Scheduled),
            totalGoals, played.Count == 0 ? 0 : Math.Round((double)totalGoals / played.Count, 2),
            standings.FirstOrDefault(s => s.Played > 0),
            topScoring?.TeamName, topScoring?.GoalsFor ?? 0, bestDefense?.TeamName));
    }

    private static IReadOnlyList<StandingDto> ComputeStandings(Tournament t)
    {
        var teams = t.Registrations.Where(r => r.Status == RegistrationStatus.Approved && r.Team != null).Select(r => r.Team!);
        return StandingsCalculator.Calculate(teams, t.Matches);
    }

    private Task<Tournament?> LoadTournament(int id) =>
        db.Tournaments
            .Include(t => t.Organizer)
            .Include(t => t.Registrations).ThenInclude(r => r.Team)
            .Include(t => t.Matches)
            .AsSplitQuery()
            .FirstOrDefaultAsync(t => t.Id == id);

    private async Task<IEnumerable<MatchDto>> MatchesOf(int tournamentId)
    {
        var list = await db.Matches.Include(m => m.Tournament).Include(m => m.HomeTeam).Include(m => m.AwayTeam)
            .Where(m => m.TournamentId == tournamentId)
            .OrderBy(m => m.Round).ThenBy(m => m.ScheduledAt).ToListAsync();
        return list.Select(m => m.ToDto());
    }

    private static void Apply(Tournament t, TournamentRequest r)
    {
        t.Name = r.Name.Trim();
        t.Description = r.Description?.Trim();
        t.Sport = r.Sport.Trim();
        t.Category = r.Category.Trim();
        t.Rules = r.Rules?.Trim();
        t.Format = r.Format;
        t.MaxTeams = r.MaxTeams;
        t.StartDate = r.StartDate;
        t.EndDate = r.EndDate;
    }
}
