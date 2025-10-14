import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import ProtectedRoute from 'contexts/protectedRoutes';

const AdminDashboard = lazy(() => import('@admin/dashboard/dashboard'));
const ProductsPage = lazy(() => import('@admin/products/prodPage'));
//const ProductDetail = lazy(() => import('@admin/products/ProductDetail'));
const CategoriesPage = lazy(() => import('@admin/category/category'));

const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
    children: [
      { path: 'products', element: <ProductsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      //{ path: 'products/:id', element: <ProductDetail /> },
      //{ path: 'categories', element: <CategoriesPage /> },
    ],
  },
];

export default adminRoutes;
