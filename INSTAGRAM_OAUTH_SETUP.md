# Instagram Business Login OAuth Setup

## Critical Fixes Applied

### 1. **Long-Lived Token Exchange (RESTORED)**
According to Instagram Business Login documentation, we MUST exchange the short-lived token for a long-lived token:

```
Short-lived token → Long-lived token (60 days validity)
```

The exchange happens at:
```
https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={secret}&access_token={short_token}
```

### 2. **Token Encryption Added**
All access tokens are now encrypted using AES-256-GCM before storing in the database.

## Environment Variables Required

### Supabase Edge Functions

You need to set the following environment variable in your Supabase project:

```bash
ENCRYPTION_KEY=your-32-character-secret-key-here
```

**How to set it:**

1. Go to your Supabase Dashboard
2. Navigate to: Project Settings → Edge Functions
3. Add the environment variable:
   - Name: `ENCRYPTION_KEY`
   - Value: A secure 32-character string (generate using the command below)

**Generate a secure key:**

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## How Instagram Business Login Works

### Step 1: Authorization
User clicks "Conectar com Instagram" → Redirects to:
```
https://www.instagram.com/oauth/authorize?
  client_id={INSTAGRAM_APP_ID}&
  redirect_uri={YOUR_CALLBACK}&
  scope=instagram_business_basic,instagram_business_manage_insights,...&
  response_type=code&
  state={CSRF_TOKEN}
```

### Step 2: Code Exchange
Instagram redirects back with `code` parameter → Your backend exchanges it:
```
POST https://api.instagram.com/oauth/access_token
  client_id={INSTAGRAM_APP_ID}
  client_secret={INSTAGRAM_APP_SECRET}
  grant_type=authorization_code
  redirect_uri={YOUR_CALLBACK}
  code={RECEIVED_CODE}
```

Response:
```json
{
  "access_token": "IGAA...",
  "user_id": 25637348915877732,
  "permissions": ["instagram_business_basic", ...]
}
```

### Step 3: Long-Lived Token Exchange ✅ **REQUIRED**
```
GET https://graph.instagram.com/access_token?
  grant_type=ig_exchange_token&
  client_secret={INSTAGRAM_APP_SECRET}&
  access_token={SHORT_LIVED_TOKEN}
```

Response:
```json
{
  "access_token": "IGAA...",
  "token_type": "bearer",
  "expires_in": 5184000  // 60 days in seconds
}
```

### Step 4: Get Business Account ID
Try multiple methods:
1. Direct user_id lookup
2. `/me` endpoint
3. ~~Facebook Pages~~ (removed - doesn't work with Instagram-only tokens)

### Step 5: Fetch Profile
```
GET https://graph.instagram.com/v24.0/{BUSINESS_ACCOUNT_ID}?
  fields=id,username,name,account_type,profile_picture_url,followers_count&
  access_token={LONG_LIVED_TOKEN}
```

### Step 6: Encrypt & Store
- Encrypt the long-lived token using AES-256-GCM
- Store encrypted token in database
- Token is valid for 60 days

## Supported Account Types

✅ **Supported:**
- Instagram Business accounts
- Instagram Creator accounts (MEDIA_CREATOR)

❌ **Not Supported:**
- Personal Instagram accounts → Must convert to Business/Creator first

## Security Features

### Token Encryption
```typescript
// Encryption Flow
Short-lived token (1 hour)
  ↓
Long-lived token (60 days)
  ↓
AES-256-GCM Encryption
  ↓
Base64 Encoded
  ↓
Stored in Database
```

### Encryption Details
- **Algorithm**: AES-GCM (Authenticated Encryption)
- **Key Size**: 256 bits
- **IV**: 12 bytes (randomly generated per encryption)
- **Format**: `[IV(12 bytes)][Encrypted Data]` → Base64

### Fallback Behavior
If `ENCRYPTION_KEY` is not set:
- ⚠️ Warning logged
- Token stored as Base64 only (NOT encrypted)
- Still works but less secure

## Troubleshooting

### Error: "Unsupported request - method type: get"
**Cause**: Trying to use short-lived token with Graph API
**Solution**: Token exchange is now fixed - should not occur

### Error: "Conta Business do Instagram não encontrada"
**Cause**: Account is not a Business/Creator account
**Solution**: Convert account to Business or Creator in Instagram app

### Error: "Permissões ausentes"
**Cause**: User didn't grant all required permissions
**Solution**: User must accept all permissions during OAuth flow

### Token Exchange Fails
**Check:**
1. Instagram App Secret is correct
2. Short-lived token is still valid (1 hour expiry)
3. Network connectivity to graph.instagram.com

## Testing

### Test with your own account:
1. Go to `/connect`
2. Click "Conectar com Instagram"
3. Grant all permissions
4. Verify account appears in connected accounts
5. Check dashboard redirects correctly

### Verify encryption:
1. Check Supabase database
2. `access_token` field should be long Base64 string
3. Should NOT be readable plaintext

## API Endpoints Used

- `https://www.instagram.com/oauth/authorize` - Authorization
- `https://api.instagram.com/oauth/access_token` - Token exchange
- `https://graph.instagram.com/access_token` - Long-lived token
- `https://graph.instagram.com/v24.0/me` - Get account ID
- `https://graph.instagram.com/v24.0/{id}` - Get profile

## Required Scopes

```javascript
const INSTAGRAM_BUSINESS_SCOPES = [
  'instagram_business_basic',              // Basic account info
  'instagram_business_manage_insights',    // Analytics data
  'instagram_business_manage_messages',    // DM management
  'instagram_business_manage_comments',    // Comment management
  'instagram_business_content_publish'     // Content publishing
];
```

## References

- [Instagram Business Login Documentation](https://developers.facebook.com/docs/instagram-api/overview)
- [Instagram Graph API Reference](https://developers.facebook.com/docs/instagram-api/reference)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
