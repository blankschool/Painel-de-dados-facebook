import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout() {
  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <Outlet />
      </main>
      <div className="template-credit">
        <span>emplate by © Data Bloo P.c.</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </div>
    </div>
  );
}
