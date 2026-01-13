-- Delete suspicious daily insights rows with abnormally high reach/impressions values
-- These appear to be cumulative values incorrectly stored as daily values
DELETE FROM public.instagram_daily_insights 
WHERE reach > 100000 OR impressions > 500000;