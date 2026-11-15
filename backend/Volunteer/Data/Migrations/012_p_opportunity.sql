BEGIN;

-- An organisation member can draft and post opportunities. A post is public only
-- after the organisation is approved, and only three can be posted at once.

CREATE OR REPLACE FUNCTION p_listpublicopportunities()
RETURNS TABLE (
    opportunity_id uuid,
    title varchar,
    location varchar,
    organisation_name varchar
)
LANGUAGE sql
AS $$
    SELECT opportunity.opportunity_id,
           opportunity.title,
           CASE
               WHEN opportunity.is_remote AND NULLIF(btrim(opportunity.location), '') IS NULL THEN 'Remote'
               WHEN opportunity.is_remote THEN opportunity.location || ' · Remote'
               ELSE opportunity.location
           END::varchar,
           organisation.name
    FROM t_opportunity AS opportunity
    JOIN t_organisation AS organisation ON organisation.organisation_id = opportunity.organisation_id
    WHERE opportunity.status = 'published'
      AND organisation.status = 'approved'
      AND NOT opportunity.is_flagged
    ORDER BY opportunity.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION p_getpublicopportunity(OpportunityID UUID)
RETURNS TABLE (
    title varchar,
    description text,
    location varchar,
    is_remote boolean,
    organisation_name varchar,
    category_name varchar,
    starts_on date,
    ends_on date,
    deadline date,
    time_commitment varchar,
    volunteer_count integer,
    is_paid boolean
)
LANGUAGE sql
AS $$
    SELECT opportunity.title,
           opportunity.description,
           opportunity.location,
           opportunity.is_remote,
           organisation.name,
           category.name,
           opportunity.starts_on,
           opportunity.ends_on,
           opportunity.deadline,
           opportunity.time_commitment,
           opportunity.volunteer_count,
           opportunity.is_paid
    FROM t_opportunity AS opportunity
    JOIN t_organisation AS organisation ON organisation.organisation_id = opportunity.organisation_id
    LEFT JOIN t_category AS category ON category.category_id = opportunity.category_id
    WHERE opportunity.opportunity_id = OpportunityID
      AND opportunity.status = 'published'
      AND organisation.status = 'approved'
      AND NOT opportunity.is_flagged;
$$;

CREATE OR REPLACE FUNCTION p_listorgopportunities(ClientID UUID)
RETURNS TABLE (
    opportunity_id uuid,
    title varchar,
    status varchar,
    location varchar,
    is_remote boolean,
    category_name varchar
)
LANGUAGE sql
AS $$
    SELECT opportunity.opportunity_id,
           opportunity.title,
           opportunity.status,
           opportunity.location,
           opportunity.is_remote,
           category.name
    FROM t_opportunity AS opportunity
    JOIN t_organisationmember AS member ON member.organisation_id = opportunity.organisation_id
    LEFT JOIN t_category AS category ON category.category_id = opportunity.category_id
    WHERE member.client_id = ClientID
      AND member.member_role IN ('org_admin', 'org_member')
    ORDER BY opportunity.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION p_getorgopportunity(ClientID UUID, OpportunityID UUID)
RETURNS TABLE (
    opportunity_id uuid,
    title varchar,
    description text,
    category_id integer,
    location varchar,
    is_remote boolean,
    starts_on date,
    ends_on date,
    time_commitment varchar,
    volunteer_count integer,
    deadline date,
    is_paid boolean,
    status varchar,
    organisation_status varchar
)
LANGUAGE sql
AS $$
    SELECT opportunity.opportunity_id,
           opportunity.title,
           opportunity.description,
           opportunity.category_id,
           opportunity.location,
           opportunity.is_remote,
           opportunity.starts_on,
           opportunity.ends_on,
           opportunity.time_commitment,
           opportunity.volunteer_count,
           opportunity.deadline,
           opportunity.is_paid,
           opportunity.status,
           organisation.status
    FROM t_opportunity AS opportunity
    JOIN t_organisation AS organisation ON organisation.organisation_id = opportunity.organisation_id
    JOIN t_organisationmember AS member ON member.organisation_id = opportunity.organisation_id
    WHERE opportunity.opportunity_id = OpportunityID
      AND member.client_id = ClientID
      AND member.member_role IN ('org_admin', 'org_member');
$$;

