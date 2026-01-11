# IGAA Dashboard Guide

## Overview

The IGAA Dashboard is a dedicated dashboard specifically designed for Instagram Business Login tokens (tokens starting with `IGAA`). It provides a streamlined view of your Instagram Business account data without interfering with the regular dashboard.

## When to Use IGAA Dashboard vs Regular Dashboard

### IGAA Dashboard (`/igaa-dashboard`)
**Use when:**
- Your token starts with `IGAA` (Instagram Business Login)
- You connected via "Conectar com Instagram" button
- You want a basic overview of your Instagram Business account
- Your app is in Development Mode with test users

**Limitations:**
- May have limited insights access in Development Mode
- Some advanced metrics may not be available
- Designed for basic Instagram Business data

### Regular Dashboard (`/overview`)
**Use when:**
- Your token starts with `EAA` (Facebook OAuth)
- You connected via "Conectar com Facebook" button
- You need full insights and advanced analytics
- You need demographic data, stories insights, etc.

**Benefits:**
- Full access to Instagram Graph API insights
- Advanced metrics (reach, impressions, engagement)
- Demographic breakdowns
- Story insights
- More comprehensive data

## How to Access

### Method 1: Direct URL
Simply navigate to: https://insta-glow-up-39.lovable.app/igaa-dashboard

### Method 2: Via Debug Page
1. Go to `/debug`
2. Click "Run Token Diagnostics"
3. If an IGAA token is detected, you'll see a button: **"Abrir Dashboard IGAA"**
4. Click the button to open the IGAA dashboard

### Method 3: Auto-redirect
The regular `/overview` dashboard will auto-detect IGAA tokens and may prompt you to use the IGAA dashboard instead.

## What Data is Shown

### Profile Section
- Profile picture
- Username (@handle)
- Name
- Biography
- Website link

### Statistics Cards
1. **Seguidores** (Followers)
   - Total follower count

2. **Posts**
   - Total media count

3. **Curtidas Médias** (Average Likes)
   - Average likes across recent posts
   - Shows sample size (e.g., "nos últimos 25 posts")

4. **Comentários Médios** (Average Comments)
   - Average comments across recent posts
   - Shows sample size

### Recent Posts Grid
Displays up to 25 recent posts with:
- **Media preview** (image/video thumbnail)
- **Caption** (first 2 lines)
- **Like count** (❤️)
- **Comment count** (💬)
- **Insights** (if available):
  - Impressions
  - Reach
  - Engagement
  - Saved
- **Link to Instagram** (view on instagram.com)

### Technical Metadata
- Token type: IGAA (Instagram Business Login)
- Loading time (ms)
- Posts loaded
- Posts with insights

## Troubleshooting

### "This dashboard is for IGAA tokens only"
**Problem:** You're trying to access the IGAA dashboard with an EAA token.

**Solution:** Use the regular dashboard at `/overview` instead. The IGAA dashboard is specifically for Instagram Business Login tokens.

### No Insights Data Shown
**Problem:** Posts show likes/comments but no insights (impressions, reach, etc.)

**Common causes:**
- App is in Development Mode
- Test user doesn't have insights permission
- Instagram API limits for test users

**Solution:**
- This is normal for Development Mode apps
- Insights will work better when the app goes Live
- Basic metrics (likes, comments) still work fine

### "Cannot parse access token"
**Problem:** Token is invalid or expired.

**Solution:**
1. Go to `/connect`
2. Delete the account
3. Reconnect to get a fresh token

### "Unsupported request"
**Problem:** User is not authorized as a test user.

**Solution:**
1. Add user as test user in Meta App Dashboard
2. Accept test user invitation in Instagram app:
   - Settings → Apps and Websites → App invites
   - Accept invitation

## API Endpoints Used

The IGAA dashboard uses these Facebook/Instagram Graph API endpoints:

### 1. Profile Endpoint
```
GET https://graph.facebook.com/v24.0/{account_id}
fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website
```

