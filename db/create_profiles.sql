-- Create profiles table referencing auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  address text,
  unique_door_id text UNIQUE
);

-- Note: Row-Level Security (RLS) is not enabled by this migration.
-- To enable RLS and appropriate policies, run:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow insert by authenticated" ON profiles
--   FOR INSERT TO auth.role WHEN (true) WITH CHECK (auth.role() = 'authenticated');