CREATE OR REPLACE PROCEDURE p_saveopportunity
(
    ClientID UUID,
    INOUT OpportunityID UUID,
    Title VARCHAR,
    Description TEXT,
    CategoryID INTEGER,
    Location VARCHAR,
    IsRemote BOOLEAN,
    StartsOn DATE,
    EndsOn DATE,
    TimeCommitment VARCHAR,
    VolunteerCount INTEGER,
    Deadline DATE,
    IsPaid BOOLEAN,
    Publish BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_org uuid;
    v_org_status varchar(32);
    v_title varchar(200);
    v_description text;
    v_location varchar(200);
    v_commitment varchar(120);
    v_current varchar(32);
    v_status varchar(32);
    v_published integer;
BEGIN
    v_title := NULLIF(btrim(Title), '');
    v_description := NULLIF(btrim(Description), '');
    v_location := NULLIF(btrim(Location), '');
    v_commitment := NULLIF(btrim(TimeCommitment), '');

    IF ClientID IS NULL OR v_title IS NULL OR v_description IS NULL THEN
        RAISE EXCEPTION 'Enter a title and a description.'
            USING ERRCODE = '22023';
    END IF;

    IF VolunteerCount IS NOT NULL AND (VolunteerCount < 1 OR VolunteerCount > 10000) THEN
        RAISE EXCEPTION 'Enter a volunteer count from 1 to 10000.'
            USING ERRCODE = '22023';
    END IF;

    IF StartsOn IS NOT NULL AND EndsOn IS NOT NULL AND EndsOn < StartsOn THEN
        RAISE EXCEPTION 'The end date cannot be before the start date.'
            USING ERRCODE = '22023';
    END IF;

    SELECT member.organisation_id, organisation.status
    INTO v_org, v_org_status
    FROM t_organisationmember AS member
    JOIN t_organisation AS organisation ON organisation.organisation_id = member.organisation_id
    WHERE member.client_id = ClientID
      AND member.member_role IN ('org_admin', 'org_member')
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only an organisation account can post an opportunity.'
            USING ERRCODE = '22023';
    END IF;

    IF OpportunityID IS NOT NULL THEN
        SELECT opportunity.status
        INTO v_current
        FROM t_opportunity AS opportunity
        WHERE opportunity.opportunity_id = OpportunityID
          AND opportunity.organisation_id = v_org;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'That opportunity is not yours.'
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    IF COALESCE(Publish, false) THEN
        IF v_org_status <> 'approved' THEN
            RAISE EXCEPTION 'Your organisation must be approved before you can post.'
                USING ERRCODE = '22023';
        END IF;

        SELECT count(*)
        INTO v_published
        FROM t_opportunity AS opportunity
        WHERE opportunity.organisation_id = v_org
          AND opportunity.status = 'published'
          AND (OpportunityID IS NULL OR opportunity.opportunity_id <> OpportunityID);

        IF v_published >= 3 THEN
            RAISE EXCEPTION 'An organisation can have three posted opportunities at a time.'
                USING ERRCODE = '22023';
        END IF;

        v_status := 'published';
    ELSIF v_current IS NULL THEN
        v_status := 'draft';
    ELSE
        v_status := v_current;
    END IF;

    IF OpportunityID IS NULL THEN
        OpportunityID := gen_random_uuid();
        INSERT INTO t_opportunity (
            opportunity_id, organisation_id, title, description, category_id, location, is_remote,
            starts_on, ends_on, time_commitment, volunteer_count, deadline, is_paid, status,
            created_at, updated_at
        )
        VALUES (
            OpportunityID, v_org, v_title, v_description, CategoryID, v_location, COALESCE(IsRemote, false),
            StartsOn, EndsOn, v_commitment, VolunteerCount, Deadline, COALESCE(IsPaid, false), v_status,
            clock_timestamp(), clock_timestamp()
        );
    ELSE
        UPDATE t_opportunity AS opportunity
        SET title = v_title,
            description = v_description,
            category_id = CategoryID,
            location = v_location,
            is_remote = COALESCE(IsRemote, false),
            starts_on = StartsOn,
            ends_on = EndsOn,
            time_commitment = v_commitment,
            volunteer_count = VolunteerCount,
            deadline = Deadline,
            is_paid = COALESCE(IsPaid, false),
            status = v_status,
            updated_at = clock_timestamp()
        WHERE opportunity.opportunity_id = OpportunityID;
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE p_setopportunitystatus
(
    ClientID UUID,
    OpportunityID UUID,
    Status VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_org uuid;
    v_org_status varchar(32);
    v_status varchar(32);
    v_published integer;
BEGIN
    v_status := lower(btrim(COALESCE(Status, '')));
    IF v_status NOT IN ('draft', 'published', 'unpublished', 'closed') THEN
        RAISE EXCEPTION 'Choose draft, posted, unpublished, or closed.'
            USING ERRCODE = '22023';
    END IF;

    SELECT member.organisation_id, organisation.status
    INTO v_org, v_org_status
    FROM t_organisationmember AS member
    JOIN t_organisation AS organisation ON organisation.organisation_id = member.organisation_id
    WHERE member.client_id = ClientID
      AND member.member_role IN ('org_admin', 'org_member')
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only an organisation account can post an opportunity.'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM t_opportunity AS opportunity
        WHERE opportunity.opportunity_id = OpportunityID
          AND opportunity.organisation_id = v_org
    ) THEN
        RAISE EXCEPTION 'That opportunity is not yours.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status = 'published' THEN
        IF v_org_status <> 'approved' THEN
            RAISE EXCEPTION 'Your organisation must be approved before you can post.'
                USING ERRCODE = '22023';
        END IF;

        SELECT count(*)
        INTO v_published
        FROM t_opportunity AS opportunity
        WHERE opportunity.organisation_id = v_org
          AND opportunity.status = 'published'
          AND opportunity.opportunity_id <> OpportunityID;

        IF v_published >= 3 THEN
            RAISE EXCEPTION 'An organisation can have three posted opportunities at a time.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    UPDATE t_opportunity AS opportunity
    SET status = v_status,
        updated_at = clock_timestamp()
    WHERE opportunity.opportunity_id = OpportunityID;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('012_p_opportunity')
ON CONFLICT (name) DO NOTHING;

COMMIT;
