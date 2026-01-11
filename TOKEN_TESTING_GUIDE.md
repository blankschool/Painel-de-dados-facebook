# Instagram Token Testing Guide

## Overview

The `/debug` page provides comprehensive token diagnostics to identify why Instagram Business Login tokens (IGAA format) might be failing.

## How to Use

1. **Go to**: https://insta-glow-up-39.lovable.app/debug
2. **Click**: "Run Token Diagnostics"
3. **Review**: The detailed test results for each connected account

## What Gets Tested

The diagnostic runs **4 different API tests** for each connected account:

### Test 1: Facebook Graph API - Basic Profile
- **Endpoint**: `https://graph.facebook.com/v24.0/{account_id}?fields=id,username`
- **Purpose**: Tests if the token works with Facebook's Graph API
- **What it tells us**: Whether the token is valid for basic Instagram Business account access

### Test 2: Instagram Graph API - /me
- **Endpoint**: `https://graph.instagram.com/v24.0/me?fields=id,username`
- **Purpose**: Tests if the token works with Instagram's Graph API /me endpoint
- **What it tells us**: Whether IGAA tokens work with instagram.com domain

### Test 3: Token Introspection (debug_token)
- **Endpoint**: `https://graph.facebook.com/v24.0/debug_token`
- **Purpose**: Facebook's official token validation endpoint
- **What it tells us**:
  - Token validity
  - Token expiration
  - Granted permissions/scopes
  - App ID the token belongs to
  - User ID the token is for

### Test 4: Full Profile Fetch (ig-dashboard simulation)
- **Endpoint**: `https://graph.facebook.com/v24.0/{account_id}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website`
- **Purpose**: Simulates exactly what the ig-dashboard function does
- **What it tells us**: Whether the token will work for the actual dashboard

## Understanding Results

### ✅ All Tests Pass
If all 4 tests show ✓ (green checkmarks), your token is valid and working correctly. The issue is likely:
- A temporary Instagram API outage
- A different bug in the dashboard code
- Network connectivity issues

### ❌ Test 1 Fails: "Cannot parse access token"
**Meaning**: The token format is invalid or the token is expired/revoked.

**Common causes**:
- Token was created before user was added as test user (Development Mode apps)
- Token was revoked by user in Instagram settings
- Token has expired (Instagram tokens expire after 60 days)

**Solution**:
1. Go to `/connect`
2. Delete the account
3. Reconnect to get a fresh token

### ❌ Test 1 Fails: "Unsupported request"
**Meaning**: The app doesn't have permission to access this account.

**Common causes**:
- App is in Development Mode and user is not a test user
- User hasn't accepted the test user invitation

**Solution**:
1. **Add user as test user** in Meta App Dashboard:
   - Go to: https://developers.facebook.com/apps/{app_id}/roles/test-users/
   - Add Instagram test user
2. **Accept invitation** in Instagram app:
   - Settings → Apps and Websites → App invites
   - Accept invitation from your app

### ❌ Test 2 Fails but Test 1 Passes
**Meaning**: Token works with `graph.facebook.com` but not `graph.instagram.com`.

**This is NORMAL for Instagram Business Login tokens!** Instagram Business accounts accessed via Instagram Business Login use Facebook's Graph API, not Instagram's separate API.

**No action needed** - the ig-dashboard uses `graph.facebook.com` (Test 1), not `graph.instagram.com` (Test 2).

### ❌ Test 3 Shows Token Details
**Look for**:
- `is_valid`: Should be `true`
- `expires_at`: Token expiration timestamp (should be in the future)
- `scopes`: List of granted permissions
- `error`: Any error from Facebook

**Common issues**:
- `is_valid: false` → Token is invalid, need to reconnect
- `expires_at` in the past → Token expired, need to reconnect
- Missing scopes → User didn't grant all permissions during OAuth

### ❌ Test 4 Fails
**Meaning**: The exact call that ig-dashboard makes is failing.

**This is the most important test!** If this fails, the dashboard will fail.

**Common error messages**:
- "Cannot parse access token" → Token is invalid/expired
- "Permissions error" → Missing required permissions
- "Unsupported request" → User not authorized (test user issue)

## Token Format Indicators

The debug page shows token format details:

### IGAA Token (Instagram Business Login)
```
Decrypted: IGAAxxxxxxxxxxxx... (161 chars)
IGAA token: ✓ Yes (Instagram Business Login)
```
- Created via `instagram.com/oauth/authorize`
- Shorter token (~160 chars)
- Starts with `IGAA` or `IG`

### EAA Token (Facebook OAuth)
```
Decrypted: EAAJxxxxxxxxxxxx... (202 chars)
EAA token: ✓ Yes (Facebook OAuth)
```
- Created via `facebook.com/v24.0/dialog/oauth`
- Longer token (~200+ chars)
- Starts with `EAA`

**Both token types work!** They just use different OAuth flows to get the same Instagram Business account access.

## Troubleshooting Steps

### Step 1: Run Diagnostics
Go to `/debug` and run the token tests to see which specific test is failing.

### Step 2: Check Test User Status
If you see "Unsupported request" or permission errors:
1. Go to Meta App Dashboard → Roles → Test Users
2. Verify the Instagram account is listed as a test user
3. Check if invitation status is "Accepted"

### Step 3: Accept Test User Invitation
If invitation shows as "Pending":
1. Open Instagram app (or instagram.com)
2. Log in with the test account
3. Go to: Settings → Apps and Websites → App invites
4. Accept the invitation from your app

### Step 4: Delete and Reconnect
If token is invalid/expired:
1. Go to `/connect`
2. Click the trash icon to delete the account
3. Click "Conectar com Instagram" to reconnect
4. Complete the OAuth flow to get a fresh token

### Step 5: Try Facebook OAuth
If Instagram Business Login keeps failing:
1. Go to `/connect`
2. Click "Conectar com Facebook" instead
3. This uses Facebook OAuth (EAA tokens) but provides the same Instagram Business access

## Development Mode vs Live Mode

### Development Mode (Current State)
- App is restricted to test users only
- Non-test users will get "Unsupported request" errors
- Must manually add each Instagram account as a test user in Meta App Dashboard
- Test users must accept the invitation in Instagram app

### Live Mode (Production)
- Any Instagram Business/Creator account can connect
- No test user requirement
- No invitation needed
- Requires app review by Meta/Facebook

## Next Steps

After running diagnostics:
1. **Share the exact error messages** from the failed tests
2. **Check Test 3 token introspection** for detailed token info
3. **Verify Test 4** (ig-dashboard simulation) passes - this is what matters most!

If all tests pass but dashboard still fails, the issue is elsewhere in the code (not the token).
