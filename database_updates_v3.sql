-- Update complete_habit_action to heal EVERYONE in the group
CREATE OR REPLACE FUNCTION complete_habit_action(
  target_user_id uuid,
  target_group_id uuid,
  pet_heal_amount int,
  boss_damage_amount int
) RETURNS void AS $$
BEGIN
  -- Heal EVERYONE'S pet in the group
  UPDATE group_members
  SET pet_hp = LEAST(100, pet_hp + pet_heal_amount)
  WHERE group_id = target_group_id;

  -- Damage boss
  UPDATE groups
  SET boss_hp = GREATEST(0, boss_hp - boss_damage_amount)
  WHERE id = target_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update process_daily_damage to damage EVERYONE if ANYONE fails
CREATE OR REPLACE FUNCTION process_daily_damage(target_group_id uuid)
RETURNS void AS $$
DECLARE
  member_record RECORD;
  habit_record RECORD;
  logs_count int;
  any_failure boolean := false;
BEGIN
  -- Check for any failure in the group
  FOR member_record IN SELECT user_id FROM group_members WHERE group_id = target_group_id LOOP
    FOR habit_record IN SELECT id FROM habits WHERE group_id = target_group_id AND user_id = member_record.user_id LOOP
      -- Check if habit was completed today
      SELECT count(*) INTO logs_count
      FROM habit_logs
      WHERE habit_id = habit_record.id
      AND user_id = member_record.user_id
      AND completed_date = CURRENT_DATE::text;

      -- If not completed, we have a failure
      IF logs_count = 0 THEN
        any_failure := true;
        EXIT; -- Found one failure, that's enough to hurt everyone
      END IF;
    END LOOP;
    IF any_failure THEN EXIT; END IF;
  END LOOP;

  -- If there was at least one failure, damage EVERYONE
  IF any_failure THEN
    UPDATE group_members
    SET pet_hp = GREATEST(0, pet_hp - 20), -- Increased damage for group failure
        pet_state = CASE WHEN pet_hp - 20 <= 0 THEN 'dead' ELSE 'sad' END
    WHERE group_id = target_group_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
