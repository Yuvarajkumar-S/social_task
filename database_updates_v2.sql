-- Add avatar_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE TABLE IF NOT EXISTS group_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their groups" ON group_messages;
CREATE POLICY "Users can view messages in their groups" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their groups" ON group_messages;
CREATE POLICY "Users can insert messages in their groups" ON group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- RPC for completing a habit and updating pet/boss
CREATE OR REPLACE FUNCTION complete_habit_action(
  target_user_id uuid,
  target_group_id uuid,
  pet_heal_amount int,
  boss_damage_amount int
) RETURNS void AS $$
BEGIN
  -- Heal pet
  UPDATE group_members
  SET pet_hp = LEAST(100, pet_hp + pet_heal_amount)
  WHERE user_id = target_user_id AND group_id = target_group_id;

  -- Damage boss
  UPDATE groups
  SET boss_hp = GREATEST(0, boss_hp - boss_damage_amount)
  WHERE id = target_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for processing daily damage (simulated midnight)
CREATE OR REPLACE FUNCTION process_daily_damage(target_group_id uuid)
RETURNS void AS $$
DECLARE
  member_record RECORD;
  habit_record RECORD;
  logs_count int;
BEGIN
  FOR member_record IN SELECT user_id FROM group_members WHERE group_id = target_group_id LOOP
    FOR habit_record IN SELECT id FROM habits WHERE group_id = target_group_id LOOP
      -- Check if habit was completed today
      SELECT count(*) INTO logs_count
      FROM habit_logs
      WHERE habit_id = habit_record.id
      AND user_id = member_record.user_id
      AND completed_date = CURRENT_DATE::text;

      -- If not completed, damage pet
      IF logs_count = 0 THEN
        UPDATE group_members
        SET pet_hp = GREATEST(0, pet_hp - 10),
            pet_state = CASE WHEN pet_hp - 10 <= 0 THEN 'dead' ELSE 'sad' END
        WHERE user_id = member_record.user_id AND group_id = target_group_id;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

