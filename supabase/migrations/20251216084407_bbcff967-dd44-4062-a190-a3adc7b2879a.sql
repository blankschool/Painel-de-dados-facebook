-- Create account_snapshots table for storing daily Instagram insights history
CREATE TABLE public.account_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_user_id TEXT NOT NULL,
  date DATE NOT NULL,
  profile_insights JSONB,
  demographics JSONB,
  posts JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint to prevent duplicate snapshots per user/account/day
  CONSTRAINT unique_daily_snapshot UNIQUE (user_id, instagram_user_id, date)
);

-- Enable RLS
ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own snapshots"
ON public.account_snapshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
ON public.account_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
ON public.account_snapshots
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
ON public.account_snapshots
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_snapshots_user_date ON public.account_snapshots (user_id, date DESC);
CREATE INDEX idx_snapshots_instagram_user ON public.account_snapshots (instagram_user_id, date DESC);