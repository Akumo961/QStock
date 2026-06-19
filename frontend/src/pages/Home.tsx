import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  QrCodeScanner,
  Inventory2,
  Assignment,
  CheckCircle,
  ArrowForward,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';

const API = '/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

interface Stats {
  total_items: number;
  available_items: number;
  active_borrows: number;
  overdue_borrows: number;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const fr = language === 'fr';

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/dashboard/stats`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        setStats(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

      {/* Hero */}
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 60%, #40916c 100%)',
          borderRadius: 4,
          p: { xs: 3, md: 6 },
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              component="img"
              src="/logo.jpg"
              alt="Logo"
              sx={{ height: 64, width: 64, objectFit: 'contain', bgcolor: 'white', borderRadius: '50%', p: 0.5 }}
            />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                QStock
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {fr ? 'Scouts Musulmans de Montréal' : 'Scouts Musulmans de Montréal'}
              </Typography>
            </Box>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            {fr ? `Bienvenue, ${user?.full_name?.split(' ')[0] || ''}` : `Welcome, ${user?.full_name?.split(' ')[0] || ''}`}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, mb: 3, maxWidth: 500 }}>
            {fr
              ? 'Gérez votre inventaire facilement avec des codes QR. Empruntez, retournez et suivez le matériel en temps réel.'
              : 'Manage your inventory easily with QR codes. Borrow, return, and track equipment in real time.'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<QrCodeScanner />}
              onClick={() => navigate('/scanner')}
              sx={{ bgcolor: 'white', color: '#1b4332', fontWeight: 700, '&:hover': { bgcolor: '#f0fdf4' } }}
            >
              {fr ? 'Scanner un QR' : 'Scan QR Code'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Inventory2 />}
              onClick={() => navigate('/inventory')}
              sx={{ borderColor: 'white', color: 'white', fontWeight: 600, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              {fr ? "Voir l'inventaire" : 'Browse Inventory'}
            </Button>
          </Box>
        </Box>

        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 80, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
      </Paper>

      {/* Stats Row */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#2d6a4f' }} /></Box>
      ) : error ? (
        <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>
      ) : stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: fr ? 'Articles total' : 'Total Items', value: stats.total_items, color: '#1b4332', icon: <Inventory2 /> },
            { label: fr ? 'Disponibles' : 'Available', value: stats.available_items, color: '#2d6a4f', icon: <CheckCircle /> },
            { label: fr ? 'En cours' : 'Active Borrows', value: stats.active_borrows, color: '#40916c', icon: <Assignment /> },
            { label: fr ? 'En retard' : 'Overdue', value: stats.overdue_borrows, color: stats.overdue_borrows > 0 ? '#dc2626' : '#6b7280', icon: <TrendingUp /> },
          ].map((stat, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card elevation={1} sx={{ borderRadius: 3, borderLeft: `4px solid ${stat.color}` }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: stat.color }}>{stat.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: `${stat.color}20`, color: stat.color }}>{stat.icon}</Avatar>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Quick Actions */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1b4332' }}>
        {fr ? 'Actions rapides' : 'Quick Actions'}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          {
            title: fr ? 'Scanner & Emprunter' : 'Scan & Borrow',
            desc: fr ? "Scannez le QR d'un article pour l'emprunter" : "Scan an item's QR code to borrow it",
            icon: <QrCodeScanner sx={{ fontSize: 36 }} />,
            path: '/scanner',
            color: '#1b4332',
          },
          {
            title: fr ? 'Retourner un article' : 'Return an Item',
            desc: fr ? 'Scannez pour retourner un article emprunté' : 'Scan to return a borrowed item',
            icon: <CheckCircle sx={{ fontSize: 36 }} />,
            path: '/scanner',
            color: '#2d6a4f',
          },
          {
            title: fr ? 'Mon inventaire' : 'Browse Inventory',
            desc: fr ? 'Voir tous les articles disponibles' : 'See all available items',
            icon: <Inventory2 sx={{ fontSize: 36 }} />,
            path: '/inventory',
            color: '#40916c',
          },
          {
            title: fr ? 'Mes emprunts' : 'My Borrows',
            desc: fr ? 'Voir mes emprunts actifs' : 'View my active borrows',
            icon: <Assignment sx={{ fontSize: 36 }} />,
            path: '/orders',
            color: '#52b788',
          },
        ].map((action, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card
              elevation={1}
              onClick={() => navigate(action.path)}
              sx={{
                borderRadius: 3, cursor: 'pointer', height: '100%',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: `${action.color}15`, color: action.color, width: 64, height: 64, mx: 'auto', mb: 2 }}>
                  {action.icon}
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{action.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{action.desc}</Typography>
                <Chip
                  label={fr ? 'Aller' : 'Go'}
                  size="small"
                  icon={<ArrowForward fontSize="small" />}
                  sx={{ bgcolor: action.color, color: 'white', fontWeight: 600 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Admin notice */}
      {user?.is_admin && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: '#2d6a4f', bgcolor: '#f0fdf4' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Avatar sx={{ bgcolor: '#1b4332' }}>A</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1b4332' }}>
                {fr ? 'Panneau administrateur' : 'Admin Panel'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {fr ? 'Accédez au tableau de bord pour gérer les utilisateurs, articles et transactions.'
                     : 'Access the dashboard to manage users, items, and transactions.'}
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate('/admin/dashboard')}
              sx={{ bgcolor: '#1b4332', '&:hover': { bgcolor: '#2d6a4f' } }}>
              {fr ? 'Tableau de bord' : 'Dashboard'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Footer note */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
          <Box component="img" src="/logo.jpg" alt="Logo" sx={{ height: 36, width: 36, objectFit: 'contain', bgcolor: 'white', borderRadius: '50%', p: 0.3 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            QStock — Scouts Musulmans de Montréal
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {fr ? 'Système de gestion d\'inventaire par QR codes' : 'QR Code Inventory Management System'}
        </Typography>
      </Box>

    </Box>
  );
};

export default Home;