import { useDashboardData } from "@/hooks/useDashboardData";

export function FiltersBar({ showMediaType = false }: { showMediaType?: boolean }) {
  const { data } = useDashboardData();
  const accountName = data?.profile?.username ? data.profile.username : "Instagram Business";

  return (
    <div className="filters-bar">
      <button className="filter-btn" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
        </svg>
        + Filter
      </button>
      <div className="filter-dropdown">
        <span className="label">Account:</span> {accountName}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </div>
      <div className="filter-dropdown">
        Week
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </div>
      <div className="filter-dropdown">
        Day of Week
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </div>
      {showMediaType && (
        <div className="filter-dropdown">
          Media Type
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </div>
      )}
    </div>
  );
}
