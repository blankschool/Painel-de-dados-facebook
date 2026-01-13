import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import blankLogo from "@/assets/blank-logo.png";
import blankLogoDark from "@/assets/blank-logo-dark.png";

export function Sidebar() {
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const navItems = [{
    label: "Visão Geral",
    href: "/overview",
    icon: "chart"
  }, {
    label: "Seguidores",
    href: "/followers",
    icon: "users"
  }, {
    label: "Conteúdo",
    href: "/content",
    icon: "content"
  }, {
    label: "Stories",
    href: "/stories",
    icon: "stories"
  }, {
    label: "Otimização",
    href: "/optimization",
    icon: "optimization"
  }, {
    label: "Perfil",
    href: "/profile",
    icon: "profile"
  }, {
    label: "Tempo",
    href: "/time",
    icon: "time"
  }];
  return <aside className="sidebar">
      <div className="logo">
        <img src={resolvedTheme === "dark" ? blankLogoDark : blankLogo} alt="Blank" className="h-8 w-auto" />
      </div>
      <nav className="nav-menu">
        {navItems.map(item => (
          <Link key={item.href} to={item.href} className={`nav-item ${location.pathname === item.href ? "active" : ""}`}>
            {item.icon === "chart" && (
              <svg viewBox="0 0 24 24">
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-3 3" />
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
            {item.icon === "stories" && (
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
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
            {item.icon === "time" && (
              <svg viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            )}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      
    </aside>;
}