-- 1. Make group_id nullable in habits table to support personal habits
ALTER TABLE habits ALTER COLUMN group_id DROP NOT NULL;

-- 2. Add personal pet stats to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_pet_hp integer DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_pet_name text DEFAULT 'Buddy';
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_pet_state text DEFAULT 'happy';

-- 3. Update complete_habit_action to handle personal habits (null group_id)
CREATE OR REPLACE FUNCTION complete_habit_action(
  target_user_id uuid,
  target_group_id uuid,
  pet_heal_amount int,
  boss_damage_amount int
) RETURNS void AS $$
BEGIN
  IF target_group_id IS NOT NULL THEN
    -- GROUP HABIT LOGIC
    -- Heal EVERYONE'S pet in the group
    UPDATE group_members
    SET pet_hp = LEAST(100, pet_hp + pet_heal_amount)
    WHERE group_id = target_group_id;

    -- Damage boss
    UPDATE groups
    SET boss_hp = GREATEST(0, boss_hp - boss_damage_amount)
    WHERE id = target_group_id;
  ELSE
    -- PERSONAL HABIT LOGIC
    UPDATE users
    SET personal_pet_hp = LEAST(100, personal_pet_hp + pet_heal_amount)
    WHERE id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update process_daily_damage to handle personal habits
-- This would typically be run by a cron job, but we'll update the logic for when it's triggered
CREATE OR REPLACE FUNCTION process_personal_daily_damage(target_user_id uuid)
RETURNS void AS $$
DECLARE
  habit_record RECORD;
  logs_count int;
  any_failure boolean := false;
BEGIN
  -- Check for any personal habit failure
  FOR habit_record IN SELECT id FROM habits WHERE user_id = target_user_id AND group_id IS NULL LOOP
    SELECT count(*) INTO logs_count
    FROM habit_logs
    WHERE habit_id = habit_record.id
    AND user_id = target_user_id
    AND completed_date = CURRENT_DATE::text;

    IF logs_count = 0 THEN
      any_failure := true;
      EXIT;
    END IF;
  END LOOP;

  IF any_failure THEN
    UPDATE users
    SET personal_pet_hp = GREATEST(0, personal_pet_hp - 15),
        personal_pet_state = CASE WHEN personal_pet_hp - 15 <= 0 THEN 'dead' ELSE 'sad' END
    WHERE id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Group midnight damage (used by "Simulate Midnight" RPC button)
-- Damages every group member if any member missed any group task for today.
DROP FUNCTION IF EXISTS process_daily_damage(uuid);
CREATE OR REPLACE FUNCTION process_daily_damage(target_group_id uuid)
RETURNS text AS $$
DECLARE
  daily_damage_amount int := 20;
  tasks_count int := 0;
  members_count int := 0;
  updated_members int := 0;
  any_failure boolean := false;
BEGIN
  SELECT count(*) INTO tasks_count FROM group_tasks WHERE group_id = target_group_id;
  SELECT count(*) INTO members_count FROM group_members WHERE group_id = target_group_id;

  IF members_count = 0 THEN
    RETURN 'No group members found for this group. No damage applied.';
  END IF;

  IF tasks_count = 0 THEN
    RETURN 'No group tasks found for this group. No damage applied.';
  END IF;

  -- If any member has at least one missing completion today, the whole group takes damage.
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

  -- Compute new HP first, then derive state from that new HP to avoid stale-state updates.
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
