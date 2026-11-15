using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Volunteer.Controllers;

[ApiController]
[Route("api/organisation")]
public class OrganisationController : ControllerBase
{
    private readonly UserController _users;

    public OrganisationController(UserController users)
    {
        _users = users;
    }

    [HttpGet("{clientId:guid}")]
    public async Task<IActionResult> Get(Guid clientId)
    {
        var organisation = await _users.GetOrganisation(clientId);
        if (organisation is null)
        {
            return NotFound(new { message = "No organisation uses that account." });
        }

        return Ok(organisation);
    }

    [HttpPut("{clientId:guid}")]
    public async Task<IActionResult> Save(Guid clientId, [FromBody] OrganisationProfileRequest request)
    {
        try
        {
            await _users.EditOrganisation(clientId, request.Name, request.City, request.Country);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = "No organisation uses that account." });
        }

        return Ok(new { message = "Profile saved." });
    }
}

public sealed class OrganisationProfileRequest
{
    public string? Name { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
}
