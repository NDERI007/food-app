import { Header } from '@components/header';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div>
      <Header />
      <main className='p-4'>
        <Outlet />
      </main>
    </div>
  );
}
