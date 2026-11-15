using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace Volunteer.Controllers;

[ApiController]
public class ApplicationController : ControllerBase
{
    private readonly string _connectionString;

    public ApplicationController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Database connection string is missing.");
    }

    [HttpGet("api/opportunities/{opportunityId:guid}/applications/{clientId:guid}")]
    public async Task<IActionResult> GetMine(Guid opportunityId, Guid clientId)
    {
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("SELECT * FROM p_getmyapplication(@ClientID, @OpportunityID)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("OpportunityID", NpgsqlDbType.Uuid) { Value = opportunityId });
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "You have not applied." });
        }

        return Ok(new
        {
            applicationId = reader.GetGuid(0),
            status = reader.GetString(1),
            motivation = reader.IsDBNull(2) ? null : reader.GetString(2),
            submittedAt = reader.GetDateTime(3)
        });
    }

    [HttpPost("api/opportunities/{opportunityId:guid}/applications")]
    public async Task<IActionResult> Apply(Guid opportunityId, [FromBody] ApplyRequest request)
    {
        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("SELECT p_apply(@ClientID, @OpportunityID, @Motivation)", connection);
            command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = request.ClientId });
            command.Parameters.Add(new NpgsqlParameter("OpportunityID", NpgsqlDbType.Uuid) { Value = opportunityId });
            command.Parameters.Add(new NpgsqlParameter("Motivation", NpgsqlDbType.Text) { Value = (object?)request.Motivation ?? DBNull.Value });
            var id = await command.ExecuteScalarAsync();
            return Ok(new { message = "Application sent.", applicationId = id, status = "submitted" });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return BadRequest(new { message = "You have already applied to this opportunity." });
        }
    }

    [HttpGet("api/applications/mine/{clientId:guid}")]
    public async Task<IActionResult> ListMine(Guid clientId)
    {
        var rows = new List<object>();
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listmyapplications(@ClientID)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new
            {
                applicationId = reader.GetGuid(0),
                opportunityId = reader.GetGuid(1),
                title = reader.GetString(2),
                organisationName = reader.GetString(3),
                status = reader.GetString(4),
                submittedAt = reader.GetDateTime(5)
            });
        }

        return Ok(rows);
    }

    [HttpGet("api/applications/received/{clientId:guid}")]
    public async Task<IActionResult> ListReceived(Guid clientId)
    {
        var rows = new List<object>();
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listreceivedapplications(@ClientID)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new
            {
                applicationId = reader.GetGuid(0),
                opportunityId = reader.GetGuid(1),
                title = reader.GetString(2),
                fullName = reader.GetString(3),
                email = reader.GetString(4),
                motivation = reader.IsDBNull(5) ? "" : reader.GetString(5),
                status = reader.GetString(6),
                submittedAt = reader.GetDateTime(7)
            });
        }

        return Ok(rows);
    }

    [HttpPost("api/applications/{applicationId:guid}/accept")]
    public async Task<IActionResult> Accept(Guid applicationId, [FromBody] AcceptRequest request)
    {
        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("SELECT p_acceptapplication(@ClientID, @ApplicationID)", connection);
            command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = request.ClientId });
            command.Parameters.Add(new NpgsqlParameter("ApplicationID", NpgsqlDbType.Uuid) { Value = applicationId });
            var status = await command.ExecuteScalarAsync();
            return Ok(new { message = "Application accepted.", status });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = ex.MessageText });
        }
    }

    [HttpPost("api/applications/{applicationId:guid}/reject")]
    public async Task<IActionResult> Reject(Guid applicationId, [FromBody] AcceptRequest request)
    {
        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand("SELECT p_rejectapplication(@ClientID, @ApplicationID)", connection);
            command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = request.ClientId });
            command.Parameters.Add(new NpgsqlParameter("ApplicationID", NpgsqlDbType.Uuid) { Value = applicationId });
            var status = await command.ExecuteScalarAsync();
            return Ok(new { message = "Application rejected.", status });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = ex.MessageText });
        }
    }

    private async Task<NpgsqlConnection> Open()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }
}

public sealed class ApplyRequest
{
    public Guid ClientId { get; set; }
    public string? Motivation { get; set; }
}

public sealed class AcceptRequest
{
    public Guid ClientId { get; set; }
}
