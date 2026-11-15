using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Volunteer.Controllers;

[ApiController]
[Route("api/community")]
public class CommunityController : ControllerBase
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

    public CommunityController(UserController users, IWebHostEnvironment environment)
    {
        _users = users;
        _environment = environment;
    }

    [HttpGet("{clientId:guid}")]
    public async Task<IActionResult> List(Guid clientId)
    {
        var posts = await _users.ListCommunityPosts(clientId);
        return Ok(posts.Select(post => new
        {
            postId = post.PostId,
            clientId = post.ClientId,
            fullName = post.FullName,
            city = post.City,
            country = post.Country,
            photoPath = post.PhotoPath,
            body = post.Body,
            imagePath = post.ImagePath,
            createdAt = post.CreatedAt
        }));
    }

    [HttpPost("{clientId:guid}")]
    [RequestSizeLimit(MaxPhotoBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxPhotoBytes)]
    public async Task<IActionResult> Add(Guid clientId, [FromForm] CommunityPostRequest? request)
    {
        request ??= new CommunityPostRequest();
        string? relative = null;
        string? fullPath = null;
        if (request.Photo is { Length: > 0 })
        {
            if (request.Photo.Length > MaxPhotoBytes)
            {
                return BadRequest(new { message = "That image is larger than 2 MB." });
            }

            var extension = ExtensionFor(request.Photo);
            if (extension is null)
            {
                return BadRequest(new { message = "Choose a JPEG, PNG, WEBP, or GIF image." });
            }

            var fileName = Guid.NewGuid() + extension;
            relative = Path.Combine("community", fileName).Replace('\\', '/');
            var directory = Path.Combine(_environment.ContentRootPath, "uploads", "community");
            Directory.CreateDirectory(directory);
            fullPath = Path.Combine(directory, fileName);
            await using (var stream = System.IO.File.Create(fullPath))
            {
                await request.Photo.CopyToAsync(stream);
            }
        }

        try
        {
            var postId = await _users.AddCommunityPost(clientId, request.Body, relative);
            return Ok(new { message = "Posted to the community.", postId });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            DeletePhoto(fullPath);
            return NotFound(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            DeletePhoto(fullPath);
            return BadRequest(new { message = ex.MessageText });
        }
        catch
        {
            DeletePhoto(fullPath);
            throw;
        }
    }

    [HttpGet("{clientId:guid}/comments")]
    public async Task<IActionResult> Comments(Guid clientId)
    {
        var comments = await _users.ListCommunityComments();
        return Ok(comments.Select(comment => new
        {
            commentId = comment.CommentId,
            postId = comment.PostId,
            fullName = comment.FullName,
            photoPath = comment.PhotoPath,
            body = comment.Body,
            createdAt = comment.CreatedAt
        }));
    }

    [HttpPost("{clientId:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid clientId, [FromBody] CommunityCommentRequest request)
    {
        try
        {
            var commentId = await _users.AddCommunityComment(clientId, request.PostId, request.Body);
            return Ok(new { message = "Comment added.", commentId });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
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

    private static void DeletePhoto(string? fullPath)
    {
        if (fullPath is not null && System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }
    }
}

public sealed class CommunityPostRequest
{
    public string? Body { get; set; }
    public IFormFile? Photo { get; set; }
}

public sealed class CommunityCommentRequest
{
    public Guid PostId { get; set; }
    public string? Body { get; set; }
}
