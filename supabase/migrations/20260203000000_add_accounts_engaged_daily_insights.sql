ALTER TABLE public.instagram_daily_insights
  ADD COLUMN IF NOT EXISTS accounts_engaged INTEGER;
