BEGIN;

-- A volunteer can keep a profile private, and can post a short update for the community.
-- Private profiles stay out of the community feed except for the volunteer who wrote them.

ALTER TABLE t_volunteerprofile
    ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS t_communitypost (
    post_id uuid PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES t_client (client_id) ON DELETE CASCADE,
    body varchar(500) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION p_setprofileprivate(ClientID uuid, IsPrivate boolean)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_client uuid := ClientID;
    v_private boolean := COALESCE(IsPrivate, false);
    v_type varchar(32);
BEGIN
    SELECT client.client_type
    INTO v_type
    FROM t_client AS client
    WHERE client.client_id = v_client;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account uses that id.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_type <> 'volunteer' THEN
        RETURN false;
    END IF;

    INSERT INTO t_volunteerprofile (client_id, is_private)
    VALUES (v_client, v_private)
    ON CONFLICT (client_id) DO UPDATE
    SET is_private = EXCLUDED.is_private;

    RETURN v_private;
END;
$$;

CREATE OR REPLACE FUNCTION p_addcommunitypost(ClientID uuid, Body text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_client uuid := ClientID;
    v_body varchar(500);
    v_type varchar(32);
    v_post uuid;
BEGIN
    v_body := NULLIF(btrim(Body), '');

    IF v_body IS NULL THEN
        RAISE EXCEPTION 'Write a short update.'
            USING ERRCODE = '22023';
    END IF;

    IF char_length(v_body) > 500 THEN
        RAISE EXCEPTION 'Keep an update under 500 characters.'
            USING ERRCODE = '22023';
    END IF;

    SELECT client.client_type
    INTO v_type
    FROM t_client AS client
    WHERE client.client_id = v_client;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account uses that id.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_type <> 'volunteer' THEN
        RAISE EXCEPTION 'Only a volunteer can post to the community.'
            USING ERRCODE = '22023';
    END IF;

    v_post := gen_random_uuid();
    INSERT INTO t_communitypost (post_id, client_id, body)
    VALUES (v_post, v_client, v_body);

    RETURN v_post;
END;
$$;

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
DECLARE
    v_viewer uuid := ViewerID;
BEGIN
    RETURN QUERY
    SELECT post.post_id,
           client.client_id,
           client.full_name,
           profile.city,
           profile.country,
           profile.photo_path,
           post.body,
           post.created_at
    FROM t_communitypost AS post
    JOIN t_client AS client ON client.client_id = post.client_id
    LEFT JOIN t_volunteerprofile AS profile ON profile.client_id = client.client_id
    WHERE client.client_type = 'volunteer'
      AND client.is_active = true
      AND (COALESCE(profile.is_private, false) = false OR client.client_id = v_viewer)
    ORDER BY post.created_at DESC
    LIMIT 50;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('019_p_community')
ON CONFLICT (name) DO NOTHING;

COMMIT;
