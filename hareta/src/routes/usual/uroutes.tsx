import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '@pages/dashboard/components/layout';
import Dashboard from '@pages/dashboard/dashboard';
import AddressPage from '@pages/address/Address';
import SettingsPage from '@pages/settings/accountSettings';
import CheckOut from '@pages/checkout/checkout';
import OrderConfirmation from '@pages/confirmation/orderConfirmation';
import MfaVerify from '@pages/mfa/verify';
import OrderHistory from '@pages/orders/order';

const Home = lazy(() => import('@pages/home/homepage'));

const homeRoutes: RouteObject[] = [
  { index: true, element: <Home /> }, // no header on homepage? (kept separate)
  { path: '/dashboard', element: <Dashboard /> },
  {
    element: <DashboardLayout />, // every child here gets the header
    children: [
      { path: '/address', element: <AddressPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/checkout', element: <CheckOut /> },
      { path: '/order-confirmation', element: <OrderConfirmation /> },
      { path: '/mfa-verify', element: <MfaVerify /> },
      { path: '/orders', element: <OrderHistory /> },
    ],
  },
];

export default homeRoutes;
