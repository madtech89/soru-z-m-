/*
# Auto-create profile on user signup

Creates a database trigger that automatically inserts a row in the `profiles` table
when a new user is created in `auth.users`. This ensures the profile exists even
if the frontend insert fails or the user is created via the Supabase dashboard.

## Changes
1. Creates `handle_new_user()` function that inserts a profile row
2. Creates trigger `on_auth_user_created` that fires AFTER INSERT on auth.users
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username, role, avatar, target_exams, target_score, daily_goal, xp, streak)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    '',
    'user',
    '',
    '[]'::jsonb,
    NULL,
    20,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
