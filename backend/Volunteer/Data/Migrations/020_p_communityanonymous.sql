BEGIN;

-- A private profile still appears in the community, with the name Anonymous.
-- The photo and place stay off that post so the volunteer is not identified.

CREATE OR REPLACE FUNCTION p_listcommunityposts(ViewerID uuid)
RETURNS TABLE (
    post_id uuid,
    client_id uuid,
    full_name varchar,
    city varchar,
    country varchar,
    photo_path text,
    body varchar,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT post.post_id,
           client.client_id,
           CASE
               WHEN COALESCE(profile.is_private, false) THEN 'Anonymous'::varchar
               ELSE client.full_name
           END,
           CASE WHEN COALESCE(profile.is_private, false) THEN NULL ELSE profile.city END,
           CASE WHEN COALESCE(profile.is_private, false) THEN NULL ELSE profile.country END,
           CASE WHEN COALESCE(profile.is_private, false) THEN NULL ELSE profile.photo_path END,
           post.body,
           post.created_at
    FROM t_communitypost AS post
    JOIN t_client AS client ON client.client_id = post.client_id
    LEFT JOIN t_volunteerprofile AS profile ON profile.client_id = client.client_id
    WHERE client.client_type = 'volunteer'
      AND client.is_active = true
    ORDER BY post.created_at DESC
    LIMIT 50;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('020_p_communityanonymous')
ON CONFLICT (name) DO NOTHING;

COMMIT;
