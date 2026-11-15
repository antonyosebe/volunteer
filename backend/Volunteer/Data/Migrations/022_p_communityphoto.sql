BEGIN;

-- A community update can include a photo as well as text.
-- A post needs text, a photo, or both.

ALTER TABLE t_communitypost
    ADD COLUMN IF NOT EXISTS image_path text;

DROP FUNCTION IF EXISTS p_addcommunitypost(uuid, text);
DROP FUNCTION IF EXISTS p_listcommunityposts(uuid);

CREATE FUNCTION p_addcommunitypost(ClientID uuid, Body text, ImagePath text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_client uuid := ClientID;
    v_body varchar(500);
    v_image text;
    v_type varchar(32);
    v_post uuid;
BEGIN
    v_body := COALESCE(NULLIF(btrim(Body), ''), '');
    v_image := NULLIF(btrim(ImagePath), '');

    IF v_body = '' AND v_image IS NULL THEN
        RAISE EXCEPTION 'Write an update or choose a photo.'
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
    INSERT INTO t_communitypost (post_id, client_id, body, image_path)
    VALUES (v_post, v_client, v_body, v_image);

    RETURN v_post;
END;
$$;

CREATE FUNCTION p_listcommunityposts(ViewerID uuid)
RETURNS TABLE (
    post_id uuid,
    client_id uuid,
    full_name varchar,
    city varchar,
    country varchar,
    photo_path text,
    body varchar,
    created_at timestamptz,
    image_path text
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
           post.created_at,
           post.image_path
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
VALUES ('022_p_communityphoto')
ON CONFLICT (name) DO NOTHING;

COMMIT;
