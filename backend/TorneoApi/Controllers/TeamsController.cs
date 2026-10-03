using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TorneoApi.Data;
using TorneoApi.Dtos;
using TorneoApi.Extensions;
using TorneoApi.Models;

namespace TorneoApi.Controllers;

[Route("teams")]
public class TeamsController(AppDbContext db) : ApiControllerBase
{
    /// <summary>Lista equipos. Con userId devuelve los equipos de ese usuario.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<TeamDto>>> GetAll([FromQuery] int? userId, [FromQuery] string? search)
    {
        var query = TeamsQuery();
        if (userId.HasValue) query = query.Where(t => t.OwnerId == userId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t => t.Name.ToLower().Contains(term));
        }

        var teams = await query.OrderBy(t => t.Name).ToListAsync();
        return Ok(teams.Select(t => t.ToDto()));
    }

    /// <summary>Inscripciones de los equipos del usuario autenticado.</summary>
    [HttpGet("registrations")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<MyRegistrationDto>>> MyRegistrations()
    {
        var userId = CurrentUserId;
        var regs = await db.Registrations
            .Include(r => r.Team).Include(r => r.Tournament)
            .Where(r => r.Team!.OwnerId == userId)
            .OrderByDescending(r => r.RegisteredAt)
            .ToListAsync();

        return Ok(regs.Select(r => new MyRegistrationDto(
            r.Id, r.TournamentId, r.Tournament!.Name, r.Tournament.Status.ToString(),
            r.TeamId, r.Team!.Name, r.Status.ToString(), r.RegisteredAt)));
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<TeamDto>> GetById(int id)
    {
        var team = await TeamsQuery().FirstOrDefaultAsync(t => t.Id == id);
        return team is null ? NotFoundProblem("Equipo no encontrado.") : Ok(team.ToDto());
    }

    [HttpPost]
    [Authorize]
    [ProducesResponseType<TeamDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<TeamDto>> Create(TeamRequest request)
    {
        var name = request.Name.Trim();
        if (await NameTaken(name, null))
            return ConflictProblem("Ya existe un equipo con ese nombre.");

        var team = new Team { Name = name, City = request.City?.Trim(), LogoUrl = request.LogoUrl, OwnerId = CurrentUserId };
        db.Teams.Add(team);
        await db.SaveChangesAsync();

        var created = await TeamsQuery().FirstAsync(t => t.Id == team.Id);
        return CreatedAtAction(nameof(GetById), new { id = team.Id }, created.ToDto());
    }

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<ActionResult<TeamDto>> Update(int id, TeamRequest request)
    {
        var team = await TeamsQuery().FirstOrDefaultAsync(t => t.Id == id);
        if (team is null) return NotFoundProblem("Equipo no encontrado.");
        if (!CanManage(team)) return Forbidden();

        var name = request.Name.Trim();
        if (await NameTaken(name, id))
            return ConflictProblem("Ya existe un equipo con ese nombre.");

        team.Name = name;
        team.City = request.City?.Trim();
        team.LogoUrl = request.LogoUrl;
        await db.SaveChangesAsync();
        return Ok(team.ToDto());
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return NotFoundProblem("Equipo no encontrado.");
        if (!CanManage(team)) return Forbidden();

        if (await db.Matches.AnyAsync(m => m.HomeTeamId == id || m.AwayTeamId == id))
            return ConflictProblem("No se puede eliminar un equipo que ya tiene partidos programados.");

        db.Teams.Remove(team);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/players")]
    [Authorize]
    [ProducesResponseType<PlayerDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<PlayerDto>> AddPlayer(int id, PlayerRequest request)
    {
        var team = await db.Teams.Include(t => t.Players).FirstOrDefaultAsync(t => t.Id == id);
        if (team is null) return NotFoundProblem("Equipo no encontrado.");
        if (!CanManage(team)) return Forbidden();

        var error = ValidatePlayer(team, request, null);
        if (error is not null) return BadRule(error);

        var player = new Player
        {
            FullName = request.FullName.Trim(),
            JerseyNumber = request.JerseyNumber,
            Position = request.Position?.Trim(),
            BirthDate = request.BirthDate,
            TeamId = id
        };
        db.Players.Add(player);
        await db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, player.ToDto());
    }

    [HttpPut("{id:int}/players/{playerId:int}")]
    [Authorize]
    public async Task<ActionResult<PlayerDto>> UpdatePlayer(int id, int playerId, PlayerRequest request)
    {
        var team = await db.Teams.Include(t => t.Players).FirstOrDefaultAsync(t => t.Id == id);
        if (team is null) return NotFoundProblem("Equipo no encontrado.");
        if (!CanManage(team)) return Forbidden();

        var player = team.Players.FirstOrDefault(p => p.Id == playerId);
        if (player is null) return NotFoundProblem("Jugador no encontrado.");

        var error = ValidatePlayer(team, request, playerId);
        if (error is not null) return BadRule(error);

        player.FullName = request.FullName.Trim();
        player.JerseyNumber = request.JerseyNumber;
        player.Position = request.Position?.Trim();
        player.BirthDate = request.BirthDate;
        await db.SaveChangesAsync();
        return Ok(player.ToDto());
    }

    [HttpDelete("{id:int}/players/{playerId:int}")]
    [Authorize]
    public async Task<IActionResult> DeletePlayer(int id, int playerId)
    {
        var team = await db.Teams.FindAsync(id);
        if (team is null) return NotFoundProblem("Equipo no encontrado.");
        if (!CanManage(team)) return Forbidden();

        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId && p.TeamId == id);
        if (player is null) return NotFoundProblem("Jugador no encontrado.");

        db.Players.Remove(player);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private IQueryable<Team> TeamsQuery() => db.Teams.Include(t => t.Owner).Include(t => t.Players);

    private Task<bool> NameTaken(string name, int? exceptId)
    {
        var lower = name.ToLower();
        return db.Teams.AnyAsync(t => t.Name.ToLower() == lower && (exceptId == null || t.Id != exceptId));
    }

    private static string? ValidatePlayer(Team team, PlayerRequest request, int? exceptPlayerId)
    {
        if (request.BirthDate.HasValue && request.BirthDate.Value.Date > DateTime.UtcNow.Date)
            return "La fecha de nacimiento no puede ser futura.";

        if (request.JerseyNumber.HasValue &&
            team.Players.Any(p => p.JerseyNumber == request.JerseyNumber && p.Id != exceptPlayerId))
            return $"El número {request.JerseyNumber} ya está en uso en este equipo.";

        return null;
    }
}
