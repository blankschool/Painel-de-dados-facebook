-- Instagram Data Cache Tables (Fixed version - safe to re-run)
-- Purpose: Store historical Instagram data for fast loading and historical comparisons
-- This eliminates the need to call Meta API every time and allows comparison with past data

-- ============================================================================
-- 1. Profile Snapshots Table
-- Stores daily snapshots of Instagram profile information
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL, -- Instagram business account ID
  snapshot_date DATE NOT NULL, -- Date of this snapshot (YYYY-MM-DD)

  -- Profile information
  username TEXT,
  name TEXT,
  biography TEXT,
  followers_count INTEGER,
  follows_count INTEGER,
  media_count INTEGER,
  profile_picture_url TEXT,
  website TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one snapshot per account per day
  UNIQUE(account_id, snapshot_date)
);

-- Index for fast lookups by account and date
CREATE INDEX IF NOT EXISTS idx_profile_snapshots_account_date
  ON public.instagram_profile_snapshots(account_id, snapshot_date DESC);

-- Index for fast lookups by business_id
CREATE INDEX IF NOT EXISTS idx_profile_snapshots_business_id
  ON public.instagram_profile_snapshots(business_id);

-- ============================================================================
-- 2. Daily Account Insights Table
-- Stores consolidated account-level metrics (reach, impressions, profile views)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
  insight_date DATE NOT NULL, -- Date of the insight (YYYY-MM-DD)

  -- Account-level metrics from Instagram Insights API
  reach INTEGER, -- Total unique accounts reached
  impressions INTEGER, -- Total times content was viewed (views)
  profile_views INTEGER, -- Profile page views
  website_clicks INTEGER, -- Clicks on website link
  follower_count INTEGER, -- Followers on this date

  -- Email/phone/text clicks (if available)
  email_contacts INTEGER,
  phone_call_clicks INTEGER,
  text_message_clicks INTEGER,
  get_directions_clicks INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one record per account per day
  UNIQUE(account_id, insight_date)
);

-- Index for fast lookups and aggregations
CREATE INDEX IF NOT EXISTS idx_daily_insights_account_date
  ON public.instagram_daily_insights(account_id, insight_date DESC);

-- ============================================================================
-- 3. Post Cache Table
-- Stores individual post data with insights
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_posts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL, -- Instagram media ID (unique)

  -- Post metadata
  caption TEXT,
  media_type TEXT, -- IMAGE, VIDEO, CAROUSEL_ALBUM, REELS
  media_product_type TEXT, -- AD, FEED, STORY, REELS
  media_url TEXT,
  permalink TEXT,
  thumbnail_url TEXT,
  timestamp TIMESTAMPTZ NOT NULL, -- When post was published

  -- Basic metrics (always available)
  like_count INTEGER,
  comments_count INTEGER,

  -- Insights (from Instagram Insights API)
  impressions INTEGER, -- Total views
  reach INTEGER, -- Unique accounts reached
  engagement INTEGER, -- Total engagements
  saved INTEGER, -- Number of saves
  video_views INTEGER, -- For videos/reels
  plays INTEGER, -- For reels

  -- Computed metrics
  engagement_rate DECIMAL(5, 2), -- ER percentage

  -- Raw data (for flexibility)
  insights_raw JSONB, -- Full insights response from API
  computed_raw JSONB, -- Computed metrics

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ, -- When insights were last updated

  -- Ensure one record per media_id
  UNIQUE(media_id)
);

-- Index for fast lookups by account
CREATE INDEX IF NOT EXISTS idx_posts_cache_account_id
  ON public.instagram_posts_cache(account_id);

-- Index for fast lookups by media_id
CREATE INDEX IF NOT EXISTS idx_posts_cache_media_id
  ON public.instagram_posts_cache(media_id);

-- Index for fast sorting by timestamp
CREATE INDEX IF NOT EXISTS idx_posts_cache_timestamp
  ON public.instagram_posts_cache(account_id, timestamp DESC);

-- Index for filtering by date range
CREATE INDEX IF NOT EXISTS idx_posts_cache_date_range
  ON public.instagram_posts_cache(account_id, timestamp)
  WHERE timestamp IS NOT NULL;

