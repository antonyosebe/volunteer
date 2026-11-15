BEGIN;

-- p_getprofile also returns the volunteer photo path.
DROP PROCEDURE IF EXISTS p_getprofile(uuid, character varying, character varying, character varying, integer, character varying, character varying, character varying, character varying, character varying, boolean);

CREATE OR REPLACE PROCEDURE p_getprofile
(
    ClientID UUID,
    INOUT FullName VARCHAR,
    INOUT Email VARCHAR,
    INOUT Phone VARCHAR,
    INOUT Age INTEGER,
    INOUT Workplace VARCHAR,
    INOUT Country VARCHAR,
    INOUT City VARCHAR,
    INOUT Availability VARCHAR,
    INOUT ClientType VARCHAR,
    INOUT IsActive BOOLEAN,
    INOUT Photo TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT c.full_name, c.email, c.phone, p.age, p.workplace_title, p.country, p.city, p.availability, c.client_type, c.is_active, p.photo_path
    INTO FullName, Email, Phone, Age, Workplace, Country, City, Availability, ClientType, IsActive, Photo
    FROM t_client AS c
    LEFT JOIN t_volunteerprofile AS p ON p.client_id = c.client_id
    WHERE c.client_id = ClientID;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account uses that id.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- p_setprofilephoto stores or clears the volunteer photo path.
DROP PROCEDURE IF EXISTS p_setprofilephoto(uuid, text);

CREATE OR REPLACE PROCEDURE p_setprofilephoto
(
    ClientID UUID,
    PhotoPath TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_type varchar(32);
    v_path text;
BEGIN
    v_path := NULLIF(btrim(PhotoPath), '');

    SELECT client.client_type
    INTO v_type
    FROM t_client AS client
    WHERE client.client_id = ClientID;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account uses that id.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_type <> 'volunteer' THEN
        RAISE EXCEPTION 'Only a volunteer can add a photo.'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO t_volunteerprofile (client_id, photo_path)
    VALUES (ClientID, v_path)
    ON CONFLICT (client_id) DO UPDATE
    SET photo_path = EXCLUDED.photo_path;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('005_p_profilephoto')
ON CONFLICT (name) DO NOTHING;

COMMIT;
