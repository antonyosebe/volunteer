using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace Volunteer.Controllers;

// Calls the user procedures. This is not an API endpoint.
[NonController]
public class UserController
{
    private readonly string _connectionString;

    public UserController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Database")
            ?? throw new InvalidOperationException("Database connection string is missing.");
    }

    public async Task<Guid> AddEditUser(
        Guid? clientId,
        string? email,
        string? passwordHash,
        string? fullName,
        string? clientType,
        string? phone = null,
        bool? isActive = null)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_addedituser(@ClientID, @Email, @PasswordHash, @FullName, @ClientType, @Phone, @IsActive)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid)
        {
            Value = clientId.HasValue ? clientId.Value : DBNull.Value
        });
        command.Parameters.Add(new NpgsqlParameter("Email", NpgsqlDbType.Varchar) { Value = (object?)email ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("PasswordHash", NpgsqlDbType.Text) { Value = (object?)passwordHash ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("FullName", NpgsqlDbType.Varchar) { Value = (object?)fullName ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("ClientType", NpgsqlDbType.Varchar) { Value = (object?)clientType ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Phone", NpgsqlDbType.Varchar) { Value = (object?)phone ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("IsActive", NpgsqlDbType.Boolean)
        {
            Value = isActive.HasValue ? isActive.Value : DBNull.Value
        });

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            throw new InvalidOperationException("p_addedituser did not return an account id.");
        }

        return reader.GetGuid(0);
    }

    public async Task<UserAccount?> GetUser(string email)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_getuser(@Email, @ClientID, @PasswordHash, @FullName, @ClientType, @IsActive)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("Email", NpgsqlDbType.Varchar) { Value = email });
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("PasswordHash", NpgsqlDbType.Text) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("FullName", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("ClientType", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("IsActive", NpgsqlDbType.Boolean) { Value = DBNull.Value });

        try
        {
            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return null;
            }

            return new UserAccount(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetBoolean(4));
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return null;
        }
    }

    public async Task<VolunteerProfile?> GetProfile(Guid clientId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_getprofile(@ClientID, @FullName, @Email, @Phone, @Age, @Workplace, @Country, @City, @Availability, @ClientType, @IsActive, @Photo)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("FullName", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Email", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Phone", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Age", NpgsqlDbType.Integer) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Workplace", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Country", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("City", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Availability", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("ClientType", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("IsActive", NpgsqlDbType.Boolean) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Photo", NpgsqlDbType.Text) { Value = DBNull.Value });

        try
        {
            string fullName;
            string email;
            string? phone;
            int? age;
            string? workplace;
            string? country;
            string? city;
            string? availability;
            string clientType;
            bool isActive;
            string? photoPath;
            await using (var reader = await command.ExecuteReaderAsync())
            {
                if (!await reader.ReadAsync())
                {
                    return null;
                }

                fullName = reader.GetString(0);
                email = reader.GetString(1);
                phone = ReadOptionalString(reader, 2);
                age = reader.IsDBNull(3) ? null : reader.GetInt32(3);
                workplace = ReadOptionalString(reader, 4);
                country = ReadOptionalString(reader, 5);
                city = ReadOptionalString(reader, 6);
                availability = ReadOptionalString(reader, 7);
                clientType = reader.GetString(8);
                isActive = reader.GetBoolean(9);
                photoPath = ReadOptionalString(reader, 10);
            }

            var isPrivate = false;
            await using (var privacy = new NpgsqlCommand(
                "SELECT COALESCE(profile.is_private, false) FROM t_volunteerprofile AS profile WHERE profile.client_id = @ClientID",
                connection))
            {
                privacy.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
                var value = await privacy.ExecuteScalarAsync();
                isPrivate = value is bool flag && flag;
            }

            return new VolunteerProfile(
                clientId,
                fullName,
                email,
                phone,
                age,
                workplace,
                country,
                city,
                availability,
                clientType,
                isActive,
                photoPath,
                isPrivate);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return null;
        }
    }

    public async Task AddEditProfile(
        Guid clientId,
        string? fullName,
        string? phone,
        int? age,
        string? workplace,
        string? country,
        string? city,
        string? availability)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_addeditprofile(@ClientID, @FullName, @Phone, @Age, @Workplace, @Country, @City, @Availability)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("FullName", NpgsqlDbType.Varchar) { Value = (object?)fullName ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Phone", NpgsqlDbType.Varchar) { Value = (object?)phone ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Age", NpgsqlDbType.Integer) { Value = age.HasValue ? age.Value : DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Workplace", NpgsqlDbType.Varchar) { Value = (object?)workplace ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Country", NpgsqlDbType.Varchar) { Value = (object?)country ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("City", NpgsqlDbType.Varchar) { Value = (object?)city ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Availability", NpgsqlDbType.Varchar) { Value = (object?)availability ?? DBNull.Value });
        await command.ExecuteNonQueryAsync();
    }

    public async Task<StaffAccount?> GetStaff(string email)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_getstaff(@Email, @UserID, @PasswordHash, @FullName, @IsActive)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("Email", NpgsqlDbType.Varchar) { Value = email });
        command.Parameters.Add(new NpgsqlParameter("UserID", NpgsqlDbType.Uuid) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("PasswordHash", NpgsqlDbType.Text) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("FullName", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("IsActive", NpgsqlDbType.Boolean) { Value = DBNull.Value });

        try
        {
            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return null;
            }

            return new StaffAccount(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetBoolean(3));
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<OrganisationSummary>> ListOrganisations(string? status)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listorganisations(@Status)", connection);
        command.Parameters.Add(new NpgsqlParameter("Status", NpgsqlDbType.Varchar) { Value = (object?)status ?? DBNull.Value });
        var rows = new List<OrganisationSummary>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new OrganisationSummary(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3)));
        }

        return rows;
    }

    public async Task<AdminCounts> AdminCounts()
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT * FROM p_admincounts()", connection);
        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();
        return new AdminCounts(reader.GetInt32(0), reader.GetInt32(1), reader.GetInt32(2), reader.GetInt32(3));
    }

    public async Task<IReadOnlyList<AdminWeek>> AdminWeeks()
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT * FROM p_adminweeks()", connection);
        var rows = new List<AdminWeek>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new AdminWeek(reader.GetInt32(0), reader.GetInt32(1), reader.GetInt32(2)));
        }

        return rows;
    }

    public async Task SetOrganisationStatus(Guid organisationId, string? status)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_setorganisationstatus(@OrganisationID, @Status)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("OrganisationID", NpgsqlDbType.Uuid) { Value = organisationId });
        command.Parameters.Add(new NpgsqlParameter("Status", NpgsqlDbType.Varchar) { Value = (object?)status ?? DBNull.Value });
        await command.ExecuteNonQueryAsync();
    }

    public async Task EditOrganisation(Guid clientId, string? name, string? city, string? country)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_editorganisation(@ClientID, @Name, @City, @Country)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("Name", NpgsqlDbType.Varchar) { Value = (object?)name ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("City", NpgsqlDbType.Varchar) { Value = (object?)city ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Country", NpgsqlDbType.Varchar) { Value = (object?)country ?? DBNull.Value });
        await command.ExecuteNonQueryAsync();
    }

    public async Task<OrganisationAccount?> GetOrganisation(Guid clientId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_getorganisation(@ClientID, @OrganisationID, @Name, @Email, @Country, @City, @Status, @MemberRole)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("OrganisationID", NpgsqlDbType.Uuid) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Name", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Email", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Country", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("City", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("Status", NpgsqlDbType.Varchar) { Value = DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("MemberRole", NpgsqlDbType.Varchar) { Value = DBNull.Value });

        try
        {
            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return null;
            }

            return new OrganisationAccount(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                ReadOptionalString(reader, 3),
                ReadOptionalString(reader, 4),
                reader.GetString(5),
                reader.GetString(6));
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.NoDataFound)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<ProfileChoice>> ListProfileChoices(Guid clientId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listprofilechoices(@ClientID)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        var rows = new List<ProfileChoice>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new ProfileChoice(reader.GetString(0), reader.GetInt32(1), reader.GetString(2), reader.GetBoolean(3)));
        }

        return rows;
    }

    public async Task SaveProfileChoices(Guid clientId, string[]? skills, string[]? hobbies, string[]? focusAreas)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_saveprofilechoices(@ClientID, @SkillNames, @HobbyNames, @FocusNames)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(TextArray("SkillNames", skills));
        command.Parameters.Add(TextArray("HobbyNames", hobbies));
        command.Parameters.Add(TextArray("FocusNames", focusAreas));
        await command.ExecuteNonQueryAsync();
    }

    public async Task SetProfilePrivate(Guid clientId, bool isPrivate)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT p_setprofileprivate(@ClientID, @IsPrivate)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("IsPrivate", NpgsqlDbType.Boolean) { Value = isPrivate });
        await command.ExecuteScalarAsync();
    }

    public async Task<Guid> AddCommunityPost(Guid clientId, string? body, string? imagePath)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT p_addcommunitypost(@ClientID, @Body, @ImagePath)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("Body", NpgsqlDbType.Text) { Value = (object?)body ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("ImagePath", NpgsqlDbType.Text) { Value = (object?)imagePath ?? DBNull.Value });
        var id = await command.ExecuteScalarAsync();
        return id is Guid postId ? postId : Guid.Empty;
    }

    public async Task<string?> DeleteCommunityPost(Guid clientId, Guid postId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT p_deletecommunitypost(@ClientID, @PostID)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("PostID", NpgsqlDbType.Uuid) { Value = postId });
        var imagePath = await command.ExecuteScalarAsync();
        return imagePath is string path ? path : null;
    }

    public async Task<List<CommunityPost>> ListCommunityPosts(Guid viewerId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listcommunityposts(@ViewerID)", connection);
        command.Parameters.Add(new NpgsqlParameter("ViewerID", NpgsqlDbType.Uuid) { Value = viewerId });
        var rows = new List<CommunityPost>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new CommunityPost(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetString(2),
                ReadOptionalString(reader, 3),
                ReadOptionalString(reader, 4),
                ReadOptionalString(reader, 5),
                reader.GetString(6),
                reader.GetDateTime(7),
                ReadOptionalString(reader, 8)));
        }

        return rows;
    }

    public async Task<Guid> AddCommunityComment(Guid clientId, Guid postId, string? body)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT p_addcommunitycomment(@ClientID, @PostID, @Body)", connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("PostID", NpgsqlDbType.Uuid) { Value = postId });
        command.Parameters.Add(new NpgsqlParameter("Body", NpgsqlDbType.Text) { Value = (object?)body ?? DBNull.Value });
        var id = await command.ExecuteScalarAsync();
        return id is Guid commentId ? commentId : Guid.Empty;
    }

    public async Task<List<CommunityComment>> ListCommunityComments()
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("SELECT * FROM p_listcommunitycomments()", connection);
        var rows = new List<CommunityComment>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            rows.Add(new CommunityComment(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetGuid(2),
                reader.GetString(3),
                ReadOptionalString(reader, 4),
                reader.GetString(5),
                reader.GetDateTime(6)));
        }

        return rows;
    }

    public async Task SetProfilePhoto(Guid clientId, string? photoPath)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "CALL p_setprofilephoto(@ClientID, @PhotoPath)",
            connection);
        command.Parameters.Add(new NpgsqlParameter("ClientID", NpgsqlDbType.Uuid) { Value = clientId });
        command.Parameters.Add(new NpgsqlParameter("PhotoPath", NpgsqlDbType.Text) { Value = (object?)photoPath ?? DBNull.Value });
        await command.ExecuteNonQueryAsync();
    }

    private static NpgsqlParameter TextArray(string name, string[]? values)
    {
        return new NpgsqlParameter(name, NpgsqlDbType.Array | NpgsqlDbType.Text)
        {
            Value = values is { Length: > 0 } ? values : Array.Empty<string>()
        };
    }

    private static string? ReadOptionalString(NpgsqlDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }
}