-- ============================================================================
-- 4. Cache Metadata Table
-- Tracks when data was last synced for each account
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_cache_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,

  -- Last sync timestamps
  last_profile_sync TIMESTAMPTZ, -- Last time profile was synced
  last_insights_sync TIMESTAMPTZ, -- Last time daily insights were synced
  last_posts_sync TIMESTAMPTZ, -- Last time posts were synced

  -- Sync status
  is_syncing BOOLEAN DEFAULT FALSE, -- Prevent concurrent syncs
  last_sync_error TEXT, -- Last error message if sync failed

  -- Statistics
  total_posts_cached INTEGER DEFAULT 0,
  total_insights_days INTEGER DEFAULT 0,
  oldest_post_date DATE, -- Oldest post we have cached
  newest_post_date DATE, -- Newest post we have cached

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One metadata record per account
  UNIQUE(account_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cache_metadata_account_id
  ON public.instagram_cache_metadata(account_id);

-- ============================================================================
-- 5. Row Level Security (RLS) Policies
-- Ensure users can only see their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.instagram_profile_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_daily_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_posts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_cache_metadata ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
-- Profile Snapshots Policies
DROP POLICY IF EXISTS "Users can view their own profile snapshots" ON public.instagram_profile_snapshots;
CREATE POLICY "Users can view their own profile snapshots"
  ON public.instagram_profile_snapshots
  FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM public.connected_accounts WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage all profile snapshots" ON public.instagram_profile_snapshots;
CREATE POLICY "Service role can manage all profile snapshots"
  ON public.instagram_profile_snapshots
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Daily Insights Policies
DROP POLICY IF EXISTS "Users can view their own daily insights" ON public.instagram_daily_insights;
CREATE POLICY "Users can view their own daily insights"
  ON public.instagram_daily_insights
  FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM public.connected_accounts WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage all daily insights" ON public.instagram_daily_insights;
CREATE POLICY "Service role can manage all daily insights"
  ON public.instagram_daily_insights
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Posts Cache Policies
DROP POLICY IF EXISTS "Users can view their own posts cache" ON public.instagram_posts_cache;
CREATE POLICY "Users can view their own posts cache"
  ON public.instagram_posts_cache
  FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM public.connected_accounts WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage all posts cache" ON public.instagram_posts_cache;
CREATE POLICY "Service role can manage all posts cache"
  ON public.instagram_posts_cache
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Cache Metadata Policies
DROP POLICY IF EXISTS "Users can view their own cache metadata" ON public.instagram_cache_metadata;
CREATE POLICY "Users can view their own cache metadata"
  ON public.instagram_cache_metadata
  FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM public.connected_accounts WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage all cache metadata" ON public.instagram_cache_metadata;
CREATE POLICY "Service role can manage all cache metadata"
  ON public.instagram_cache_metadata
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS update_profile_snapshots_updated_at ON public.instagram_profile_snapshots;
CREATE TRIGGER update_profile_snapshots_updated_at
  BEFORE UPDATE ON public.instagram_profile_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_insights_updated_at ON public.instagram_daily_insights;
CREATE TRIGGER update_daily_insights_updated_at
  BEFORE UPDATE ON public.instagram_daily_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_cache_updated_at ON public.instagram_posts_cache;
CREATE TRIGGER update_posts_cache_updated_at
  BEFORE UPDATE ON public.instagram_posts_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cache_metadata_updated_at ON public.instagram_cache_metadata;
CREATE TRIGGER update_cache_metadata_updated_at
  BEFORE UPDATE ON public.instagram_cache_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.instagram_profile_snapshots IS
  'Daily snapshots of Instagram profile information for historical tracking';

COMMENT ON TABLE public.instagram_daily_insights IS
  'Daily consolidated account-level insights (reach, impressions, profile views)';

COMMENT ON TABLE public.instagram_posts_cache IS
  'Cache of individual Instagram posts with their insights and metrics';

COMMENT ON TABLE public.instagram_cache_metadata IS
  'Metadata tracking when data was last synced for each Instagram account';

COMMENT ON COLUMN public.instagram_posts_cache.last_fetched_at IS
  'When insights were last fetched from Instagram API. Used to determine if cache is stale.';

COMMENT ON COLUMN public.instagram_cache_metadata.is_syncing IS
  'Flag to prevent concurrent syncs of the same account. Reset to false after sync completes.';
