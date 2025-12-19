import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import blankLogo from "@/assets/blank-logo.png";
import blankLogoDark from "@/assets/blank-logo-dark.png";

export function Sidebar() {
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const navItems = [{
    label: "Business Overview",
    href: "/overview"
  }, {
    label: "Followers",
    href: "/followers"
  }, {
    label: "Content",
    href: "/content"
  }, {
    label: "Time",
    href: "/time"
  }];
  return <aside className="sidebar">
      <div className="logo">
        <img src={resolvedTheme === "dark" ? blankLogoDark : blankLogo} alt="Blank" className="h-8 w-auto" />
      </div>
      <nav className="nav-menu">
        {navItems.map(item => <Link key={item.href} to={item.href} className={`nav-item ${location.pathname === item.href ? "active" : ""}`}>
            {item.label === "Business Overview" && <svg viewBox="0 0 24 24">
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-3 3" />
              </svg>}
            {item.label === "Followers" && <svg viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
              </svg>}
            {item.label === "Content" && <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>}
            {item.label === "Time" && <svg viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>}
            <span>{item.label}</span>
          </Link>)}
      </nav>
      
    </aside>;
}