import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import Dashboard from '@pages/dashboard/dashboard';
import AddressPage from '@pages/address/Address';
import SettingsPage from '@pages/settings/accountSettings';
import CheckOut from '@pages/checkout/checkout';

const Home = lazy(() => import('@pages/home/homepage'));

const homeRoutes: RouteObject[] = [
  { index: true, element: <Home /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/address', element: <AddressPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/checkout', element: <CheckOut /> },
  // protected example:
  // { path: "/private", element: <RequireAuth><PrivatePage/></RequireAuth> },
];
export default homeRoutes;
