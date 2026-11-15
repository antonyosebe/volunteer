BEGIN;

-- A volunteer chooses skills, hobbies, and focus areas, including a name that is not listed yet.

CREATE OR REPLACE FUNCTION p_listprofilechoices(ClientID UUID)
RETURNS TABLE (
    kind varchar,
    choice_id integer,
    name varchar,
    selected boolean
)
LANGUAGE sql
AS $$
    SELECT 'skill'::varchar,
           skill.skill_id,
           skill.name,
           EXISTS (
               SELECT 1
               FROM t_volunteerskill AS link
               WHERE link.client_id = ClientID
                 AND link.skill_id = skill.skill_id
           )
    FROM t_skill AS skill
    WHERE skill.is_active
    UNION ALL
    SELECT 'hobby'::varchar,
           hobby.hobby_id,
           hobby.name,
           EXISTS (
               SELECT 1
               FROM t_volunteerhobby AS link
               WHERE link.client_id = ClientID
                 AND link.hobby_id = hobby.hobby_id
           )
    FROM t_hobby AS hobby
    WHERE hobby.is_active
    UNION ALL
    SELECT 'focus'::varchar,
           focus.focus_area_id,
           focus.name,
           EXISTS (
               SELECT 1
               FROM t_volunteerfocus AS link
               WHERE link.client_id = ClientID
                 AND link.focus_area_id = focus.focus_area_id
           )
    FROM t_focusarea AS focus
    WHERE focus.is_active
    ORDER BY 1, 3;
$$;

CREATE OR REPLACE PROCEDURE p_saveprofilechoices
(
    ClientID UUID,
    SkillNames TEXT[],
    HobbyNames TEXT[],
    FocusNames TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_type varchar;
    v_name text;
    v_id integer;
    v_skill_ids integer[] := ARRAY[]::integer[];
    v_hobby_ids integer[] := ARRAY[]::integer[];
    v_focus_ids integer[] := ARRAY[]::integer[];
BEGIN
    SELECT client.client_type
    INTO v_type
    FROM t_client AS client
    WHERE client.client_id = ClientID;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No account uses that id.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_type <> 'volunteer' THEN
        RAISE EXCEPTION 'Only a volunteer can choose skills.'
            USING ERRCODE = '22023';
    END IF;

    IF COALESCE(cardinality(SkillNames), 0) > 20
        OR COALESCE(cardinality(HobbyNames), 0) > 20
        OR COALESCE(cardinality(FocusNames), 0) > 20 THEN
        RAISE EXCEPTION 'Choose up to 20 in each list.'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO t_volunteerprofile (client_id)
    VALUES (ClientID)
    ON CONFLICT (client_id) DO NOTHING;

    FOREACH v_name IN ARRAY COALESCE(SkillNames, ARRAY[]::text[])
    LOOP
        v_name := btrim(v_name);
        IF v_name = '' THEN
            CONTINUE;
        END IF;
        IF length(v_name) > 80 THEN
            RAISE EXCEPTION 'Keep each skill under 80 characters.'
                USING ERRCODE = '22023';
        END IF;

        SELECT skill.skill_id
        INTO v_id
        FROM t_skill AS skill
        WHERE lower(skill.name) = lower(v_name)
        LIMIT 1;

        IF v_id IS NULL THEN
            INSERT INTO t_skill (name)
            VALUES (v_name)
            ON CONFLICT (name) DO NOTHING;

            SELECT skill.skill_id
            INTO v_id
            FROM t_skill AS skill
            WHERE lower(skill.name) = lower(v_name)
            LIMIT 1;
        END IF;

        v_skill_ids := array_append(v_skill_ids, v_id);
    END LOOP;

    DELETE FROM t_volunteerskill AS link
    WHERE link.client_id = ClientID
      AND NOT (link.skill_id = ANY (v_skill_ids));

    INSERT INTO t_volunteerskill (client_id, skill_id)
    SELECT ClientID, item_id
    FROM unnest(v_skill_ids) AS item_id
    ON CONFLICT DO NOTHING;

    FOREACH v_name IN ARRAY COALESCE(HobbyNames, ARRAY[]::text[])
    LOOP
        v_name := btrim(v_name);
        IF v_name = '' THEN
            CONTINUE;
        END IF;
        IF length(v_name) > 80 THEN
            RAISE EXCEPTION 'Keep each hobby under 80 characters.'
                USING ERRCODE = '22023';
        END IF;

        SELECT hobby.hobby_id
        INTO v_id
        FROM t_hobby AS hobby
        WHERE lower(hobby.name) = lower(v_name)
        LIMIT 1;

        IF v_id IS NULL THEN
            INSERT INTO t_hobby (name)
            VALUES (v_name)
            ON CONFLICT (name) DO NOTHING;

            SELECT hobby.hobby_id
            INTO v_id
            FROM t_hobby AS hobby
            WHERE lower(hobby.name) = lower(v_name)
            LIMIT 1;
        END IF;

        v_hobby_ids := array_append(v_hobby_ids, v_id);
    END LOOP;

    DELETE FROM t_volunteerhobby AS link
    WHERE link.client_id = ClientID
      AND NOT (link.hobby_id = ANY (v_hobby_ids));

    INSERT INTO t_volunteerhobby (client_id, hobby_id)
    SELECT ClientID, item_id
    FROM unnest(v_hobby_ids) AS item_id
    ON CONFLICT DO NOTHING;

    FOREACH v_name IN ARRAY COALESCE(FocusNames, ARRAY[]::text[])
    LOOP
        v_name := btrim(v_name);
        IF v_name = '' THEN
            CONTINUE;
        END IF;
        IF length(v_name) > 80 THEN
            RAISE EXCEPTION 'Keep each focus area under 80 characters.'
                USING ERRCODE = '22023';
        END IF;

        SELECT focus.focus_area_id
        INTO v_id
        FROM t_focusarea AS focus
        WHERE lower(focus.name) = lower(v_name)
        LIMIT 1;

        IF v_id IS NULL THEN
            INSERT INTO t_focusarea (name)
            VALUES (v_name)
            ON CONFLICT (name) DO NOTHING;

            SELECT focus.focus_area_id
            INTO v_id
            FROM t_focusarea AS focus
            WHERE lower(focus.name) = lower(v_name)
            LIMIT 1;
        END IF;

        v_focus_ids := array_append(v_focus_ids, v_id);
    END LOOP;

    DELETE FROM t_volunteerfocus AS link
    WHERE link.client_id = ClientID
      AND NOT (link.focus_area_id = ANY (v_focus_ids));

    INSERT INTO t_volunteerfocus (client_id, focus_area_id)
    SELECT ClientID, item_id
    FROM unnest(v_focus_ids) AS item_id
    ON CONFLICT DO NOTHING;
END;
$$;

INSERT INTO t_schemamigration (name)
VALUES ('016_p_profilechoices')
ON CONFLICT (name) DO NOTHING;

COMMIT;
