using System.ComponentModel.DataAnnotations;
using TorneoApi.Models;

namespace TorneoApi.Dtos;

public class RegisterRequest
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 100 caracteres.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El correo es obligatorio.")]
    [EmailAddress(ErrorMessage = "El correo no es válido.")]
    [StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es obligatoria.")]
    [StringLength(64, MinimumLength = 8, ErrorMessage = "La contraseña debe tener entre 8 y 64 caracteres.")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$",
        ErrorMessage = "La contraseña debe tener al menos una mayúscula, una minúscula y un número.")]
    public string Password { get; set; } = string.Empty;

    /// <summary>Solo se permite Player u Organizer al registrarse.</summary>
    [EnumDataType(typeof(UserRole))]
    public UserRole Role { get; set; } = UserRole.Player;
}

public class LoginRequest
{
    [Required(ErrorMessage = "El correo es obligatorio.")]
    [EmailAddress(ErrorMessage = "El correo no es válido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es obligatoria.")]
    public string Password { get; set; } = string.Empty;
}

public record UserDto(int Id, string FullName, string Email, string Role);

public record AuthResponse(string Token, DateTime ExpiresAt, UserDto User);
