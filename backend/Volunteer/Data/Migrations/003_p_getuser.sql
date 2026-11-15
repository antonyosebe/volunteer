BEGIN;

-- p_getuser returns the account for an email. The password is checked by the API.
DROP PROCEDURE IF EXISTS p_getuser(character varying, uuid, text, character varying, character varying, boolean);

CREATE OR REPLACE PROCEDURE p_getuser
(
    Email VARCHAR,
    INOUT ClientID UUID,
    INOUT PasswordHash TEXT,
    INOUT FullName VARCHAR,
    INOUT ClientType VARCHAR,
    INOUT IsActive BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_email varchar(256);
BEGIN
    v_email := NULLIF(lower(btrim(Email)), '');

    SELECT c.client_id, c.password_hash, c.full_name, c.client_type, c.is_active
    INTO ClientID, PasswordHash, FullName, ClientType, IsActive
    FROM t_client AS c
    WHERE lower(c.email) = v_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Email or password is incorrect.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('003_p_getuser')
ON CONFLICT (name) DO NOTHING;

COMMIT;
