using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TorneoApi.Data;
using TorneoApi.Dtos;
using TorneoApi.Extensions;
using TorneoApi.Models;
using TorneoApi.Services;

namespace TorneoApi.Controllers;

[Route("auth")]
public class AuthController(AppDbContext db, IPasswordHasher<User> hasher, ITokenService tokens) : ApiControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (request.Role == UserRole.Admin)
            return BadRule("No se puede registrar un usuario administrador.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return ConflictProblem("Ya existe una cuenta con ese correo.");

        var user = new User { FullName = request.FullName.Trim(), Email = email, Role = request.Role };
        user.PasswordHash = hasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, BuildResponse(user));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null || hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
            return Fail(StatusCodes.Status401Unauthorized, "Correo o contraseña incorrectos.");

        return Ok(BuildResponse(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await db.Users.FindAsync(CurrentUserId);
        return user is null ? NotFoundProblem("Usuario no encontrado.") : Ok(user.ToDto());
    }

    private AuthResponse BuildResponse(User user)
    {
        var (token, expires) = tokens.CreateToken(user);
        return new AuthResponse(token, expires, user.ToDto());
    }
}
