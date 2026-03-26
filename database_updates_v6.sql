-- Fix process_daily_damage to reliably apply pet damage/state updates for group habits
CREATE OR REPLACE FUNCTION process_daily_damage(target_group_id uuid)
RETURNS text AS $$
DECLARE
  daily_damage_amount int := 20;
  tasks_count int := 0;
  members_count int := 0;
  updated_members int := 0;
  any_failure boolean := false;
BEGIN
  -- Count tasks and members first.
  SELECT count(*) INTO tasks_count FROM group_tasks WHERE group_id = target_group_id;
  SELECT count(*) INTO members_count FROM group_members WHERE group_id = target_group_id;

  IF members_count = 0 THEN
    RETURN 'No group members found for this group. No damage applied.';
  END IF;

  IF tasks_count = 0 THEN
    RETURN 'No group tasks found for this group. No damage applied.';
  END IF;

  -- If any member missed any group task for today, everyone takes daily damage.
  SELECT EXISTS (
    SELECT 1
    FROM group_members gm
    JOIN group_tasks gt
      ON gt.group_id = gm.group_id
    LEFT JOIN group_task_completions gtc
      ON gtc.group_task_id = gt.id
      AND gtc.user_id = gm.user_id
      AND gtc.completed_date::text = CURRENT_DATE::text
    WHERE gm.group_id = target_group_id
      AND gtc.id IS NULL
  ) INTO any_failure;

  IF NOT any_failure THEN
    RETURN 'All members completed all tasks. No damage applied.';
  END IF;

  UPDATE group_members gm
  SET pet_hp = hp_after_damage.new_hp,
      pet_state = CASE
        WHEN hp_after_damage.new_hp <= 0 THEN 'dead'
        ELSE 'sad'
      END
  FROM (
    SELECT id,
           GREATEST(0, COALESCE(pet_hp, 100) - daily_damage_amount) AS new_hp
    FROM group_members
    WHERE group_id = target_group_id
  ) AS hp_after_damage
  WHERE gm.id = hp_after_damage.id;

  GET DIAGNOSTICS updated_members = ROW_COUNT;

  RETURN 'Damage applied: -' || daily_damage_amount || ' HP to ' || updated_members || ' member(s) due to incomplete tasks.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
