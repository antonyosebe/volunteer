BEGIN;

-- An organisation sees applications only for opportunities it owns.

CREATE OR REPLACE FUNCTION p_listreceivedapplications(ClientID UUID)
RETURNS TABLE (
    application_id uuid,
    opportunity_id uuid,
    title varchar,
    full_name varchar,
    email varchar,
    motivation text,
    status varchar,
    submitted_at timestamptz
)
LANGUAGE sql
AS $$
    SELECT application.application_id,
           application.opportunity_id,
           opportunity.title,
           client.full_name,
           client.email,
           application.motivation,
           application.status,
           application.submitted_at
    FROM t_application AS application
    JOIN t_opportunity AS opportunity ON opportunity.opportunity_id = application.opportunity_id
    JOIN t_organisationmember AS member ON member.organisation_id = opportunity.organisation_id
    JOIN t_client AS client ON client.client_id = application.client_id
    WHERE member.client_id = ClientID
      AND member.member_role IN ('org_admin', 'org_member')
    ORDER BY application.submitted_at DESC;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('015_p_listreceived')
ON CONFLICT (name) DO NOTHING;

COMMIT;
