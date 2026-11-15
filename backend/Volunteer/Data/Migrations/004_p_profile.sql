BEGIN;

-- p_getprofile reads one account and, for a volunteer, the profile row.
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
    INOUT IsActive BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT c.full_name, c.email, c.phone, p.age, p.workplace_title, p.country, p.city, p.availability, c.client_type, c.is_active
    INTO FullName, Email, Phone, Age, Workplace, Country, City, Availability, ClientType, IsActive
    FROM t_client AS c
    LEFT JOIN t_volunteerprofile AS p ON p.client_id = c.client_id
    WHERE c.client_id = ClientID;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account uses that id.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- p_addeditprofile updates the account name and phone, and the volunteer profile details.
DROP PROCEDURE IF EXISTS p_addeditprofile(uuid, character varying, character varying, integer, character varying, character varying, character varying, character varying);

CREATE OR REPLACE PROCEDURE p_addeditprofile
(
    ClientID UUID,
    FullName VARCHAR,
    Phone VARCHAR,
    Age INTEGER,
    Workplace VARCHAR,
    Country VARCHAR,
    City VARCHAR,
    Availability VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_name varchar(200);
    v_phone varchar(40);
    v_age integer;
    v_work varchar(200);
    v_country varchar(120);
    v_city varchar(120);
    v_availability varchar(200);
    v_type varchar(32);
BEGIN
    v_name := NULLIF(btrim(FullName), '');
    v_phone := NULLIF(btrim(Phone), '');
    v_age := Age;
    v_work := NULLIF(btrim(Workplace), '');
    v_country := NULLIF(btrim(Country), '');
    v_city := NULLIF(btrim(City), '');
    v_availability := NULLIF(btrim(Availability), '');

    IF v_name IS NULL THEN
        RAISE EXCEPTION 'Enter your full name.'
            USING ERRCODE = '22023';
    END IF;

    IF v_age IS NOT NULL AND (v_age < 1 OR v_age > 120) THEN
        RAISE EXCEPTION 'Enter an age from 1 to 120.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE t_client AS client
    SET full_name = v_name,
        phone = v_phone,
        updated_at = clock_timestamp()
    WHERE client.client_id = ClientID
    RETURNING client.client_type INTO v_type;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account uses that id.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_type = 'volunteer' THEN
        INSERT INTO t_volunteerprofile (client_id, age, workplace_title, country, city, availability)
        VALUES (ClientID, v_age, v_work, v_country, v_city, v_availability)
        ON CONFLICT (client_id) DO UPDATE
        SET age = EXCLUDED.age,
            workplace_title = EXCLUDED.workplace_title,
            country = EXCLUDED.country,
            city = EXCLUDED.city,
            availability = EXCLUDED.availability;
    END IF;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('004_p_profile')
ON CONFLICT (name) DO NOTHING;

COMMIT;
