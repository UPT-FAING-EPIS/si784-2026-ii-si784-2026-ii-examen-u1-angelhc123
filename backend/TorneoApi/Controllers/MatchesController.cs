using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TorneoApi.Data;
using TorneoApi.Dtos;
using TorneoApi.Extensions;
using TorneoApi.Models;

namespace TorneoApi.Controllers;

[Route("matches")]
public class MatchesController(AppDbContext db) : ApiControllerBase
{
    private const string OrganizerRoles = "Organizer,Admin";

    /// <summary>Lista partidos filtrando por torneo, equipo, dueño de equipo o rango de fechas.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<MatchDto>>> GetAll(
        [FromQuery] int? tournamentId, [FromQuery] int? teamId, [FromQuery] int? userId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = MatchesQuery();
        if (tournamentId.HasValue) query = query.Where(m => m.TournamentId == tournamentId.Value);
        if (teamId.HasValue) query = query.Where(m => m.HomeTeamId == teamId.Value || m.AwayTeamId == teamId.Value);
        if (userId.HasValue) query = query.Where(m => m.HomeTeam!.OwnerId == userId.Value || m.AwayTeam!.OwnerId == userId.Value);
        if (from.HasValue)
        {
            var f = ToUtc(from.Value);
            query = query.Where(m => m.ScheduledAt >= f);
        }
        if (to.HasValue)
        {
            var t = ToUtc(to.Value);
            query = query.Where(m => m.ScheduledAt <= t);
        }

        var list = await query.OrderBy(m => m.ScheduledAt).ThenBy(m => m.Round).ToListAsync();
        return Ok(list.Select(m => m.ToDto()));
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<MatchDto>> GetById(int id)
    {
        var m = await MatchesQuery().FirstOrDefaultAsync(x => x.Id == id);
        return m is null ? NotFoundProblem("Partido no encontrado.") : Ok(m.ToDto());
    }

    /// <summary>Programa un partido manualmente.</summary>
    [HttpPost]
    [Authorize(Roles = OrganizerRoles)]
    [ProducesResponseType<MatchDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<MatchDto>> Create(MatchRequest request)
    {
        var t = await db.Tournaments.Include(x => x.Registrations).FirstOrDefaultAsync(x => x.Id == request.TournamentId);
        if (t is null) return NotFoundProblem("Torneo no encontrado.");
        if (!CanManage(t)) return Forbidden();
        if (t.Status == TournamentStatus.Finished) return BadRule("El torneo ya finalizó.");

        var approved = t.Registrations.Where(r => r.Status == RegistrationStatus.Approved).Select(r => r.TeamId).ToHashSet();
        if (!approved.Contains(request.HomeTeamId) || !approved.Contains(request.AwayTeamId))
            return BadRule("Ambos equipos deben estar inscritos y aprobados en el torneo.");

        var date = request.ScheduledAt.Date;
        if (date < t.StartDate.Date || date > t.EndDate.Date)
            return BadRule("La fecha del partido debe estar dentro de las fechas del torneo.");

        var match = new Match
        {
            TournamentId = t.Id, HomeTeamId = request.HomeTeamId, AwayTeamId = request.AwayTeamId,
            ScheduledAt = request.ScheduledAt, Round = request.Round, Venue = request.Venue?.Trim()
        };
        db.Matches.Add(match);
        if (t.Status != TournamentStatus.InProgress) t.Status = TournamentStatus.InProgress;
        await db.SaveChangesAsync();

        var created = await MatchesQuery().FirstAsync(x => x.Id == match.Id);
        return CreatedAtAction(nameof(GetById), new { id = match.Id }, created.ToDto());
    }

    /// <summary>Reprograma fecha y sede.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<MatchDto>> Update(int id, MatchUpdateRequest request)
    {
        var m = await MatchesQuery().FirstOrDefaultAsync(x => x.Id == id);
        if (m is null) return NotFoundProblem("Partido no encontrado.");
        if (!CanManage(m.Tournament!)) return Forbidden();
        if (m.Status == MatchStatus.Played) return BadRule("No se puede reprogramar un partido ya jugado.");

        m.ScheduledAt = request.ScheduledAt;
        m.Venue = request.Venue?.Trim();
        await db.SaveChangesAsync();
        return Ok(m.ToDto());
    }

    /// <summary>Registra el resultado de un partido.</summary>
    [HttpPut("{id:int}/result")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<MatchDto>> SetResult(int id, MatchResultRequest request)
    {
        var m = await MatchesQuery().FirstOrDefaultAsync(x => x.Id == id);
        if (m is null) return NotFoundProblem("Partido no encontrado.");
        if (!CanManage(m.Tournament!)) return Forbidden();
        if (m.Status == MatchStatus.Cancelled) return BadRule("El partido está cancelado.");

        if (m.Tournament!.Format == TournamentFormat.Knockout && request.HomeScore == request.AwayScore)
            return BadRule("En eliminación directa no se permiten empates.");

        if (m.Tournament.Format == TournamentFormat.Knockout && m.Status == MatchStatus.Played &&
            await db.Matches.AnyAsync(x => x.TournamentId == m.TournamentId && x.Round > m.Round))
            return BadRule("No se puede modificar: la siguiente ronda ya fue generada.");

        m.HomeScore = request.HomeScore;
        m.AwayScore = request.AwayScore;
        m.Status = MatchStatus.Played;
        await db.SaveChangesAsync();
        return Ok(m.ToDto());
    }

    [HttpPatch("{id:int}/cancel")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<ActionResult<MatchDto>> Cancel(int id)
    {
        var m = await MatchesQuery().FirstOrDefaultAsync(x => x.Id == id);
        if (m is null) return NotFoundProblem("Partido no encontrado.");
        if (!CanManage(m.Tournament!)) return Forbidden();
        if (m.Status == MatchStatus.Played) return BadRule("No se puede cancelar un partido ya jugado.");

        m.Status = MatchStatus.Cancelled;
        await db.SaveChangesAsync();
        return Ok(m.ToDto());
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = OrganizerRoles)]
    public async Task<IActionResult> Delete(int id)
    {
        var m = await db.Matches.Include(x => x.Tournament).FirstOrDefaultAsync(x => x.Id == id);
        if (m is null) return NotFoundProblem("Partido no encontrado.");
        if (!CanManage(m.Tournament!)) return Forbidden();
        if (m.Status == MatchStatus.Played) return BadRule("No se puede eliminar un partido ya jugado.");

        db.Matches.Remove(m);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>El model binding convierte fechas ISO con 'Z' a hora local; se normalizan a UTC.</summary>
    private static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Local => value.ToUniversalTime(),
        DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        _ => value
    };

    private IQueryable<Match> MatchesQuery() =>
        db.Matches.Include(m => m.Tournament).Include(m => m.HomeTeam).Include(m => m.AwayTeam);
}
