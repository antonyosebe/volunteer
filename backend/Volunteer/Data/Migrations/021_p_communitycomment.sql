BEGIN;

-- Anyone with an account can comment on a community post.
-- A private volunteer is shown as Anonymous, the same as on a post.

CREATE TABLE IF NOT EXISTS t_communitycomment (
    comment_id uuid PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES t_communitypost (post_id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES t_client (client_id) ON DELETE CASCADE,
    body varchar(300) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION p_addcommunitycomment(ClientID uuid, PostID uuid, Body text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_client uuid := ClientID;
    v_post uuid := PostID;
    v_body varchar(300);
    v_comment uuid;
BEGIN
    v_body := NULLIF(btrim(Body), '');

    IF v_body IS NULL THEN
        RAISE EXCEPTION 'Write a comment.'
            USING ERRCODE = '22023';
    END IF;

    IF char_length(v_body) > 300 THEN
        RAISE EXCEPTION 'Keep a comment under 300 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM t_client AS client
        WHERE client.client_id = v_client
          AND client.is_active = true
    ) THEN
        RAISE EXCEPTION 'No account uses that id.'
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM t_communitypost AS post
        WHERE post.post_id = v_post
    ) THEN
        RAISE EXCEPTION 'That post was not found.'
            USING ERRCODE = 'P0002';
    END IF;

    v_comment := gen_random_uuid();
    INSERT INTO t_communitycomment (comment_id, post_id, client_id, body)
    VALUES (v_comment, v_post, v_client, v_body);

    RETURN v_comment;
END;
$$;

CREATE OR REPLACE FUNCTION p_listcommunitycomments()
RETURNS TABLE (
    comment_id uuid,
    post_id uuid,
    client_id uuid,
    full_name varchar,
    photo_path text,
    body varchar,
    created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT comment.comment_id,
           comment.post_id,
           client.client_id,
           CASE
               WHEN client.client_type = 'volunteer' AND COALESCE(profile.is_private, false) THEN 'Anonymous'::varchar
               ELSE client.full_name
           END,
           CASE
               WHEN client.client_type = 'volunteer' AND COALESCE(profile.is_private, false) THEN NULL
               ELSE profile.photo_path
           END,
           comment.body,
           comment.created_at
    FROM t_communitycomment AS comment
    JOIN t_client AS client ON client.client_id = comment.client_id
    LEFT JOIN t_volunteerprofile AS profile ON profile.client_id = client.client_id
    WHERE client.is_active = true
    ORDER BY comment.created_at ASC;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('021_p_communitycomment')
ON CONFLICT (name) DO NOTHING;

COMMIT;
