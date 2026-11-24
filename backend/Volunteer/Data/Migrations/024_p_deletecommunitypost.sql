BEGIN;

-- The author of a community post can remove it. Comments are removed with the post.

CREATE OR REPLACE FUNCTION p_deletecommunitypost(ClientID uuid, PostID uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_image text;
BEGIN
    SELECT post.image_path
    INTO v_image
    FROM t_communitypost AS post
    WHERE post.post_id = PostID
      AND post.client_id = ClientID;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'You can only delete your own post.'
            USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM t_communitypost
    WHERE post_id = PostID
      AND client_id = ClientID;

    RETURN v_image;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('024_p_deletecommunitypost')
ON CONFLICT (name) DO NOTHING;

COMMIT;
