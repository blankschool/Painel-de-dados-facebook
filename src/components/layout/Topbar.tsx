import { DateRangePicker } from '@/components/DateRangePicker';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Topbar() {
  const { data, loading, refresh } = useDashboardData();
  const { dateRange, setDateRange } = useDateRange();
  const profile = data?.profile ?? null;

  return (
    <header className="app-header">
      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-3">
            {profile.profile_picture_url ? (
              <img 
                src={profile.profile_picture_url} 
                alt={profile.username}
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full border border-border bg-secondary" />
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none">@{profile.username}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile.followers_count?.toLocaleString()} seguidores
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <DateRangePicker 
          date={dateRange} 
          onDateChange={setDateRange} 
        />
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => refresh()} 
          disabled={loading}
          className="h-9 w-9"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}