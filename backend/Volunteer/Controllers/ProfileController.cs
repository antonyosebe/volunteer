using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Volunteer.Controllers;

[ApiController]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    private const long MaxPhotoBytes = 2 * 1024 * 1024;

    private static readonly Dictionary<string, string> PhotoTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif"
    };

    private readonly UserController _users;
    private readonly IWebHostEnvironment _environment;

    public ProfileController(UserController users, IWebHostEnvironment environment)
    {
        _users = users;
        _environment = environment;
    }

    [HttpGet("{clientId:guid}")]
    public async Task<IActionResult> Get(Guid clientId)
    {
        var profile = await _users.GetProfile(clientId);
        if (profile is null)
        {
            return NotFound(new { message = "No account uses that id." });
        }

        return Ok(profile);
    }

    [HttpPut("{clientId:guid}")]
    public async Task<IActionResult> Save(Guid clientId, [FromBody] ProfileRequest request)
    {
        try
        {
            await _users.AddEditProfile(
                clientId,
                request.FullName,
                request.Phone,
                request.Age,
                request.Workplace,
                request.Country,
                request.City,
                request.Availability);
            if (request.IsPrivate.HasValue)
            {
                await _users.SetProfilePrivate(clientId, request.IsPrivate.Value);
            }
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = "No account uses that id." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }

        var profile = await _users.GetProfile(clientId);
        return Ok(profile);
    }

    [HttpGet("{clientId:guid}/choices")]
    public async Task<IActionResult> Choices(Guid clientId)
    {
        var rows = await _users.ListProfileChoices(clientId);
        return Ok(new
        {
            skills = rows.Where(row => row.Kind == "skill").Select(ChoiceItem),
            hobbies = rows.Where(row => row.Kind == "hobby").Select(ChoiceItem),
            focusAreas = rows.Where(row => row.Kind == "focus").Select(ChoiceItem)
        });
    }

    [HttpPut("{clientId:guid}/choices")]
    public async Task<IActionResult> SaveChoices(Guid clientId, [FromBody] ProfileChoicesRequest request)
    {
        try
        {
            await _users.SaveProfileChoices(clientId, request.Skills, request.Hobbies, request.FocusAreas);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }

        var rows = await _users.ListProfileChoices(clientId);
        return Ok(new
        {
            skills = rows.Where(row => row.Kind == "skill").Select(ChoiceItem),
            hobbies = rows.Where(row => row.Kind == "hobby").Select(ChoiceItem),
            focusAreas = rows.Where(row => row.Kind == "focus").Select(ChoiceItem)
        });
    }

    [HttpPut("{clientId:guid}/photo")]
    [RequestSizeLimit(MaxPhotoBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxPhotoBytes)]
    public async Task<IActionResult> SavePhoto(Guid clientId, IFormFile? photo)
    {
        if (photo is null || photo.Length == 0)
        {
            return BadRequest(new { message = "Choose a photo." });
        }

        if (photo.Length > MaxPhotoBytes)
        {
            return BadRequest(new { message = "That image is larger than 2 MB." });
        }

        var extension = ExtensionFor(photo);
        if (extension is null)
        {
            return BadRequest(new { message = "Choose a JPEG, PNG, WEBP, or GIF image." });
        }

        var relative = Path.Combine("photos", clientId + extension).Replace('\\', '/');
        var directory = Path.Combine(_environment.ContentRootPath, "uploads", "photos");
        Directory.CreateDirectory(directory);
        var fullPath = Path.Combine(directory, clientId + extension);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await photo.CopyToAsync(stream);
        }

        try
        {
            await _users.SetProfilePhoto(clientId, relative);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            System.IO.File.Delete(fullPath);
            return NotFound(new { message = "No account uses that id." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            System.IO.File.Delete(fullPath);
            return BadRequest(new { message = ex.MessageText });
        }
        catch
        {
            System.IO.File.Delete(fullPath);
            throw;
        }

        DeleteOtherPhotos(directory, clientId, extension);
        var profile = await _users.GetProfile(clientId);
        return Ok(profile);
    }

    [HttpDelete("{clientId:guid}/photo")]
    public async Task<IActionResult> RemovePhoto(Guid clientId)
    {
        try
        {
            await _users.SetProfilePhoto(clientId, null);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = "No account uses that id." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }

        var directory = Path.Combine(_environment.ContentRootPath, "uploads", "photos");
        DeleteOtherPhotos(directory, clientId, null);
        var profile = await _users.GetProfile(clientId);
        return Ok(profile);
    }

    private static object ChoiceItem(ProfileChoice row)
    {
        return new { id = row.Id, name = row.Name, selected = row.Selected };
    }

    private static string? ExtensionFor(IFormFile photo)
    {
        if (PhotoTypes.TryGetValue(photo.ContentType, out var fromType))
        {
            return fromType;
        }

        return Path.GetExtension(photo.FileName).ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => ".jpg",
            ".png" => ".png",
            ".webp" => ".webp",
            ".gif" => ".gif",
            _ => null
        };
    }

    private static void DeleteOtherPhotos(string directory, Guid clientId, string? keepExtension)
    {
        if (!Directory.Exists(directory))
        {
            return;
        }

        foreach (var file in Directory.EnumerateFiles(directory, clientId + ".*"))
        {
            if (keepExtension is not null && file.EndsWith(keepExtension, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            System.IO.File.Delete(file);
        }
    }
}

public sealed class ProfileChoicesRequest
{
    public string[]? Skills { get; set; }
    public string[]? Hobbies { get; set; }
    public string[]? FocusAreas { get; set; }
}

public sealed class ProfileRequest
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public int? Age { get; set; }
    public string? Workplace { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? Availability { get; set; }
    public bool? IsPrivate { get; set; }
}
