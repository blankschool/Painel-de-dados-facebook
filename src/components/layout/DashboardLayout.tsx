import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
export function DashboardLayout() {
  return <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <Outlet />
      </main>
      
    </div>;
}