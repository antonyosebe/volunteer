using System.Net.Mail;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace Volunteer.Controllers;

[ApiController]
[Route("api/admin")]
public class SettingsController : ControllerBase
{
    private const long MaxLogoBytes = 2 * 1024 * 1024;

    private static readonly Dictionary<string, string> LogoTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif"
    };

    private readonly string _connectionString;
    private readonly IWebHostEnvironment _environment;
    private readonly PasswordHasher<object> _passwords = new();

    public SettingsController(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Database connection string is missing.");
        _environment = environment;
    }

    [HttpGet("staff")]
    public async Task<IActionResult> Staff()
    {
        return Ok(await ReadRows("SELECT * FROM p_liststaff()", reader => new
        {
            userId = reader.GetGuid(0),
            email = reader.GetString(1),
            fullName = reader.GetString(2),
            isActive = reader.GetBoolean(3),
            roles = reader.GetString(4)
        }));
    }

    [HttpPost("staff")]
    public async Task<IActionResult> AddStaff([FromBody] StaffRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var fullName = request.FullName?.Trim() ?? "";
        var password = request.Password ?? "";
        var role = request.Role?.Trim().ToLowerInvariant() ?? "admin";
        if (fullName.Length == 0 || !MailAddress.TryCreate(email, out _) || password.Length < 8 || role.Length == 0)
        {
            return BadRequest(new { message = "Enter a name, email, role, and a password of at least 8 characters." });
        }

        var hash = _passwords.HashPassword(new object(), password);
        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand(
                "CALL p_addstaff(@Email, @PasswordHash, @FullName, @PrivilegeCode, @UserID)",
                connection);
            command.Parameters.Add(new NpgsqlParameter("Email", NpgsqlDbType.Varchar) { Value = email });
            command.Parameters.Add(new NpgsqlParameter("PasswordHash", NpgsqlDbType.Text) { Value = hash });
            command.Parameters.Add(new NpgsqlParameter("FullName", NpgsqlDbType.Varchar) { Value = fullName });
            command.Parameters.Add(new NpgsqlParameter("PrivilegeCode", NpgsqlDbType.Varchar) { Value = role });
            command.Parameters.Add(new NpgsqlParameter("UserID", NpgsqlDbType.Uuid) { Value = DBNull.Value });
            await using var reader = await command.ExecuteReaderAsync();
            await reader.ReadAsync();
            await WriteAudit(request.UserId, "add", "staff", fullName);
            return Ok(new { message = "Admin account added.", userId = reader.GetGuid(0) });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "An account with this email already exists." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
    }

    [HttpPut("staff/{userId:guid}/active")]
    public async Task<IActionResult> SetStaffActive(Guid userId, [FromBody] ActiveRequest request)
    {
        if (request.IsActive is null)
        {
            return BadRequest(new { message = "Choose whether the account is active." });
        }

        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("CALL p_setstaffactive(@UserID, @IsActive)", connection);
            command.Parameters.Add(new NpgsqlParameter("UserID", NpgsqlDbType.Uuid) { Value = userId });
            command.Parameters.Add(new NpgsqlParameter("IsActive", NpgsqlDbType.Boolean) { Value = request.IsActive.Value });
            await command.ExecuteNonQueryAsync();
            await WriteAudit(request.UserId, request.IsActive.Value ? "activate" : "deactivate", "staff", userId.ToString());
            return Ok(new { message = request.IsActive.Value ? "Account activated." : "Account deactivated." });
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.InvalidParameterValue or PostgresErrorCodes.NoDataFound)
        {
            return BadRequest(new { message = ex.MessageText });
        }
    }

    [HttpGet("roles")]
    public async Task<IActionResult> Roles()
    {
        return Ok(await ReadRows("SELECT * FROM p_listprivileges()", reader => new
        {
            privilegeId = reader.GetInt16(0),
            code = reader.GetString(1),
            name = reader.GetString(2)
        }));
    }

    [HttpPost("roles")]
    public async Task<IActionResult> AddRole([FromBody] RoleRequest request)
    {
        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("CALL p_addprivilege(@Code, @Name)", connection);
            command.Parameters.Add(new NpgsqlParameter("Code", NpgsqlDbType.Varchar) { Value = (object?)request.Code ?? DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("Name", NpgsqlDbType.Varchar) { Value = (object?)request.Name ?? DBNull.Value });
            await command.ExecuteNonQueryAsync();
            await WriteAudit(request.UserId, "add", "role", request.Name ?? request.Code ?? "");
            return Ok(new { message = "Role added." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "That role already exists." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
    }

    [HttpGet("settings")]
    public async Task<IActionResult> Settings()
    {
        var rows = await ReadRows("SELECT * FROM p_listsettings()", reader => (reader.GetString(0), reader.GetString(1)));
        string Value(string key) => rows.FirstOrDefault(row => row.Item1 == key).Item2 ?? "";
        return Ok(new
        {
            siteName = Value("site_name"),
            supportEmail = Value("support_email"),
            tagline = Value("tagline"),
            primaryColor = Value("primary_color"),
            logoPath = Value("logo_path")
        });
    }

    [HttpGet("/api/branding")]
    public async Task<IActionResult> Branding()
    {
        var rows = await ReadRows("SELECT * FROM p_listsettings()", reader => (reader.GetString(0), reader.GetString(1)));
        string Value(string key) => rows.FirstOrDefault(row => row.Item1 == key).Item2 ?? "";
        return Ok(new
        {
            siteName = Value("site_name"),
            tagline = Value("tagline"),
            primaryColor = Value("primary_color"),
            logoPath = Value("logo_path")
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> SaveSettings([FromBody] ApplicationSettingsRequest request)
    {
        if (!MailAddress.TryCreate(request.SupportEmail?.Trim() ?? "", out _))
        {
            return BadRequest(new { message = "Enter a valid support email." });
        }

        var color = request.PrimaryColor?.Trim().ToLowerInvariant() ?? "";
        if (color.Length != 7 || !color.StartsWith('#') || !color[1..].All(Uri.IsHexDigit))
        {
            return BadRequest(new { message = "Choose a color like #1286c8." });
        }

        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("CALL p_savesettings(@SiteName, @SupportEmail, @Tagline, @PrimaryColor)", connection);
            command.Parameters.Add(new NpgsqlParameter("SiteName", NpgsqlDbType.Varchar) { Value = (object?)request.SiteName ?? DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("SupportEmail", NpgsqlDbType.Varchar) { Value = request.SupportEmail!.Trim() });
            command.Parameters.Add(new NpgsqlParameter("Tagline", NpgsqlDbType.Varchar) { Value = (object?)request.Tagline ?? DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("PrimaryColor", NpgsqlDbType.Varchar) { Value = color });
            await command.ExecuteNonQueryAsync();
            await WriteAudit(request.UserId, "update", "settings", request.SiteName ?? "");
            return Ok(new { message = "Settings saved." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
    }

    [HttpPost("logo")]
    [RequestSizeLimit(MaxLogoBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxLogoBytes)]
    public async Task<IActionResult> SaveLogo(IFormFile? logo, [FromForm] Guid? userId)
    {
        if (logo is null || logo.Length == 0)
        {
            return BadRequest(new { message = "Choose a logo image." });
        }

        if (logo.Length > MaxLogoBytes)
        {
            return BadRequest(new { message = "That image is larger than 2 MB." });
        }

        if (!LogoTypes.TryGetValue(logo.ContentType, out var extension))
        {
            return BadRequest(new { message = "Choose a JPEG, PNG, WEBP, or GIF image." });
        }

        var directory = Path.Combine(_environment.ContentRootPath, "uploads", "brand");
        Directory.CreateDirectory(directory);
        var fileName = $"logo-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}{extension}";
        var fullPath = Path.Combine(directory, fileName);
        var relative = $"brand/{fileName}";

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await logo.CopyToAsync(stream);
        }

        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("CALL p_savelogo(@LogoPath)", connection);
            command.Parameters.Add(new NpgsqlParameter("LogoPath", NpgsqlDbType.Text) { Value = relative });
            await command.ExecuteNonQueryAsync();
        }
        catch
        {
            System.IO.File.Delete(fullPath);
            throw;
        }

        foreach (var existing in Directory.EnumerateFiles(directory))
        {
            if (!string.Equals(existing, fullPath, StringComparison.OrdinalIgnoreCase))
            {
                System.IO.File.Delete(existing);
            }
        }

        await WriteAudit(userId, "update", "logo", relative);
        return Ok(new { message = "Logo updated.", logoPath = relative });
    }

    [HttpDelete("logo")]
    public async Task<IActionResult> RemoveLogo([FromBody] LogoRequest request)
    {
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("CALL p_savelogo(@LogoPath)", connection);
        command.Parameters.Add(new NpgsqlParameter("LogoPath", NpgsqlDbType.Text) { Value = "" });
        await command.ExecuteNonQueryAsync();

        var directory = Path.Combine(_environment.ContentRootPath, "uploads", "brand");
        if (Directory.Exists(directory))
        {
            foreach (var existing in Directory.EnumerateFiles(directory))
            {
                System.IO.File.Delete(existing);
            }
        }

        await WriteAudit(request.UserId, "update", "logo", "built-in");
        return Ok(new { message = "Using the built-in logo." });
    }

    [HttpGet("departments")]
    public async Task<IActionResult> Departments()
    {
        return Ok(await ReadRows("SELECT * FROM p_listdepartments()", reader => new
        {
            departmentId = reader.GetInt32(0),
            name = reader.GetString(1)
        }));
    }

    [HttpPost("departments")]
    public async Task<IActionResult> AddDepartment([FromBody] NameRequest request) =>
        await AddNamed("CALL p_adddepartment(@Name)", request, "department", "Department added.");

    [HttpGet("categories")]
    public async Task<IActionResult> Categories()
    {
        return Ok(await ReadRows("SELECT * FROM p_listcategories()", reader => new
        {
            categoryId = reader.GetInt32(0),
            name = reader.GetString(1)
        }));
    }

    [HttpPost("categories")]
    public async Task<IActionResult> AddCategory([FromBody] NameRequest request) =>
        await AddNamed("CALL p_addcategory(@Name)", request, "category", "Category added.");

    [HttpGet("notifications")]
    public async Task<IActionResult> Notifications()
    {
        return Ok(await ReadRows("SELECT * FROM p_listnotifications()", reader => new
        {
            code = reader.GetString(0),
            name = reader.GetString(1),
            isEnabled = reader.GetBoolean(2)
        }));
    }

    [HttpPut("notifications/{code}")]
    public async Task<IActionResult> SetNotification(string code, [FromBody] ActiveRequest request)
    {
        if (request.IsActive is null)
        {
            return BadRequest(new { message = "Choose whether the notification is on." });
        }

        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("CALL p_setnotification(@Code, @IsEnabled)", connection);
            command.Parameters.Add(new NpgsqlParameter("Code", NpgsqlDbType.Varchar) { Value = code });
            command.Parameters.Add(new NpgsqlParameter("IsEnabled", NpgsqlDbType.Boolean) { Value = request.IsActive.Value });
            await command.ExecuteNonQueryAsync();
            await WriteAudit(request.UserId, request.IsActive.Value ? "enable" : "disable", "notification", code);
            return Ok(new { message = "Notification updated." });
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.InvalidParameterValue or PostgresErrorCodes.NoDataFound)
        {
            return BadRequest(new { message = ex.MessageText });
        }
    }

    [HttpGet("templates")]
    public async Task<IActionResult> Templates()
    {
        return Ok(await ReadRows("SELECT * FROM p_listtemplates()", reader => new
        {
            templateId = reader.GetInt32(0),
            name = reader.GetString(1),
            body = reader.GetString(2)
        }));
    }

    [HttpPost("templates")]
    public async Task<IActionResult> AddTemplate([FromBody] TemplateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Enter a template name." });
        }

        if ((request.Body?.Length ?? 0) > 4000)
        {
            return BadRequest(new { message = "Keep the template under 4000 characters." });
        }

        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("CALL p_addtemplate(@Name, @Body)", connection);
            command.Parameters.Add(new NpgsqlParameter("Name", NpgsqlDbType.Varchar) { Value = request.Name });
            command.Parameters.Add(new NpgsqlParameter("Body", NpgsqlDbType.Text) { Value = (object?)request.Body ?? DBNull.Value });
            await command.ExecuteNonQueryAsync();
            await WriteAudit(request.UserId, "add", "template", request.Name);
            return Ok(new { message = "Template added." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "That name is already in use." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
    }

    [HttpGet("audit")]
    public async Task<IActionResult> Audit()
    {
        return Ok(await ReadRows("SELECT * FROM p_listaudit()", reader => new
        {
            auditId = reader.GetInt64(0),
            action = reader.GetString(1),
            entityName = reader.GetString(2),
            detail = reader.IsDBNull(3) ? "" : reader.GetString(3),
            createdAt = reader.GetDateTime(4)
        }));
    }

    private async Task<IActionResult> AddNamed(string sql, NameRequest request, string entity, string success)
    {
        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.Add(new NpgsqlParameter("Name", NpgsqlDbType.Varchar) { Value = (object?)request.Name ?? DBNull.Value });
            await command.ExecuteNonQueryAsync();
            await WriteAudit(request.UserId, "add", entity, request.Name ?? "");
            return Ok(new { message = success });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "That name is already in use." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
    }

    private async Task WriteAudit(Guid? userId, string action, string entity, string detail)
    {
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("CALL p_writeaudit(@UserID, @Action, @EntityName, @Detail)", connection);
        command.Parameters.Add(new NpgsqlParameter("UserID", NpgsqlDbType.Uuid) { Value = userId.HasValue ? userId.Value : DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Action", NpgsqlDbType.Varchar) { Value = action });
        command.Parameters.Add(new NpgsqlParameter("EntityName", NpgsqlDbType.Varchar) { Value = entity });
        command.Parameters.Add(new NpgsqlParameter("Detail", NpgsqlDbType.Text) { Value = detail });
        await command.ExecuteNonQueryAsync();
    }

    private async Task<List<T>> ReadRows<T>(string sql, Func<NpgsqlDataReader, T> map)
    {
        var rows = new List<T>();
        await using var connection = await Open();
        await using var command = new NpgsqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(map(reader));
        }

        return rows;
    }

    private async Task<NpgsqlConnection> Open()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }
}

public sealed class StaffRequest
{
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? Role { get; set; }
    public Guid? UserId { get; set; }
}

public sealed class ActiveRequest
{
    public bool? IsActive { get; set; }
    public Guid? UserId { get; set; }
}

public sealed class RoleRequest
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public Guid? UserId { get; set; }
}

public sealed class ApplicationSettingsRequest
{
    public string? SiteName { get; set; }
    public string? SupportEmail { get; set; }
    public string? Tagline { get; set; }
    public string? PrimaryColor { get; set; }
    public Guid? UserId { get; set; }
}

public sealed class LogoRequest
{
    public Guid? UserId { get; set; }
}

public sealed class NameRequest
{
    public string? Name { get; set; }
    public Guid? UserId { get; set; }
}

public sealed class TemplateRequest
{
    public string? Name { get; set; }
    public string? Body { get; set; }
    public Guid? UserId { get; set; }
}
