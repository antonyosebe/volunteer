using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace Volunteer;

public sealed class VolunteerSession
{
    public required string Id { get; init; }
    public Guid? ClientId { get; init; }
    public Guid? UserId { get; init; }
    public required string Email { get; init; }
    public required string FullName { get; init; }
    public required string ClientType { get; init; }
    public DateTime LastSeenUtc { get; set; }
}

public sealed class SessionStore
{
    public static readonly TimeSpan IdleLimit = TimeSpan.FromMinutes(5);
    private readonly ConcurrentDictionary<string, VolunteerSession> _sessions = new();

    public VolunteerSession Create(Guid? clientId, Guid? userId, string email, string fullName, string clientType)
    {
        var now = DateTime.UtcNow;
        DropExpired(now);
        var session = new VolunteerSession
        {
            Id = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),
            ClientId = clientId,
            UserId = userId,
            Email = email,
            FullName = fullName,
            ClientType = clientType,
            LastSeenUtc = now
        };
        _sessions[session.Id] = session;
        return session;
    }

    public VolunteerSession? Touch(string? id)
    {
        if (string.IsNullOrWhiteSpace(id) || !_sessions.TryGetValue(id, out var session)) return null;
        var now = DateTime.UtcNow;
        if (now - session.LastSeenUtc >= IdleLimit)
        {
            _sessions.TryRemove(id, out _);
            return null;
        }

        session.LastSeenUtc = now;
        return session;
    }

    public void Remove(string? id)
    {
        if (!string.IsNullOrWhiteSpace(id)) _sessions.TryRemove(id, out _);
    }

    private void DropExpired(DateTime now)
    {
        foreach (var pair in _sessions)
        {
            if (now - pair.Value.LastSeenUtc >= IdleLimit) _sessions.TryRemove(pair.Key, out _);
        }
    }
}
