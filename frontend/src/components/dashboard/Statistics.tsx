import React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Avatar,
  LinearProgress, Chip, useTheme,
} from '@mui/material';
import {
  People, Inventory, Assignment, TrendingUp,
  Warning, CheckCircle, Schedule, HelpOutline,
} from '@mui/icons-material';
import { useLanguage } from '../../context/LanguageContext';

interface StatisticsProps {
  data: {
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
  };
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  subtitle?: string;
  progress?: { value: number; max: number };
  progressLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, progress, progressLabel }) => {
  const theme = useTheme();
  const colorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
  };
  const pct = progress ? Math.min((progress.value / progress.max) * 100, 100) : 0;

  return (
    <Card elevation={2} sx={{ height: '100%', transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[8] } }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{ bgcolor: colorMap[color], width: 56, height: 56, mr: 2 }}>{icon}</Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>{value.toLocaleString()}</Typography>
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{subtitle}</Typography>
        )}
        {progress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">{progressLabel}</Typography>
              <Typography variant="caption" color="text.secondary">{pct.toFixed(0)}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={pct} sx={{
              height: 6, borderRadius: 3,
              bgcolor: `${colorMap[color]}20`,
              '& .MuiLinearProgress-bar': { bgcolor: colorMap[color] },
            }} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const Statistics: React.FC<StatisticsProps> = ({ data }) => {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const {
    total_users = 0, active_users = 0,
    total_items = 0, available_items = 0, borrowed_items = 0,
    maintenance_items = 0, total_transactions = 0,
    active_borrows = 0, overdue_borrows = 0,
    total_returns = 0, pending_requests = 0, total_reviews = 0,
  } = data;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        {fr ? 'Statistiques générales' : 'Overview Statistics'}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title={fr ? 'Total utilisateurs' : 'Total Users'}
            value={total_users} icon={<People />} color="primary"
            subtitle={fr ? `${active_users} utilisateurs actifs` : `${active_users} active users`}
            progress={{ value: active_users, max: total_users || 1 }}
            progressLabel={fr ? 'Utilisation' : 'Utilization'}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title={fr ? 'Total articles' : 'Total Items'}
            value={total_items} icon={<Inventory />} color="secondary"
            subtitle={fr ? `${available_items} disponibles` : `${available_items} available`}
            progress={{ value: available_items, max: total_items || 1 }}
            progressLabel={fr ? 'Utilisation' : 'Utilization'}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title={fr ? 'Emprunts actifs' : 'Active Borrows'}
            value={active_borrows} icon={<Assignment />} color="info"
            subtitle={fr ? `${borrowed_items} articles empruntés` : `${borrowed_items} items borrowed`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title={fr ? 'Articles en retard' : 'Overdue Items'}
            value={overdue_borrows} icon={<Warning />} color="error"
            subtitle={overdue_borrows > 0
              ? (fr ? 'Attention requise' : 'Requires attention')
              : (fr ? 'Tout va bien !' : 'All good!')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title={fr ? 'Total transactions' : 'Total Transactions'}
            value={total_transactions} icon={<TrendingUp />} color="success"
            subtitle={fr ? `${total_returns} retours complétés` : `${total_returns} returns completed`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title={fr ? 'Demandes en attente' : 'Pending Requests'}
            value={pending_requests} icon={<HelpOutline />} color="warning"
            subtitle={pending_requests > 0
              ? (fr ? 'Action requise' : 'Action required')
              : (fr ? 'Aucune demande en attente' : 'No pending requests')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title={fr ? 'Maintenance' : 'Maintenance'}
            value={maintenance_items} icon={<Schedule />} color="warning"
            subtitle={fr ? 'Articles en maintenance' : 'Items under maintenance'}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title={fr ? 'Total avis' : 'Total Reviews'}
            value={total_reviews} icon={<CheckCircle />} color="success"
            subtitle={fr ? 'Retours utilisateurs collectés' : 'User feedback collected'}
          />
        </Grid>
      </Grid>

      {/* Quick Insights */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
          {fr ? 'Aperçu rapide' : 'Quick Insights'}
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              label: fr ? 'Taux de disponibilité' : 'Availability Rate',
              value: total_items > 0 ? ((available_items / total_items) * 100).toFixed(1) : '0.0',
              color: 'success.main',
            },
            {
              label: fr ? "Taux d'utilisation" : 'Utilization Rate',
              value: total_items > 0 ? ((borrowed_items / total_items) * 100).toFixed(1) : '0.0',
              color: 'primary.main',
            },
            {
              label: fr ? 'Taux de retard' : 'Overdue Rate',
              value: active_borrows > 0 ? ((overdue_borrows / active_borrows) * 100).toFixed(1) : '0',
              color: overdue_borrows > 0 ? 'error.main' : 'success.main',
            },
            {
              label: fr ? 'Taux utilisateurs actifs' : 'Active User Rate',
              value: total_users > 0 ? ((active_users / total_users) * 100).toFixed(1) : '0.0',
              color: 'info.main',
            },
          ].map((insight) => (
            <Grid item xs={12} sm={6} md={3} key={insight.label}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    {insight.label}
                  </Typography>
                  <Typography variant="h5" color={insight.color} sx={{ fontWeight: 600 }}>
                    {insight.value}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Attention warning */}
      {(overdue_borrows > 5 || pending_requests > 10 || maintenance_items > 5) && (
        <Box sx={{ mt: 3 }}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ mr: 1 }} />
                {fr ? 'Attention requise' : 'Attention Required'}
              </Typography>
              <Typography variant="body2">
                {overdue_borrows > 5 && `• ${overdue_borrows} ${fr ? 'articles en retard nécessitent un suivi' : 'overdue items need follow-up'}`}
                <br />
                {pending_requests > 10 && `• ${pending_requests} ${fr ? 'demandes en attente de révision' : 'pending requests waiting for review'}`}
                <br />
                {maintenance_items > 5 && `• ${maintenance_items} ${fr ? 'articles en maintenance' : 'items in maintenance'}`}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default Statistics;
