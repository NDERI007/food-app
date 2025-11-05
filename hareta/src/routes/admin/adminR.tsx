import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import OrderMonitor from '@admin/dashboard/components/orderMonitor';
import AdminLayout from '@admin/components/header';
import ProtectedRoute from 'contexts/protectedRoutes';

const AdminDashboard = lazy(() => import('@admin/dashboard/dashboard'));
const ProductsPage = lazy(() => import('@admin/products/products'));
//const ProductDetail = lazy(() => import('@admin/products/ProductDetail'));
const CategoriesPage = lazy(() => import('@admin/category/category'));

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ), // <-- Wrap all admin pages
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'orders', element: <OrderMonitor /> },
      // { path: 'products/:id', element: <ProductDetail /> },
    ],
  },
];

export default adminRoutes;
