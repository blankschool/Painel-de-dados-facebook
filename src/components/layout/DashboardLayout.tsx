import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Topbar />
        <div className="mx-auto max-w-[1240px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
