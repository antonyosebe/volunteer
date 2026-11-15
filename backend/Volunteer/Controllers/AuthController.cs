using System.Net.Mail;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Volunteer;

namespace Volunteer.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserController _users;
    private readonly SessionStore _sessions;
    private readonly PasswordHasher<object> _passwords = new();

    public AuthController(UserController users, SessionStore sessions)
    {
        _users = users;
        _sessions = sessions;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var fullName = request.FullName?.Trim() ?? "";
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var password = request.Password ?? "";
        var account = request.Account?.Trim().ToLowerInvariant() ?? "volunteer";

        var missing = new List<string>();
        if (fullName.Length == 0) missing.Add(account == "organisation" ? "organisation name" : "full name");
        if (email.Length == 0 || !MailAddress.TryCreate(email, out _)) missing.Add("email");
        if (password.Length < 8) missing.Add("a password of at least 8 characters");
        if (missing.Count > 0)
        {
            return BadRequest(new { message = $"Add {string.Join(", ", missing)}." });
        }

        if (account is not ("volunteer" or "organisation"))
        {
            return BadRequest(new { message = "Choose a volunteer or an organisation account." });
        }

        var clientType = account == "organisation" ? "org_admin" : "volunteer";
        var hash = _passwords.HashPassword(new object(), password);

        Guid clientId;
        try
        {
            clientId = await _users.AddEditUser(null, email, hash, fullName, clientType, isActive: true);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "An account with this email already exists." });
        }

        return Created($"/api/clients/{clientId}", new { message = "Account created.", clientId });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var password = request.Password ?? "";
        if (email.Length == 0 || password.Length == 0)
        {
            return BadRequest(new { message = "Enter your email or username and password." });
        }

        var account = await _users.GetUser(email);
        if (account is null)
        {
            return await LoginStaff(email, password);
        }

        var result = _passwords.VerifyHashedPassword(new object(), account.PasswordHash, password);
        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Email or password is incorrect." });
        }

        if (!account.IsActive)
        {
            return Unauthorized(new { message = "This account is not active." });
        }

        var session = _sessions.Create(account.ClientId, null, email, account.FullName, account.ClientType);
        return Ok(new
        {
            message = "Signed in.",
            sessionId = session.Id,
            clientId = account.ClientId,
            email,
            fullName = account.FullName,
            clientType = account.ClientType
        });
    }

    [HttpPost("touch")]
    public IActionResult Touch()
    {
        var session = _sessions.Touch(Request.Headers["X-Volunteer-Session"].ToString());
        if (session is null)
        {
            return Unauthorized(new { message = "Your session has ended. Log in again." });
        }

        return Ok(new { message = "Session renewed." });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        _sessions.Remove(Request.Headers["X-Volunteer-Session"].ToString());
        return NoContent();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var password = request.Password ?? "";
        if (email.Length == 0 || !MailAddress.TryCreate(email, out _))
        {
            return BadRequest(new { message = "Enter the email on your account." });
        }

        if (password.Length < 8)
        {
            return BadRequest(new { message = "Use a password of at least 8 characters." });
        }

        var hash = _passwords.HashPassword(new object(), password);
        try
        {
            await _users.AddEditUser(null, email, hash, null, null);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = "No account uses that email." });
        }

        return Ok(new { message = "Password updated. You can log in." });
    }

    private async Task<IActionResult> LoginStaff(string email, string password)
    {
        var staff = await _users.GetStaff(email);
        if (staff is null)
        {
            return Unauthorized(new { message = "Email or password is incorrect." });
        }

        var result = _passwords.VerifyHashedPassword(new object(), staff.PasswordHash, password);
        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Email or password is incorrect." });
        }

        if (!staff.IsActive)
        {
            return Unauthorized(new { message = "This account is not active." });
        }

        var session = _sessions.Create(null, staff.UserId, email, staff.FullName, "admin");
        return Ok(new
        {
            message = "Signed in.",
            sessionId = session.Id,
            userId = staff.UserId,
            email,
            fullName = staff.FullName,
            clientType = "admin"
        });
    }
}

public sealed class RegisterRequest
{
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? Account { get; set; }
}

public sealed class LoginRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
    public bool Remember { get; set; }
}

public sealed class ResetPasswordRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}
