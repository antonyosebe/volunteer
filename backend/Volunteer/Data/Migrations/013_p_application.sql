BEGIN;

-- A volunteer applies once to a published opportunity with a short note.

CREATE OR REPLACE FUNCTION p_apply(ClientID UUID, OpportunityID UUID, Motivation TEXT)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_motivation text;
    v_type varchar;
    v_deadline date;
    v_status varchar;
    v_org_status varchar;
    v_id uuid;
BEGIN
    v_motivation := btrim(COALESCE(Motivation, ''));

    IF length(v_motivation) < 20 THEN
        RAISE EXCEPTION 'Write at least a short note about why you want to help.'
            USING ERRCODE = '22023';
    END IF;

    IF length(v_motivation) > 2000 THEN
        RAISE EXCEPTION 'Keep the note under 2000 characters.'
            USING ERRCODE = '22023';
    END IF;

    SELECT client.client_type
    INTO v_type
    FROM t_client AS client
    WHERE client.client_id = ClientID;

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'That account was not found.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_type <> 'volunteer' THEN
        RAISE EXCEPTION 'Only a volunteer can apply.'
            USING ERRCODE = '22023';
    END IF;

    SELECT opportunity.deadline, opportunity.status, organisation.status
    INTO v_deadline, v_status, v_org_status
    FROM t_opportunity AS opportunity
    JOIN t_organisation AS organisation ON organisation.organisation_id = opportunity.organisation_id
    WHERE opportunity.opportunity_id = OpportunityID
      AND NOT opportunity.is_flagged;

    IF v_status IS DISTINCT FROM 'published' OR v_org_status IS DISTINCT FROM 'approved' THEN
        RAISE EXCEPTION 'That opportunity is not open for applications.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_deadline IS NOT NULL AND v_deadline < CURRENT_DATE THEN
        RAISE EXCEPTION 'Applications for this opportunity have closed.'
            USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM t_application AS application
        WHERE application.opportunity_id = OpportunityID
          AND application.client_id = ClientID
    ) THEN
        RAISE EXCEPTION 'You have already applied to this opportunity.'
            USING ERRCODE = '22023';
    END IF;

    v_id := gen_random_uuid();

    INSERT INTO t_application (
        application_id,
        opportunity_id,
        client_id,
        motivation,
        status,
        submitted_at,
        updated_at
    )
    VALUES (
        v_id,
        OpportunityID,
        ClientID,
        v_motivation,
        'submitted',
        clock_timestamp(),
        clock_timestamp()
    );

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION p_getmyapplication(ClientID UUID, OpportunityID UUID)
RETURNS TABLE (
    application_id uuid,
    status varchar,
    motivation text,
    submitted_at timestamptz
)
LANGUAGE sql
AS $$
    SELECT application.application_id,
           application.status,
           application.motivation,
           application.submitted_at
    FROM t_application AS application
    WHERE application.client_id = ClientID
      AND application.opportunity_id = OpportunityID;
$$;

CREATE OR REPLACE FUNCTION p_listmyapplications(ClientID UUID)
RETURNS TABLE (
    application_id uuid,
    opportunity_id uuid,
    title varchar,
    organisation_name varchar,
    status varchar,
    submitted_at timestamptz
)
LANGUAGE sql
AS $$
    SELECT application.application_id,
           application.opportunity_id,
           opportunity.title,
           organisation.name,
           application.status,
           application.submitted_at
    FROM t_application AS application
    JOIN t_opportunity AS opportunity ON opportunity.opportunity_id = application.opportunity_id
    JOIN t_organisation AS organisation ON organisation.organisation_id = opportunity.organisation_id
    WHERE application.client_id = ClientID
    ORDER BY application.submitted_at DESC;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('013_p_application')
ON CONFLICT (name) DO NOTHING;

COMMIT;
