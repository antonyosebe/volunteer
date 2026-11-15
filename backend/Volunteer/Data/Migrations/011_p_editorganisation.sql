BEGIN;

-- p_editorganisation lets an organisation admin update their own profile.
CREATE OR REPLACE PROCEDURE p_editorganisation
(
    ClientID UUID,
    Name VARCHAR,
    City VARCHAR,
    Country VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_name varchar(200);
    v_city varchar(120);
    v_country varchar(120);
    v_org uuid;
BEGIN
    v_name := NULLIF(btrim(Name), '');
    v_city := NULLIF(btrim(City), '');
    v_country := NULLIF(btrim(Country), '');

    IF ClientID IS NULL OR v_name IS NULL THEN
        RAISE EXCEPTION 'Enter the organisation name.'
            USING ERRCODE = '22023';
    END IF;

    SELECT member.organisation_id
    INTO v_org
    FROM t_organisationmember AS member
    WHERE member.client_id = ClientID
      AND member.member_role = 'org_admin';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only an organisation admin can edit this profile.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE t_organisation AS organisation
    SET name = v_name,
        city = v_city,
        country = v_country,
        updated_at = clock_timestamp()
    WHERE organisation.organisation_id = v_org;

    UPDATE t_client AS client
    SET full_name = v_name,
        updated_at = clock_timestamp()
    WHERE client.client_id = ClientID;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('011_p_editorganisation')
ON CONFLICT (name) DO NOTHING;

COMMIT;
