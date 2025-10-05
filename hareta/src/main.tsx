import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { RouterProvider } from 'react-router-dom';
import router from './router.tsx';
import { AuthProvider } from 'contexts/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />

      <App />
    </AuthProvider>
  </StrictMode>,
);
