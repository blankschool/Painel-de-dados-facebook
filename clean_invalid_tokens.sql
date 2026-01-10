-- Clean up invalid/expired tokens from connected_accounts table
-- This will force users to reconnect their Instagram accounts with fresh tokens

-- Option 1: Delete all tokens that don't start with 'ENCRYPTED:' or 'IGAA' or 'EAA'
-- (This removes base64-encoded tokens and other invalid formats)
UPDATE connected_accounts
SET access_token = NULL
WHERE provider = 'instagram'
  AND NOT (
    access_token LIKE 'ENCRYPTED:%'
    OR access_token LIKE 'IGAA%'
    OR access_token LIKE 'EAA%'
  );

-- Option 2: Alternatively, delete the entire row to force fresh OAuth
-- Uncomment the line below if you want to remove the entire account record:
-- DELETE FROM connected_accounts WHERE provider = 'instagram' AND access_token NOT LIKE 'ENCRYPTED:%' AND access_token NOT LIKE 'IGAA%' AND access_token NOT LIKE 'EAA%';

-- Check what tokens remain
SELECT
  id,
  user_id,
  provider,
  account_username,
  CASE
    WHEN access_token LIKE 'ENCRYPTED:%' THEN 'ENCRYPTED (valid)'
    WHEN access_token LIKE 'IGAA%' THEN 'RAW_IG_TOKEN (valid)'
    WHEN access_token LIKE 'EAA%' THEN 'RAW_FB_TOKEN (valid)'
    ELSE 'INVALID_FORMAT'
  END as token_format,
  LENGTH(access_token) as token_length,
  token_expires_at,
  created_at,
  updated_at
FROM connected_accounts
WHERE provider IN ('instagram', 'facebook')
ORDER BY updated_at DESC;
