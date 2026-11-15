BEGIN;

-- p_adminweeks counts volunteers and organisations created in each week of this month.
CREATE OR REPLACE FUNCTION p_adminweeks()
RETURNS TABLE (
    week_index integer,
    volunteers integer,
    organisations integer
)
LANGUAGE sql
AS $$
    WITH bounds AS (
        SELECT date_trunc('month', clock_timestamp()) AS start_at
    ),
    weeks AS (
        SELECT generate_series(0, 3) AS week_index
    )
    SELECT
        weeks.week_index,
        (
            SELECT COUNT(*)::integer
            FROM t_client AS client
            CROSS JOIN bounds
            WHERE client.client_type = 'volunteer'
              AND client.created_at >= bounds.start_at
              AND client.created_at < bounds.start_at + interval '1 month'
              AND LEAST(3, floor(extract(day FROM client.created_at - bounds.start_at) / 7)::integer) = weeks.week_index
        ),
        (
            SELECT COUNT(*)::integer
            FROM t_organisation AS organisation
            CROSS JOIN bounds
            WHERE organisation.created_at >= bounds.start_at
              AND organisation.created_at < bounds.start_at + interval '1 month'
              AND LEAST(3, floor(extract(day FROM organisation.created_at - bounds.start_at) / 7)::integer) = weeks.week_index
        )
    FROM weeks
    ORDER BY weeks.week_index;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('009_p_adminweeks')
ON CONFLICT (name) DO NOTHING;

COMMIT;
