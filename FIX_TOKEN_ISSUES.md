# Fix Token Issues - Step by Step Guide

## Problem
The error "Invalid OAuth access token - Cannot parse access token" occurs because old tokens stored in base64 format are incompatible with Instagram's Graph API.

## Solution

### Step 1: Clean Up Old Tokens in Database

Go to your Supabase Dashboard SQL Editor and run the SQL script:

```sql
-- Clean up invalid tokens
UPDATE connected_accounts
SET access_token = NULL
WHERE provider = 'instagram'
  AND NOT (
    access_token LIKE 'ENCRYPTED:%'
    OR access_token LIKE 'IGAA%'
    OR access_token LIKE 'EAA%'
  );
```

This will null out any base64-encoded or invalid tokens, forcing users to reconnect.

**OR** run the full script from `clean_invalid_tokens.sql` file.

### Step 2: Reconnect Your Instagram Account

1. Go to `/connect` page in your app
2. Click "Conectar com Instagram"
3. Complete the OAuth flow
4. The new token will be stored properly (either raw or encrypted depending on ENCRYPTION_KEY)

### Step 3: Verify It Works

After reconnecting:
1. Go to `/overview` page
2. Dashboard should load without errors
3. Check Supabase Edge Functions logs to see token format

## Understanding Token Formats

The system now supports 3 token formats:

1. **ENCRYPTED:** prefix - New encrypted tokens (requires ENCRYPTION_KEY environment variable)
   - Format: `ENCRYPTED:base64(iv + encrypted_data)`
   - Most secure option

2. **Raw tokens** starting with `IGAA` or `EAA`
   - Format: `IGAA...` (Instagram tokens) or `EAA...` (Facebook tokens)
   - Used when ENCRYPTION_KEY is not set

3. **Legacy base64** - Old format (being phased out)
   - Format: base64-encoded token
   - May cause "Cannot parse access token" errors

## Setting Up Encryption (Optional but Recommended)

To enable token encryption:

1. Generate a secure 32-character key:
   ```bash
   openssl rand -base64 32
   ```

2. Add to Supabase Edge Functions environment:
   - Go to: Supabase Dashboard → Project Settings → Edge Functions
   - Add variable: `ENCRYPTION_KEY` = your generated key

3. Reconnect all Instagram accounts to store encrypted tokens

## How It Works Now

### When User Connects Instagram:

1. User authorizes app on Instagram
2. App receives authorization code
3. `instagram-oauth` edge function:
   - Exchanges code for short-lived token
   - Exchanges short-lived for long-lived token (60 days)
   - Encrypts token (if ENCRYPTION_KEY set) OR stores raw
   - Saves to database

### When Dashboard Loads:

1. `ig-dashboard` edge function:
   - Fetches token from database
   - Detects format (ENCRYPTED: vs IGAA vs base64)
   - Decrypts if needed
   - Uses token to fetch Instagram data

## Debugging

Check Edge Functions logs in Supabase Dashboard for:
- `[instagram-oauth]` logs during connection
- `[ig-dashboard]` logs during dashboard load

Look for:
```
[ig-dashboard] Token format check: { starts_with_encrypted: true/false, ... }
[ig-dashboard] Decrypted token format: { starts_with_ig: true/false, ... }
```

If you see "Cannot parse access token", the decrypted token is invalid or expired.

## Why This Happened

The old system stored tokens as base64-encoded strings. Instagram's Graph API cannot parse base64-encoded tokens directly - it needs the raw token string (IGAA... format). The decryption function now handles this, but old tokens may be expired or in an incompatible format.

**Solution**: Reconnect to get fresh tokens stored in the correct format.
