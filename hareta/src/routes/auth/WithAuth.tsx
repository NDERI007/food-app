import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const Login = lazy(() => import('@pages/login/login'));

export const authRoutes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  // protected example:
  // { path: "/private", element: <RequireAuth><PrivatePage/></RequireAuth> },
];
