import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { authRoutes } from './routes/auth/WithAuth';
import { homeRoutes } from './routes/usual/uroutes';

// Lazy page examples (code-splitting)
const NotFound = lazy(() => import('./pages/NotFound/notfound'));

// Combine feature route arrays
const routes: RouteObject[] = [
  ...homeRoutes,
  ...authRoutes,
  { path: '*', element: <NotFound /> },
];

const router = createBrowserRouter(routes);

export default router;