### 2. Media Endpoint
```
GET https://graph.facebook.com/v24.0/{account_id}/media
fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count
limit=25
```

### 3. Insights Endpoint (optional)
```
GET https://graph.facebook.com/v24.0/{media_id}/insights
metric=engagement,impressions,reach,saved
```

## Differences from Regular Dashboard

| Feature | IGAA Dashboard | Regular Dashboard |
|---------|----------------|-------------------|
| Token Type | IGAA only | EAA preferred |
| OAuth Flow | Instagram Business Login | Facebook OAuth |
| Profile Data | ✓ Yes | ✓ Yes |
| Recent Posts | ✓ Yes (25 posts) | ✓ Yes (500+ posts) |
| Likes/Comments | ✓ Yes | ✓ Yes |
| Post Insights | Limited (dev mode) | ✓ Full access |
| Stories | ✗ No | ✓ Yes |
| Demographics | ✗ No | ✓ Yes |
| Follower Growth | ✗ No | ✓ Yes |
| Time Analysis | ✗ No | ✓ Yes |
| Advanced Filters | ✗ No | ✓ Yes |

## Development vs Production

### Development Mode (Current)
- Limited to test users only
- Insights may be restricted
- Basic data (likes, comments) works
- Good for testing the OAuth flow

### Production Mode (After App Review)
- Works with any Instagram Business account
- Full insights access
- All metrics available
- Recommended to use regular dashboard (EAA tokens) for production

## Recommendations

### For Development/Testing
- ✓ Use IGAA dashboard to verify OAuth flow works
- ✓ Test with IGAA tokens from Instagram Business Login
- ✓ Check that basic data (profile, posts, likes) loads correctly
- ✓ Don't worry if insights are limited - this is normal in dev mode

### For Production
- ✓ **Recommend Facebook OAuth** ("Conectar com Facebook")
- ✓ Use regular dashboard at `/overview`
- ✓ Get EAA tokens for better insights access
- ✓ Submit app for review to go Live

## Technical Notes

### Token Validation
The IGAA dashboard checks if the token starts with:
- `IGAA` → Instagram Business Login token (accepted)
- `IG` → Generic Instagram token (accepted)
- `EAA` → Facebook OAuth token (redirected to regular dashboard)

### API Rate Limits
- Fetches up to 25 recent posts
- Attempts insights for first 10 posts only (to avoid rate limits)
- Remaining 15 posts shown without insights

### Error Handling
- Auto-redirects EAA tokens to regular dashboard
- Gracefully handles missing insights
- Shows user-friendly error messages in Portuguese
- Provides "Tentar Novamente" button on errors

## FAQ

**Q: Should I use IGAA dashboard or regular dashboard?**
A: For production, use regular dashboard with Facebook OAuth (EAA tokens). IGAA dashboard is mainly for testing Instagram Business Login flow.

**Q: Why are insights missing?**
A: Insights may be limited for test users in Development Mode. This is normal and will improve when the app goes Live.

**Q: Can I use both dashboards?**
A: Yes! You can have accounts connected via both methods. The debug page will show which token type each account has.

**Q: Which OAuth method is better?**
A: Facebook OAuth (EAA tokens) is more reliable and provides better insights access. Instagram Business Login (IGAA tokens) is newer but may have limitations in dev mode.

## Next Steps

1. **Test the IGAA dashboard** with your Instagram Business Login token
2. **Run diagnostics** at `/debug` to verify token status
3. **Compare results** with regular dashboard if you have both token types
4. **For production**, consider using Facebook OAuth for more reliable access

## Support

If you encounter issues:
1. Check `/debug` page for detailed token diagnostics
2. Review [TOKEN_TESTING_GUIDE.md](TOKEN_TESTING_GUIDE.md) for troubleshooting
3. Verify test user status in Meta App Dashboard
4. Check Supabase Edge Functions logs for detailed errors
