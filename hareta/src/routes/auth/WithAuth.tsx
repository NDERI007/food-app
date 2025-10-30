import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const Login = lazy(() => import('@pages/login/login'));
const Signup = lazy(() => import('@pages/signup/signup'));

const authRoutes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
];
export default authRoutes;
