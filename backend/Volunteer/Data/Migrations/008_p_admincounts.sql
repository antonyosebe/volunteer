BEGIN;

-- p_admincounts returns the figures shown on the staff dashboard.
CREATE OR REPLACE FUNCTION p_admincounts()
RETURNS TABLE (
    volunteers integer,
    organisations integer,
    pending_organisations integer,
    approved_organisations integer
)
LANGUAGE sql
AS $$
    SELECT
        (SELECT COUNT(*)::integer FROM t_client AS client WHERE client.client_type = 'volunteer'),
        (SELECT COUNT(*)::integer FROM t_organisation),
        (SELECT COUNT(*)::integer FROM t_organisation AS organisation WHERE organisation.status = 'pending'),
        (SELECT COUNT(*)::integer FROM t_organisation AS organisation WHERE organisation.status = 'approved');
$$;

INSERT INTO t_schemamigration (name)
VALUES ('008_p_admincounts')
ON CONFLICT (name) DO NOTHING;

COMMIT;
