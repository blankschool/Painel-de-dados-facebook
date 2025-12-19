import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BarChart3,
  TrendingUp,
  Activity,
  Grid3X3,
  Layers,
  Users,
  Clock,
  Play,
  User as UserIcon,
  Instagram,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Início", href: "/", icon: Home },
  { label: "Visão Geral", href: "/overview", icon: BarChart3 },
  { label: "Performance", href: "/performance", icon: Activity },
  { label: "Posts", href: "/posts", icon: Grid3X3 },
  { label: "Análise Avançada", href: "/advanced", icon: TrendingUp },
  { label: "Stories", href: "/stories", icon: Layers },
  { label: "Reels", href: "/reels", icon: Play },
  { label: "Demografia", href: "/demographics", icon: Users },
  { label: "Online", href: "/online", icon: Clock },
  { label: "Perfil", href: "/profile", icon: UserIcon },
];

export function Sidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={cn("app-sidebar", expanded && "expanded")}>
      {/* Logo */}
      <div className="flex items-center justify-center px-3 mb-6">
        <Link 
          to="/" 
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent",
            expanded ? "w-full" : "justify-center"
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Instagram className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {expanded && (
            <span className="font-semibold text-sidebar-foreground whitespace-nowrap">
              Insta Insights
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          if (expanded) {
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "nav-link justify-start",
                  isActive && "bg-sidebar-primary text-sidebar-primary-foreground"
                )}
              >
                <Icon className="nav-icon" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          }

          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "nav-link",
                    isActive && "bg-sidebar-primary text-sidebar-primary-foreground"
                  )}
                >
                  <Icon className="nav-icon" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Expand/Collapse Toggle */}
      <div className="px-3 pt-4 border-t border-sidebar-border mt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="nav-link w-full"
        >
          {expanded ? (
            <>
              <ChevronLeft className="nav-icon" />
              <span className="whitespace-nowrap">Recolher</span>
            </>
          ) : (
            <ChevronRight className="nav-icon" />
          )}
        </button>
      </div>
    </aside>
  );
}