import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Assessment,
  Download,
  PictureAsPdf,
  TableChart,
  CalendarMonth,
  TrendingUp,
  Inventory,
  People,
  Assignment,
  Add,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useLanguage } from '../../context/LanguageContext';


interface Report {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: 'users' | 'items' | 'transactions' | 'analytics';
  formats: string[];
}

// Report list is built inside the component so it can use the language context

const Reports: React.FC = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const reports: Report[] = [
    {
      id: 'user_activity',
      name: fr ? "Rapport d'activité utilisateurs" : 'User Activity Report',
      description: fr ? "Activité détaillée d'emprunt et de retour" : 'Detailed user borrowing and return activity',
      icon: <People />, type: 'users', formats: ['PDF', 'Excel', 'CSV'],
    },
    {
      id: 'inventory_status',
      name: fr ? "Rapport d'état de l'inventaire" : 'Inventory Status Report',
      description: fr ? "État actuel de tous les articles" : 'Current status of all inventory items',
      icon: <Inventory />, type: 'items', formats: ['PDF', 'Excel', 'CSV'],
    },
    {
      id: 'transaction_history',
      name: fr ? 'Historique des transactions' : 'Transaction History',
      description: fr ? 'Historique complet des transactions' : 'Complete transaction history with details',
      icon: <Assignment />, type: 'transactions', formats: ['PDF', 'Excel', 'CSV'],
    },
    {
      id: 'overdue_items',
      name: fr ? 'Rapport articles en retard' : 'Overdue Items Report',
      description: fr ? 'Liste de tous les emprunts en retard' : 'List of all overdue borrows',
      icon: <CalendarMonth />, type: 'transactions', formats: ['PDF', 'Excel'],
    },
    {
      id: 'usage_analytics',
      name: fr ? "Analyse d'utilisation" : 'Usage Analytics',
      description: fr ? "Tendances et aperçus de l'utilisation" : 'Trends and insights on item usage',
      icon: <TrendingUp />, type: 'analytics', formats: ['PDF', 'Excel'],
    },
    {
      id: 'popular_items',
      name: fr ? 'Rapport articles populaires' : 'Popular Items Report',
      description: fr ? 'Articles les plus fréquemment empruntés' : 'Most frequently borrowed items',
      icon: <Assessment />, type: 'analytics', formats: ['PDF', 'Excel', 'CSV'],
    },
  ];

  const [selectedReport, setSelectedReport] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [format, setFormat] = useState<string>('PDF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      setError(fr ? 'Veuillez sélectionner un type de rapport' : 'Please select a report type');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Build query parameters
      const params = new URLSearchParams({
        report_type: selectedReport,
        format: format.toLowerCase(),
        ...(startDate && { start_date: startDate.toISOString().split('T')[0] }),
        ...(endDate && { end_date: endDate.toISOString().split('T')[0] }),
      });

      const response = await fetch(
        `/api/reports/generate?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(fr ? 'Échec de la génération du rapport' : 'Failed to generate report');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(fr ? 'Rapport généré et téléchargé avec succès !' : 'Report generated and downloaded successfully!');
    } catch (err: any) {
      setError(err.message || (fr ? 'Échec de la génération du rapport' : 'Failed to generate report'));
    } finally {
      setLoading(false);
    }
  };

  const selectedReportDetails = reports.find(r => r.id === selectedReport);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        {fr ? 'Rapports & Analytiques' : 'Reports & Analytics'}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Report Selection */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {fr ? 'Sélectionner un rapport' : 'Select Report'}
              </Typography>

              <List>
                {reports.map((report) => (
                  <ListItem
                    key={report.id}
                    button
                    selected={selectedReport === report.id}
                    onClick={() => setSelectedReport(report.id)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      border: 1,
                      borderColor: selectedReport === report.id ? 'primary.main' : 'divider',
                    }}
                  >
                    <ListItemIcon sx={{ color: selectedReport === report.id ? 'primary.main' : 'action.active' }}>
                      {report.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={report.name}
                      secondary={report.description}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {report.formats.map((fmt) => (
                        <Chip key={fmt} label={fmt} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Report Configuration */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {fr ? 'Options du rapport' : 'Report Options'}
              </Typography>

              {selectedReportDetails ? (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {selectedReportDetails.description}
                  </Alert>

                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box sx={{ mb: 2 }}>
                      <DatePicker
                        {...(fr ? {label:"Date de début"} : {label:"Start Date"})}
                        value={startDate}
                        onChange={(date) => setStartDate(date)}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <DatePicker
                        {...(fr ? {label:"Date de fin"} : {label:"End Date"})}
                        value={endDate}
                        onChange={(date) => setEndDate(date)}
                        slotProps={{ textField: { fullWidth: true } }}
                        minDate={startDate || undefined}
                      />
                    </Box>
                  </LocalizationProvider>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Format</InputLabel>
                    <Select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      label={fr ? "Format" : "Format"}
                    >
                      {selectedReportDetails.formats.map((fmt) => (
                        <MenuItem key={fmt} value={fmt}>
                          {fmt}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleGenerateReport}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Download />}
                  >
                    {loading ? (fr ? 'Génération...' : 'Generating...') : (fr ? 'Générer le rapport' : 'Generate Report')}
                  </Button>
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {fr ? 'Sélectionnez un type de rapport pour configurer les options' : 'Select a report type to configure options'}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* {fr ? 'Statistiques rapides' : 'Quick Stats'} */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {fr ? 'Statistiques rapides' : 'Quick Stats'}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {fr ? 'Plage de dates' : 'Date Range'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {startDate && endDate
                        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                        : 0}
                    </Typography>
                    <Typography variant="caption">{fr ? 'Jours' : 'Days'}</Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Format
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {format}
                    </Typography>
                    <Typography variant="caption">{fr ? 'Sélectionné' : 'Selected'}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* {fr ? 'Rapports planifiés' : 'Scheduled Reports'} */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {fr ? 'Rapports planifiés' : 'Scheduled Reports'}
                </Typography>
                <Button variant="outlined" size="small" startIcon={<Add />}>
                  {fr ? 'Planifier un rapport' : 'Schedule Report'}
                </Button>
              </Box>

              <Alert severity="info">
                {fr ? 'Aucun rapport planifié. Cliquez sur "Planifier un rapport" pour configurer la génération automatique.' : 'No scheduled reports configured. Click "Schedule Report" to set up automatic report generation.'}
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
