BEGIN;

-- p_getstaff reads a platform staff account. The password is checked by the API.
DROP PROCEDURE IF EXISTS p_getstaff(character varying, uuid, text, character varying, boolean);

CREATE OR REPLACE PROCEDURE p_getstaff
(
    Email VARCHAR,
    INOUT UserID UUID,
    INOUT PasswordHash TEXT,
    INOUT FullName VARCHAR,
    INOUT IsActive BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_email varchar(256);
BEGIN
    v_email := NULLIF(lower(btrim(Email)), '');

    SELECT staff.user_id, staff.password_hash, staff.full_name, staff.is_active
    INTO UserID, PasswordHash, FullName, IsActive
    FROM t_users AS staff
    WHERE lower(staff.email) = v_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Email or password is incorrect.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- p_setorganisationstatus approves, rejects, or suspends an organisation.
DROP PROCEDURE IF EXISTS p_setorganisationstatus(uuid, character varying);

CREATE OR REPLACE PROCEDURE p_setorganisationstatus
(
    OrganisationID UUID,
    Status VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status varchar(32);
BEGIN
    v_status := NULLIF(lower(btrim(Status)), '');
    IF v_status IS NULL OR v_status NOT IN ('pending', 'approved', 'rejected', 'suspended') THEN
        RAISE EXCEPTION 'Choose pending, approved, rejected, or suspended.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE t_organisation AS organisation
    SET status = v_status,
        updated_at = clock_timestamp()
    WHERE organisation.organisation_id = OrganisationID;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No organisation uses that id.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION p_listorganisations(StatusFilter VARCHAR)
RETURNS TABLE (
    organisation_id uuid,
    name varchar,
    email varchar,
    status varchar
)
LANGUAGE sql
AS $$
    SELECT organisation.organisation_id, organisation.name, organisation.email, organisation.status
    FROM t_organisation AS organisation
    WHERE StatusFilter IS NULL OR organisation.status = lower(btrim(StatusFilter))
    ORDER BY organisation.name;
$$;

INSERT INTO t_users (user_id, email, password_hash, full_name, is_active, created_at, updated_at)
VALUES (
    'a1d0a0a0-0000-4000-8000-000000000001',
    'admin@gmail.com',
    'AQAAAAIAAYagAAAAENG5R8T1BDO3aPtyIlNxm6xKJgFhysduNzEDca69OHpYVdzZ0VHRAM2kj5/5IuT7dw==',
    'Admin',
    true,
    clock_timestamp(),
    clock_timestamp()
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true,
    updated_at = clock_timestamp();

INSERT INTO t_userprivilege (user_id, privilege_id)
SELECT staff.user_id, privilege.privilege_id
FROM t_users AS staff
JOIN t_privilege AS privilege ON privilege.code = 'admin'
WHERE staff.email = 'admin@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO t_schemamigration (name)
VALUES ('007_p_staff')
ON CONFLICT (name) DO NOTHING;

COMMIT;
