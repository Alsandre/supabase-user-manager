-- User Manager Library - Supabase Database Setup
-- Run these commands in your Supabase SQL Editor

-- 1. Create user_status table
CREATE TABLE IF NOT EXISTS user_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'basic' CHECK (status IN ('basic', 'silver', 'gold', 'platinum')),
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one status record per user
  UNIQUE(user_id)
);

-- 2. Enable Row Level Security
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
-- Users can view their own status
CREATE POLICY "Users can view own status" ON user_status
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own status (for initial creation)
CREATE POLICY "Users can insert own status" ON user_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own status
CREATE POLICY "Users can update own status" ON user_status
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Create function to calculate status from points
CREATE OR REPLACE FUNCTION calculate_status_from_points(points_value INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF points_value >= 10000 THEN
    RETURN 'platinum';
  ELSIF points_value >= 5000 THEN
    RETURN 'gold';
  ELSIF points_value >= 1000 THEN
    RETURN 'silver';
  ELSE
    RETURN 'basic';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to update user status
CREATE OR REPLACE FUNCTION update_user_status(new_points INTEGER)
RETURNS user_status AS $$
DECLARE
  result user_status;
  new_status TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Calculate new status based on points
  new_status := calculate_status_from_points(new_points);
  
  -- Update or insert user status
  INSERT INTO user_status (user_id, status, points, updated_at)
  VALUES (current_user_id, new_status, new_points, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = new_status,
    points = new_points,
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to add points to user
CREATE OR REPLACE FUNCTION add_user_points(points_to_add INTEGER)
RETURNS user_status AS $$
DECLARE
  result user_status;
  current_points INTEGER;
  new_total INTEGER;
  new_status TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get current points (or 0 if no record exists)
  SELECT COALESCE(points, 0) INTO current_points
  FROM user_status 
  WHERE user_id = current_user_id;
  
  -- Calculate new total
  new_total := COALESCE(current_points, 0) + points_to_add;
  
  -- Ensure points don't go negative
  IF new_total < 0 THEN
    new_total := 0;
  END IF;
  
  -- Update status with new total
  SELECT * INTO result FROM update_user_status(new_total);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get user status
CREATE OR REPLACE FUNCTION get_user_status()
RETURNS user_status AS $$
DECLARE
  result user_status;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get or create user status
  SELECT * INTO result FROM user_status WHERE user_id = current_user_id;
  
  -- If no status exists, create default
  IF result IS NULL THEN
    SELECT * INTO result FROM update_user_status(0);
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_status_updated_at
  BEFORE UPDATE ON user_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_status_user_id ON user_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_status ON user_status(status);
CREATE INDEX IF NOT EXISTS idx_user_status_points ON user_status(points);

-- 10. Insert some sample data for testing (optional)
-- This will create a status record for the current user if they're authenticated
-- You can run this after setting up the schema to test
/*
SELECT update_user_status(0) AS initial_status;
*/ 
