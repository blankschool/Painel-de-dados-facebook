# Quick Fix for "Cannot parse access token" Error

## Problem
Your IGAA token has the correct format but Instagram API rejects it with:
```
Invalid OAuth access token - Cannot parse access token
Error Code: 190 (OAuthException)
```

## Root Cause
The token was created **before** the Instagram account was properly configured as a test user in your Meta App. Even though the account is now added as a test user, the OLD token is still invalid.

## Solution: Delete Old Token and Reconnect

### Step 1: Delete the Invalid Token

Go to Supabase SQL Editor and run:

```sql
-- Delete the giovannicolacicco account token
DELETE FROM connected_accounts
WHERE account_username = 'giovannicolacicco'
AND provider = 'instagram';

-- Verify it's deleted
SELECT account_username, provider, created_at
FROM connected_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'seu_email_aqui@gmail.com');
```

### Step 2: Verify Test User Status

Before reconnecting, ensure the Instagram account is properly configured:

1. **Go to Meta App Dashboard**:
   - https://developers.facebook.com/apps/1728352261135208/roles/test-users/

2. **Verify `@giovannicolacicco` is listed as "Instagram Tester"**

3. **Check invitation status**:
   - Should show "Accepted" or "Pending"

### Step 3: Accept Test User Invitation (If Pending)

1. **Open Instagram** (app or web)
2. **Log in as `@giovannicolacicco`**
3. **Go to Settings** → **Apps and Websites** → **App invites**
4. **Look for invitation** from "Teste de API-IG" (or your app name)
5. **Accept the invitation** if it's there

### Step 4: Reconnect Account

1. **Go to your app**: https://insta-glow-up-39.lovable.app/connect

2. **Click "Conectar com Instagram"** (the purple gradient button)

3. **Complete OAuth flow**:
   - Log in with Instagram credentials
   - Grant all requested permissions
   - Wait for redirect back to your app

4. **Verify connection**:
   - Should see success message
   - Account should appear in connected accounts list

### Step 5: Test the New Token

1. **Go to `/debug`**: https://insta-glow-up-39.lovable.app/debug

2. **Click "Run Token Diagnostics"**

3. **Check results**:
   - Token format should show: `IGAA...` ✓
   - Test 1 (Facebook Graph API) should pass ✓
   - Test 4 (Full Profile) should pass ✓

4. **If all tests pass**, click **"Abrir Dashboard IGAA"** to view your dashboard

## Alternative: Use Facebook OAuth Instead

If Instagram Business Login keeps failing, try the more reliable Facebook OAuth:

1. **Go to `/connect`**

2. **Click "Conectar com Facebook"** (the blue outlined button)

3. **Complete Facebook OAuth**:
   - Log in with Facebook
   - Select your Facebook Page linked to Instagram
   - Grant permissions

4. **This gives you an EAA token** which works better with Instagram Business API

5. **Use regular dashboard** at `/overview` instead of `/igaa-dashboard`

## Why This Happens

### Development Mode Restrictions

Your app is in **Development Mode**, which has strict requirements:

- ✅ App can ONLY access test users
- ✅ Test users must be added in Meta App Dashboard
- ✅ Test users must accept invitation in Instagram app
- ❌ Tokens created BEFORE user was added as test user are INVALID
- ❌ Non-test users will get "Cannot parse access token" error

### Token Lifecycle

```
1. User creates token → Token contains user ID
2. Instagram checks: Is this user authorized for this app?
3. Development Mode: Only test users allowed
4. If user wasn't test user when token was created → REJECTED
5. Even if user becomes test user later → Old token still REJECTED
```

**Solution**: Delete old token, ensure user is test user, then create NEW token.

## Verification Checklist

Before reconnecting, verify:

- [ ] Instagram account is in Meta App Dashboard as "Instagram Tester"
- [ ] Invitation status shows "Accepted" (not "Pending")
- [ ] Old token has been deleted from database
- [ ] You're logged into Instagram as the test user account
- [ ] App is configured with correct redirect URIs

## Expected Results After Fix

### When token is valid:
```
✅ Test 1: Facebook Graph API - Basic Profile (PASS)
✅ Test 2: Instagram Graph API - /me (may fail - this is normal)
✅ Test 3: Token Introspection (PASS - shows is_valid: true)
✅ Test 4: Full Profile (ig-dashboard simulation) (PASS)
```

### When you can view dashboard:
- Profile loads with correct username
- Follower count displays
- Recent posts show with images
- Likes and comments appear
- IGAA dashboard opens without errors

## Still Having Issues?

If you still get "Cannot parse access token" after following these steps:

### Check 1: Verify Test User in Meta Dashboard
```bash
# The account MUST appear here
Meta App Dashboard → Roles → Test Users → Instagram Testers
Look for: @giovannicolacicco
Status: Should be "Accepted"
```

### Check 2: Try Different Instagram Account
If your main account continues to fail, try:
1. Create a new Instagram Business account
2. Add it as test user FIRST
3. Accept invitation BEFORE connecting
4. Then connect via OAuth

### Check 3: Use Facebook OAuth (Recommended)
Facebook OAuth is more reliable:
- Uses Facebook's established OAuth system
- Better permission handling
- More stable for development
- Same Instagram Business data access

## Need Help?

Share these details:
1. Screenshot of Meta App Dashboard → Test Users page
2. Result from `/debug` diagnostics (all 4 tests)
3. Token introspection result (Test 3)
4. Did you see invitation in Instagram app? (Yes/No/Pending)
5. Which error persists after deleting and reconnecting?
