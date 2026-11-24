BEGIN;

INSERT INTO t_applicationsetting (setting_key, setting_value) VALUES
    ('primary_color', '#1286c8'),
    ('logo_path', '')
ON CONFLICT (setting_key) DO NOTHING;

DROP PROCEDURE IF EXISTS p_savesettings(character varying, character varying, character varying);

CREATE OR REPLACE PROCEDURE p_savesettings(SiteName VARCHAR, SupportEmail VARCHAR, Tagline VARCHAR, PrimaryColor VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
    v_name text;
    v_email text;
    v_tagline text;
    v_color text;
BEGIN
    v_name := NULLIF(btrim(SiteName), '');
    v_email := NULLIF(lower(btrim(SupportEmail)), '');
    v_tagline := NULLIF(btrim(Tagline), '');
    v_color := NULLIF(lower(btrim(PrimaryColor)), '');
    IF v_name IS NULL OR v_email IS NULL OR v_tagline IS NULL THEN
        RAISE EXCEPTION 'Enter the site name, support email, and tagline.'
            USING ERRCODE = '22023';
    END IF;
    IF v_color IS NULL OR v_color !~ '^#[0-9a-f]{6}$' THEN
        RAISE EXCEPTION 'Choose a color like #1286c8.'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO t_applicationsetting (setting_key, setting_value) VALUES
        ('site_name', v_name),
        ('support_email', v_email),
        ('tagline', v_tagline),
        ('primary_color', v_color)
    ON CONFLICT (setting_key) DO UPDATE
    SET setting_value = EXCLUDED.setting_value;
END;
$$;

CREATE OR REPLACE PROCEDURE p_savelogo(LogoPath TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO t_applicationsetting (setting_key, setting_value)
    VALUES ('logo_path', COALESCE(LogoPath, ''))
    ON CONFLICT (setting_key) DO UPDATE
    SET setting_value = EXCLUDED.setting_value;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('023_p_branding')
ON CONFLICT (name) DO NOTHING;

COMMIT;
