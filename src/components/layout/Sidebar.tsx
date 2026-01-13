import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import blankLogo from "@/assets/blank-logo.png";
import blankLogoDark from "@/assets/blank-logo-dark.png";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen = false, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const navItems = [{
    label: "Visão Geral",
    href: "/overview",
    icon: "chart"
  }, {
    label: "Comparativos",
    href: "/comparisons",
    icon: "comparisons"
  }, {
    label: "Performance",
    href: "/performance",
    icon: "performance"
  }, {
    label: "Posts",
    href: "/posts",
    icon: "posts"
  }, {
    label: "Conteúdo",
    href: "/content",
    icon: "content"
  }, {
    label: "Stories",
    href: "/stories",
    icon: "stories"
  }, {
    label: "Reels",
    href: "/reels",
    icon: "reels"
  }, {
    label: "Seguidores",
    href: "/followers",
    icon: "users"
  }, {
    label: "Demografia",
    href: "/demographics",
    icon: "demographics"
  }, {
    label: "Otimização",
    href: "/optimization",
    icon: "optimization"
  }, {
    label: "Perfil",
    href: "/profile",
    icon: "profile"
  }];

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="logo">
        <img 
          src={resolvedTheme === "dark" ? blankLogoDark : blankLogo} 
          alt="Blank" 
          className={`transition-all duration-200 ${isCollapsed ? 'h-6 w-auto' : 'h-8 w-auto'}`}
        />
      </div>
      
      <nav className="nav-menu">
        {navItems.map(item => (
          <Link 
            key={item.href} 
            to={item.href} 
            className={`nav-item ${location.pathname === item.href ? "active" : ""}`}
            onClick={handleNavClick}
            title={isCollapsed ? item.label : undefined}
          >
            {item.icon === "chart" && (
              <svg viewBox="0 0 24 24">
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-3 3" />
              </svg>
            )}
            {item.icon === "comparisons" && (
              <svg viewBox="0 0 24 24">
                <path d="M3 6h18M3 12h18M3 18h18" />
                <path d="M8 6v12M16 6v12" />
              </svg>
            )}
            {item.icon === "users" && (
              <svg viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
              </svg>
            )}
            {item.icon === "content" && (
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            )}
            {item.icon === "performance" && (
              <svg viewBox="0 0 24 24">
                <path d="M3 12h6l2-6 4 12 2-6h4" />
              </svg>
            )}
            {item.icon === "posts" && (
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            )}
            {item.icon === "stories" && (
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            )}
            {item.icon === "reels" && (
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M8 3l4 6" />
                <path d="M12 3l4 6" />
              </svg>
            )}
            {item.icon === "optimization" && (
              <svg viewBox="0 0 24 24">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            )}
            {item.icon === "profile" && (
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 10-16 0" />
              </svg>
            )}
            {item.icon === "demographics" && (
              <svg viewBox="0 0 24 24">
                <path d="M12 21c4.97-5.33 7-8.06 7-11a7 7 0 10-14 0c0 2.94 2.03 5.67 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            )}
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Collapse Toggle Button - Desktop only */}
      <button 
        onClick={onToggleCollapse}
        className="collapse-toggle hidden md:flex"
        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}