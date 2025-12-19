import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout() {
  return (
    <div className="app-shell dark">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <div className="app-content">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}