import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const Home = lazy(() => import("../../../pages/home/homepage"));

export const homeRoutes: RouteObject[] = [
  { index: true, element: <Home /> },
  // protected example:
  // { path: "/private", element: <RequireAuth><PrivatePage/></RequireAuth> },
];
