/**
 * MainLayout.tsx
 * Uses <Outlet /> for React Router v6 nested routes.
 * Passes user + logout to the bilingual, logo-branded Header.
 * Footer shows the Scout logo and translated org name.
 */

import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header user={user} onLogout={logout} />

      <Box component="main" sx={{ flexGrow: 1, bgcolor: '#f4f7f6' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
