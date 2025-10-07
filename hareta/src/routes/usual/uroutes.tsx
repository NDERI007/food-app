import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import Dashboard from '@pages/dashboard/dashboard';
import AddressPage from '@pages/address/Address';

const Home = lazy(() => import('@pages/home/homepage'));

export const homeRoutes: RouteObject[] = [
  { index: true, element: <Home /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/address', element: <AddressPage /> },
  // protected example:
  // { path: "/private", element: <RequireAuth><PrivatePage/></RequireAuth> },
];
