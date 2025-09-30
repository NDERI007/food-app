import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import Dashboard from '@pages/dashboard/dashboard';

const Home = lazy(() => import('@pages/home/homepage'));

export const homeRoutes: RouteObject[] = [
  { index: true, element: <Home /> },
  { path: '/dashboard', element: <Dashboard /> },
  // protected example:
  // { path: "/private", element: <RequireAuth><PrivatePage/></RequireAuth> },
];
