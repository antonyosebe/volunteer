using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Volunteer.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly UserController _users;

    public AdminController(UserController users)
    {
        _users = users;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        return Ok(await _users.AdminCounts());
    }

    [HttpGet("weeks")]
    public async Task<IActionResult> Weeks()
    {
        return Ok(await _users.AdminWeeks());
    }

    [HttpGet("organisations")]
    public async Task<IActionResult> Organisations([FromQuery] string? status)
    {
        var rows = await _users.ListOrganisations(string.IsNullOrWhiteSpace(status) ? null : status);
        return Ok(rows);
    }

    [HttpPut("organisations/{organisationId:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid organisationId, [FromBody] OrganisationStatusRequest request)
    {
        try
        {
            await _users.SetOrganisationStatus(organisationId, request.Status);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = "No organisation uses that id." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }

        return Ok(new { message = "Organisation updated." });
    }
}

public sealed class OrganisationStatusRequest
{
    public string? Status { get; set; }
}
