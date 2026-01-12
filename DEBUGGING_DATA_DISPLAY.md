# Debugging Guide: Why Dashboard Shows Different Data Than API

## Current Situation

Based on your screenshot and the Graph API Explorer response, you're seeing:
- **Graph API Explorer:** Returns correct data (e.g., 10,182 reach for a specific day)
- **Dashboard:** Shows inflated or incorrect numbers

## Root Causes Identified

### 1. ✅ FIXED: Consolidated vs Summed Metrics

**Issue:** The dashboard was summing individual post metrics instead of using consolidated account insights.

**Solution:** Already implemented in commit `11fe384` - the backend now fetches:
- Account-level `reach` metric
- Account-level `profile_views` metric
- Account-level `views` metric (mapped to impressions)

**Frontend code:** [Overview.tsx:96-97](src/pages/Overview.tsx#L96-L97) now uses `data?.consolidated_impressions` and `data?.consolidated_reach`

---

### 2. 🔍 POTENTIAL ISSUE: Date Range Ending at "Yesterday"

**Current Behavior:** The date picker is configured to end at "yesterday" instead of "today" to avoid incomplete data.

**Code Location:** [FiltersContext.tsx:43](src/contexts/FiltersContext.tsx#L43)

```typescript
const yesterday = subDays(today, 1);  // Last complete day
```

**Why this matters:**
- If today is January 12, the date range will be: January X → January 11 (not 12)
- Instagram API data often has a delay of several hours
- Data for "today" is incomplete until the day ends

**How to verify:**
1. Open browser DevTools → Console
2. Look for logs like: `[useDashboardData] Preset: 30d, Since: 2026-01-XX, Until: 2026-01-YY`
3. Check if the `Until` date matches what you expect

**To change this behavior (if needed):**

In [FiltersContext.tsx:75](src/contexts/FiltersContext.tsx#L75), change:
```typescript
// Current (ends yesterday)
to: endOfDay(yesterday),

// To end today instead
to: endOfDay(today),
```

---

### 3. 🔍 POTENTIAL ISSUE: Timezone Differences (UTC vs Local)

**The Problem:** Instagram API returns data in UTC (Coordinated Universal Time), but your browser/dashboard might be in a different timezone.

**Example from your JSON:**
```json
"end_time": "2026-01-12T08:00:00+0000"
```

This means: January 12 at 8:00 AM UTC, which might be:
- January 12 at 3:00 AM (Brazil - São Paulo, UTC-5)
- January 12 at 9:00 AM (UK, UTC+1)
- January 11 at 11:00 PM (California, UTC-8)

**How this affects data:**
- If you filter for "January 12" in your local timezone, but the API data ends at 8:00 AM UTC
- Your local "January 12" might start at a different UTC time
- This can cause data to be excluded from the display

**How to verify:**
1. Check your computer's timezone
2. Look at the `end_time` in the API response
3. Convert UTC to your local time to see if it matches expectations

---

### 4. ✅ DATA PATH IS CORRECT

The backend correctly parses the API response structure:

```typescript
// Backend: supabase/functions/ig-dashboard/index.ts:901-911
const insightsData = (insightsJson as { data?: unknown[] }).data;
if (Array.isArray(insightsData)) {
  for (const metric of insightsData) {
    const metricData = metric as { name?: string; values?: Array<{ value?: number }> };
    if (metricData.name && metricData.values) {
      // Sum all daily values to get total for the period
      const total = metricData.values.reduce((sum, v) => sum + (v.value ?? 0), 0);
      accountInsights[metricData.name] = total;
    }
  }
}
```

This correctly accesses: `data[0].values[0].value` from the API response.

---

## Debugging Steps

### Step 1: Check Console Logs

Open your dashboard and check the browser console for these logs:

```
[useDashboardData] Preset: 30d, Since: YYYY-MM-DD, Until: YYYY-MM-DD
[useDashboardData] Received X media items
[Overview] Consolidated reach: XXXXX, Post sum: XXXXX, Using: XXXXX
[ig-dashboard] Account metric reach: XXXXX (from X daily values)
[ig-dashboard] Account metric views (as impressions): XXXXX
```

**What to check:**
1. Is the `Since` and `Until` date range what you expect?
2. Does `Consolidated reach` have a value (not undefined)?
3. Does the console show "Account metric reach: XXXXX"?

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Refresh your dashboard
3. Find the request to `ig-dashboard` (Supabase function)
4. Click on it and check the Response

**Look for:**
```json
{
  "consolidated_reach": 82763,
  "consolidated_impressions": 123456,
  "consolidated_profile_views": 5678,
  "account_insights": {
    "reach": 82763,
    "impressions": 123456,
    "profile_views": 5678
  }
}
```

**If these values are missing or 0:**
- The backend is not fetching data correctly
- Check the backend logs in Supabase Dashboard → Edge Functions → Logs

**If these values are correct but dashboard shows wrong numbers:**
- The frontend is not using consolidated data
- Check that Overview.tsx is using `data?.consolidated_reach` (not `postSumReach`)

### Step 3: Check Date Range Display

Your screenshot shows "Jan 11 - Jan 12" in the date picker.

**Verify:**
1. What is today's date?
2. What date range preset are you using (7D, 30D, custom)?
3. Does the displayed range match what you expect?

**If the date range is wrong:**
- The frontend date calculation might be off
- Check [FiltersContext.tsx:40-77](src/contexts/FiltersContext.tsx#L40-L77)

### Step 4: Test with Longer Date Range

To rule out timezone/delay issues:

1. Change the date range to "Last 30 days" (30D)
2. Refresh the dashboard
3. Check if data appears now

**If data appears with 30D but not 7D:**
- Likely a timezone or data delay issue
- Recent data (today/yesterday) might not be available yet
- Try selecting a range ending 2 days ago

---

## Quick Fixes

### Fix 1: Include Today's Data (if you want incomplete data)

Edit [FiltersContext.tsx:43-75](src/contexts/FiltersContext.tsx#L43-L75):

```typescript
// Change from:
const yesterday = subDays(today, 1);
// ... later ...
to: endOfDay(yesterday),

// To:
const endDate = today;  // Include today instead of ending yesterday
// ... later ...
to: endOfDay(endDate),
```

### Fix 2: Add More Debug Logging

Add this to [Overview.tsx](src/pages/Overview.tsx) after line 102:

```typescript
console.log('[Overview] Full API response:', data);
console.log('[Overview] Account insights:', data?.account_insights);
console.log('[Overview] Total views displayed:', totalViews);
console.log('[Overview] Total reach displayed:', totalReach);
```

This will show exactly what data the frontend is receiving and displaying.

### Fix 3: Display Date Range in UI

To help users understand what date range is being shown, add this indicator to the dashboard.

In [Overview.tsx](src/pages/Overview.tsx), add near line 215:

```typescript
const { getDateRangeFromPreset } = useFilters();
const dateRange = getDateRangeFromPreset();

// Then display it:
<div className="text-sm text-muted-foreground mb-4">
  Dados de {format(dateRange.from || new Date(), 'dd/MM/yyyy', { locale: ptBR })} até {format(dateRange.to || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
</div>
```

---

## What The Latest Fix Did

The commit `11fe384` ("Fix: Fetch views metric for previous period insights") solved:

✅ Backend now fetches `views` metric for previous period
✅ Comparison badges (↑↓) now show correct percentage changes
✅ Profile Views metric now has real data (not 0)

The fix ensures that when you select "Last 7 days", the dashboard compares:
- Current 7 days (e.g., Jan 5-11)
- Previous 7 days (e.g., Dec 29 - Jan 4)

And displays percentage change indicators for:
- Reach
- Impressions (Views)
- Profile Views

---

## Next Steps

1. **Check the console logs** as described in Step 1 above
2. **Verify the Network tab** shows `consolidated_reach` with the correct value
3. **Try changing to 30D** date range to see if data appears
4. **Share the console logs** if you still see incorrect data

If after these steps the data is still incorrect, please share:
- Screenshot of browser console logs
- Screenshot of Network tab showing the `ig-dashboard` response
- Your current timezone
- The date range you're trying to view
