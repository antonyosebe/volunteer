BEGIN;

-- The public list needs the same facts the opportunity page shows, so a card can be chosen before it is opened.

DROP FUNCTION IF EXISTS p_listpublicopportunities();

CREATE FUNCTION p_listpublicopportunities()
RETURNS TABLE (
    opportunity_id uuid,
    title varchar,
    location varchar,
    organisation_name varchar,
    category_name varchar,
    time_commitment varchar,
    volunteer_count integer,
    is_paid boolean
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
           organisation.name,
           category.name,
           opportunity.time_commitment,
           opportunity.volunteer_count,
           opportunity.is_paid
    FROM t_opportunity AS opportunity
    JOIN t_organisation AS organisation ON organisation.organisation_id = opportunity.organisation_id
    LEFT JOIN t_category AS category ON category.category_id = opportunity.category_id
    WHERE opportunity.status = 'published'
      AND organisation.status = 'approved'
      AND NOT opportunity.is_flagged
    ORDER BY opportunity.created_at DESC;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('014_p_listpublic')
ON CONFLICT (name) DO NOTHING;

COMMIT;
