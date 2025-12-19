import { TrendingUp, TrendingDown } from "lucide-react";

export type SortOrder = "desc" | "asc";

interface SortToggleProps {
  sortOrder: SortOrder;
  onToggle: () => void;
  className?: string;
}

export function SortToggle({ sortOrder, onToggle, className = "" }: SortToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
        sortOrder === "desc"
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      } ${className}`}
    >
      {sortOrder === "desc" ? (
        <>
          <TrendingUp className="w-3.5 h-3.5" />
          Mais destaque
        </>
      ) : (
        <>
          <TrendingDown className="w-3.5 h-3.5" />
          Menos destaque
        </>
      )}
    </button>
  );
}
