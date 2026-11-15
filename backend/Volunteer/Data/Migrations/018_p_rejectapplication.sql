BEGIN;

-- An organisation rejects an application only for an opportunity it owns.

CREATE OR REPLACE FUNCTION p_rejectapplication(ClientID UUID, ApplicationID UUID)
RETURNS varchar
LANGUAGE plpgsql
AS $$
DECLARE
    v_client uuid := ClientID;
    v_application uuid := ApplicationID;
    v_found uuid;
BEGIN
    SELECT application.application_id
    INTO v_found
    FROM t_application AS application
    WHERE application.application_id = v_application;

    IF v_found IS NULL THEN
        RAISE EXCEPTION 'That application was not found.'
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM t_application AS application
        JOIN t_opportunity AS opportunity ON opportunity.opportunity_id = application.opportunity_id
        JOIN t_organisationmember AS member ON member.organisation_id = opportunity.organisation_id
        WHERE application.application_id = v_application
          AND member.client_id = v_client
          AND member.member_role IN ('org_admin', 'org_member')
    ) THEN
        RAISE EXCEPTION 'That application is not yours to decide.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE t_application AS application
    SET status = 'declined',
        updated_at = CURRENT_TIMESTAMP
    WHERE application.application_id = v_application;

    RETURN 'declined';
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('018_p_rejectapplication')
ON CONFLICT (name) DO NOTHING;

COMMIT;
