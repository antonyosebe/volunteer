using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace Volunteer.Controllers;

[ApiController]
[Route("api/opportunities")]
public class OpportunityController : ControllerBase
{
    private readonly string _connectionString;

    public OpportunityController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Database connection string is missing.");
    }

    [HttpGet]
    public async Task<IActionResult> ListPublic()
    {
        var rows = new List<object>();
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listpublicopportunities()", connection);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new
            {
                id = reader.GetGuid(0),
                title = reader.GetString(1),
                location = ReadOptionalString(reader, 2),
                organisationName = reader.GetString(3),
                categoryName = ReadOptionalString(reader, 4),
                timeCommitment = ReadOptionalString(reader, 5),
                volunteerCount = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                isPaid = reader.GetBoolean(7)
            });
        }

        return Ok(rows);
    }

    [HttpGet("{opportunityId:guid}")]
    public async Task<IActionResult> GetPublic(Guid opportunityId)
    {
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("SELECT * FROM p_getpublicopportunity(@OpportunityID)", connection);
        command.Parameters.Add(new NpgsqlParameter("OpportunityID", NpgsqlDbType.Uuid) { Value = opportunityId });
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "That opportunity is not public." });
        }

        return Ok(ReadPublic(reader));
    }

    [HttpGet("mine/{clientId:guid}")]
    public async Task<IActionResult> ListMine(Guid clientId)
    {
        var rows = new List<object>();
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listorgopportunities(@ClientID)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new
            {
                opportunityId = reader.GetGuid(0),
                title = reader.GetString(1),
                status = reader.GetString(2),
                location = ReadOptionalString(reader, 3),
                isRemote = reader.GetBoolean(4),
                categoryName = ReadOptionalString(reader, 5)
            });
        }

        return Ok(rows);
    }

    [HttpGet("mine/{clientId:guid}/{opportunityId:guid}")]
    public async Task<IActionResult> GetMine(Guid clientId, Guid opportunityId)
    {
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("SELECT * FROM p_getorgopportunity(@ClientID, @OpportunityID)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("OpportunityID", NpgsqlDbType.Uuid) { Value = opportunityId });
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "That opportunity is not yours." });
        }

        return Ok(ReadOwned(reader));
    }

    [HttpPost("mine/{clientId:guid}")]
    public async Task<IActionResult> Create(Guid clientId, [FromBody] OpportunityRequest request)
    {
        var saved = await Save(clientId, null, request);
        return saved.Result ?? Ok(saved.Body);
    }

    [HttpPut("mine/{clientId:guid}/{opportunityId:guid}")]
    public async Task<IActionResult> Update(Guid clientId, Guid opportunityId, [FromBody] OpportunityRequest request)
    {
        var saved = await Save(clientId, opportunityId, request);
        return saved.Result ?? Ok(saved.Body);
    }

    [HttpPut("mine/{clientId:guid}/{opportunityId:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid clientId, Guid opportunityId, [FromBody] OpportunityStatusRequest request)
    {
        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand(
                "CALL p_setopportunitystatus(@ClientID, @OpportunityID, @Status)",
                connection);
            command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
            command.Parameters.Add(new NpgsqlParameter("OpportunityID", NpgsqlDbType.Uuid) { Value = opportunityId });
            command.Parameters.Add(new NpgsqlParameter("Status", NpgsqlDbType.Varchar) { Value = (object?)request.Status ?? DBNull.Value });
            await command.ExecuteNonQueryAsync();
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return BadRequest(new { message = ex.MessageText });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return NotFound(new { message = ex.MessageText });
        }

        var posted = string.Equals(request.Status, "published", StringComparison.OrdinalIgnoreCase);
        return Ok(new { message = posted ? "Opportunity posted." : "Opportunity updated." });
    }

    [HttpGet("/api/categories")]
    public async Task<IActionResult> Categories()
    {
        var rows = new List<object>();
        await using var connection = await Open();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listcategories()", connection);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new { categoryId = reader.GetInt32(0), name = reader.GetString(1) });
        }

        return Ok(rows);
    }

    private async Task<(IActionResult? Result, object? Body)> Save(Guid clientId, Guid? opportunityId, OpportunityRequest request)
    {
        try
        {
            await using var connection = await Open();
            await using var command = new NpgsqlCommand(
                "CALL p_saveopportunity(@ClientID, @OpportunityID, @Title, @Description, @CategoryID, @Location, @IsRemote, @StartsOn, @EndsOn, @TimeCommitment, @VolunteerCount, @Deadline, @IsPaid, @Publish)",
                connection);
            command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
            command.Parameters.Add(new NpgsqlParameter("OpportunityID", NpgsqlDbType.Uuid) { Value = opportunityId.HasValue ? opportunityId.Value : DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("Title", NpgsqlDbType.Varchar) { Value = (object?)request.Title ?? DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("Description", NpgsqlDbType.Text) { Value = (object?)request.Description ?? DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("CategoryID", NpgsqlDbType.Integer) { Value = request.CategoryId is > 0 ? request.CategoryId : DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("Location", NpgsqlDbType.Varchar) { Value = (object?)request.Location ?? DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("IsRemote", NpgsqlDbType.Boolean) { Value = request.IsRemote });
            command.Parameters.Add(new NpgsqlParameter("StartsOn", NpgsqlDbType.Date) { Value = request.StartsOn.HasValue ? request.StartsOn.Value : DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("EndsOn", NpgsqlDbType.Date) { Value = request.EndsOn.HasValue ? request.EndsOn.Value : DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("TimeCommitment", NpgsqlDbType.Varchar) { Value = (object?)request.TimeCommitment ?? DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("VolunteerCount", NpgsqlDbType.Integer) { Value = request.VolunteerCount is > 0 ? request.VolunteerCount : DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("Deadline", NpgsqlDbType.Date) { Value = request.Deadline.HasValue ? request.Deadline.Value : DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("IsPaid", NpgsqlDbType.Boolean) { Value = request.IsPaid });
            command.Parameters.Add(new NpgsqlParameter("Publish", NpgsqlDbType.Boolean) { Value = request.Publish });
            await using var reader = await command.ExecuteReaderAsync();
            await reader.ReadAsync();
            var id = reader.GetGuid(0);
            return (null, new { message = request.Publish ? "Opportunity posted." : "Draft saved.", opportunityId = id });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidParameterValue)
        {
            return (BadRequest(new { message = ex.MessageText }), null);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return (NotFound(new { message = ex.MessageText }), null);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            return (BadRequest(new { message = "Choose a category from the list." }), null);
        }
    }

    private static object ReadPublic(NpgsqlDataReader reader)
    {
        return new
        {
            title = reader.GetString(0),
            description = reader.GetString(1),
            location = ReadOptionalString(reader, 2),
            isRemote = reader.GetBoolean(3),
            organisationName = reader.GetString(4),
            categoryName = ReadOptionalString(reader, 5),
            startsOn = ReadDate(reader, 6),
            endsOn = ReadDate(reader, 7),
            deadline = ReadDate(reader, 8),
            timeCommitment = ReadOptionalString(reader, 9),
            volunteerCount = reader.IsDBNull(10) ? (int?)null : reader.GetInt32(10),
            isPaid = reader.GetBoolean(11)
        };
    }

    private static object ReadOwned(NpgsqlDataReader reader)
    {
        return new
        {
            opportunityId = reader.GetGuid(0),
            title = reader.GetString(1),
            description = reader.GetString(2),
            categoryId = reader.IsDBNull(3) ? (int?)null : reader.GetInt32(3),
            location = ReadOptionalString(reader, 4),
            isRemote = reader.GetBoolean(5),
            startsOn = ReadDate(reader, 6),
            endsOn = ReadDate(reader, 7),
            timeCommitment = ReadOptionalString(reader, 8),
            volunteerCount = reader.IsDBNull(9) ? (int?)null : reader.GetInt32(9),
            deadline = ReadDate(reader, 10),
            isPaid = reader.GetBoolean(11),
            status = reader.GetString(12),
            organisationStatus = reader.GetString(13)
        };
    }

    private static string? ReadOptionalString(NpgsqlDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static string? ReadDate(NpgsqlDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal).ToString("yyyy-MM-dd");
    }

    private async Task<NpgsqlConnection> Open()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }
}

public sealed class OpportunityRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
    public string? Location { get; set; }
    public bool IsRemote { get; set; }
    public DateOnly? StartsOn { get; set; }
    public DateOnly? EndsOn { get; set; }
    public string? TimeCommitment { get; set; }
    public int? VolunteerCount { get; set; }
    public DateOnly? Deadline { get; set; }
    public bool IsPaid { get; set; }
    public bool Publish { get; set; }
}

public sealed class OpportunityStatusRequest
{
    public string? Status { get; set; }
}
