BEGIN;

-- p_addedituser adds or edits a volunteer or organisation account in t_client.
-- A null ClientID with a name and account type inserts a row and returns the new id.
-- A null ClientID with only an email updates that existing account.
-- An existing ClientID updates that row. A null value on edit leaves that column unchanged.
-- Volunteers get an empty profile row.
DROP PROCEDURE IF EXISTS p_addedituser(uuid, character varying, text, character varying, character varying, character varying, boolean);

CREATE OR REPLACE PROCEDURE p_addedituser
(
    INOUT ClientID UUID,
    Email VARCHAR,
    PasswordHash TEXT,
    FullName VARCHAR,
    ClientType VARCHAR,
    Phone VARCHAR DEFAULT NULL,
    IsActive BOOLEAN DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_now timestamptz := clock_timestamp();
    v_email varchar(256);
    v_name varchar(200);
    v_phone varchar(40);
    v_phone_provided boolean;
    v_type varchar(32);
BEGIN
    v_email := NULLIF(lower(btrim(Email)), '');
    v_name := NULLIF(btrim(FullName), '');
    v_phone_provided := Phone IS NOT NULL;
    v_phone := NULLIF(btrim(Phone), '');

    IF ClientType IS NOT NULL AND ClientType NOT IN ('volunteer', 'org_admin', 'org_member') THEN
        RAISE EXCEPTION 'Choose a volunteer or an organisation account.'
            USING ERRCODE = '22023';
    END IF;

    IF ClientID IS NULL AND v_name IS NULL AND ClientType IS NULL THEN
        IF v_email IS NULL THEN
            RAISE EXCEPTION 'Enter the email on your account.'
                USING ERRCODE = '22023';
        END IF;

        UPDATE t_client AS client
        SET password_hash = COALESCE(NULLIF(PasswordHash, ''), client.password_hash),
            phone = CASE WHEN v_phone_provided THEN v_phone ELSE client.phone END,
            is_active = COALESCE(IsActive, client.is_active),
            updated_at = v_now
        WHERE lower(client.email) = v_email
        RETURNING client.client_id, client.client_type INTO ClientID, v_type;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No account uses that email.'
                USING ERRCODE = 'P0002';
        END IF;
    ELSIF ClientID IS NULL THEN
        IF v_email IS NULL OR PasswordHash IS NULL OR length(PasswordHash) = 0
            OR v_name IS NULL OR ClientType IS NULL THEN
            RAISE EXCEPTION 'Email, password, name, and account type are required.'
                USING ERRCODE = '22023';
        END IF;

        ClientID := gen_random_uuid();
        INSERT INTO t_client (
            client_id, email, password_hash, full_name, phone, client_type, is_active, created_at, updated_at
        ) VALUES (
            ClientID,
            v_email,
            PasswordHash,
            v_name,
            v_phone,
            ClientType,
            COALESCE(IsActive, true),
            v_now,
            v_now
        );
        v_type := ClientType;
    ELSE
        UPDATE t_client AS client
        SET email = COALESCE(v_email, client.email),
            password_hash = COALESCE(NULLIF(PasswordHash, ''), client.password_hash),
            full_name = COALESCE(v_name, client.full_name),
            phone = CASE WHEN v_phone_provided THEN v_phone ELSE client.phone END,
            client_type = COALESCE(ClientType, client.client_type),
            is_active = COALESCE(IsActive, client.is_active),
            updated_at = v_now
        WHERE client.client_id = ClientID
        RETURNING client.client_type INTO v_type;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No account uses that id.'
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    IF v_type = 'volunteer' THEN
        INSERT INTO t_volunteerprofile (client_id)
        VALUES (ClientID)
        ON CONFLICT (client_id) DO NOTHING;
    END IF;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('002_p_addedituser')
ON CONFLICT (name) DO NOTHING;

COMMIT;
