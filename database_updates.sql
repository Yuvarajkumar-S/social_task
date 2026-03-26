ALTER TABLE users ADD COLUMN IF NOT EXISTS leetcode_handle text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS duolingo_handle text;

ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS confidence integer DEFAULT 0;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS reasoning text;

CREATE TABLE IF NOT EXISTS xp_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all xp_ledger entries" ON xp_ledger FOR SELECT USING (true);
CREATE POLICY "Users can insert their own xp_ledger entries" ON xp_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
