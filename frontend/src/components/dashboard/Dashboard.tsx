
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Typography, Grid, Paper } from '@mui/material';
import { People, Inventory, Assignment, Warning } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { dashboardAPI } from '../../services/api';
import Statistics from './Statistics';
import BarChart from './Charts/BarChart';
import PieChart from './Charts/PieChart';

interface DashboardStats {
  total_users?: number;
  active_users?: number;
  total_items?: number;
  available_items?: number;
  borrowed_items?: number;
  maintenance_items?: number;
  total_transactions?: number;
  active_borrows?: number;
  overdue_borrows?: number;
  total_returns?: number;
  pending_requests?: number;
  total_reviews?: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastFetchRef = React.useRef<number>(0);

  useEffect(() => {
    const fetchStats = async () => {
      const now = Date.now();
      if (now - lastFetchRef.current < 300_000 && lastFetchRef.current !== 0) return;
      lastFetchRef.current = now;
      setLoading(true);
      setError('');
      try {
        setStats(await dashboardAPI.getStats());
      } catch (err: any) {
        setError(err.message || 'Failed to load stats');
        setStats({});
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 300_000);
    return () => clearInterval(interval);
  }, []);

  const pieChartData = {
    labels:
      language === 'fr'
        ? ['Disponible', 'Emprunté', 'Maintenance']
        : ['Available', 'Borrowed', 'Maintenance'],
    datasets: {
      data: [
        stats.available_items ?? 0,
        stats.borrowed_items ?? 0,
        stats.maintenance_items ?? 0,
      ],
      backgroundColor: ['#52b788', '#dc2f02', '#f48c06'],
    },
  };

  const barChartData = {
    labels: language === 'fr'
      ? ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: language === 'fr' ? 'Articles empruntés' : 'Borrowed Items',
        data: [stats.total_transactions ?? 0, 12, 18, 14, 9, stats.active_borrows ?? 0],
        backgroundColor: 'rgba(45, 106, 79, 0.6)',
        borderColor: '#2d6a4f',
        borderWidth: 2,
      },
    ],
  };

  const quickStats = [
    { label: language === 'fr' ? 'Utilisateurs' : 'Users', value: stats.total_users ?? 0, color: '#1565c0', icon: <People /> },
    { label: language === 'fr' ? 'Articles' : 'Items', value: stats.total_items ?? 0, color: '#2d6a4f', icon: <Inventory /> },
    { label: language === 'fr' ? 'Emprunts actifs' : 'Active Borrows', value: stats.active_borrows ?? 0, color: '#1976d2', icon: <Assignment /> },
    { label: language === 'fr' ? 'En retard' : 'Overdue', value: stats.overdue_borrows ?? 0, color: '#dc2f02', icon: <Warning /> },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          component="img"
          src="/logo.jpg"
          alt="Logo"
          sx={{ height: 52, width: 52, objectFit: 'contain', bgcolor: '#1b4332', borderRadius: '50%', p: 0.5 }}
        />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1b4332' }}>
            {t('dashboard')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {language === 'fr' ? `Bienvenue, ${user?.full_name}` : `Welcome, ${user?.full_name}`}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error} — {language === 'fr' ? 'Affichage de statistiques vides.' : 'Showing empty statistics.'}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
          <CircularProgress sx={{ color: '#2d6a4f' }} />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {quickStats.map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <Paper elevation={2} sx={{ p: 2.5, borderRadius: 3, borderLeft: `5px solid ${s.color}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ color: s.color }}>{s.icon}</Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Statistics data={stats} />

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={8}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1b4332' }}>
                  {language === 'fr' ? 'Tendances mensuelles' : 'Monthly Trends'}
                </Typography>
                <BarChart data={barChartData} />
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1b4332' }}>
                  {language === 'fr' ? 'État du stock' : 'Stock Status'}
                </Typography>
                <PieChart data={pieChartData} />
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AdminDashboard;