public sealed record UserAccount(Guid ClientId, string PasswordHash, string FullName, string ClientType, bool IsActive);

public sealed record StaffAccount(Guid UserId, string PasswordHash, string FullName, bool IsActive);

public sealed record OrganisationSummary(Guid OrganisationId, string Name, string Email, string Status);

public sealed record AdminCounts(int Volunteers, int Organisations, int Pending, int Approved);

public sealed record AdminWeek(int WeekIndex, int Volunteers, int Organisations);

public sealed record OrganisationAccount(
    Guid OrganisationId,
    string Name,
    string Email,
    string? Country,
    string? City,
    string Status,
    string MemberRole);

public sealed record ProfileChoice(string Kind, int Id, string Name, bool Selected);

public sealed record VolunteerProfile(
    Guid ClientId,
    string FullName,
    string Email,
    string? Phone,
    int? Age,
    string? Workplace,
    string? Country,
    string? City,
    string? Availability,
    string ClientType,
    bool IsActive,
    string? PhotoPath,
    bool IsPrivate);

public sealed record CommunityComment(
    Guid CommentId,
    Guid PostId,
    Guid ClientId,
    string FullName,
    string? PhotoPath,
    string Body,
    DateTime CreatedAt);

public sealed record CommunityPost(
    Guid PostId,
    Guid ClientId,
    string FullName,
    string? City,
    string? Country,
    string? PhotoPath,
    string Body,
    DateTime CreatedAt,
    string? ImagePath);
